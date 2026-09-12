import { Router } from 'express';
import multer from 'multer';
import { assessTriage, extractConcern } from '../services/triage.js';
import { askGemini, localReply } from '../services/gemini.js';
import { findFacilities } from '../services/maps.js';
import { Conversation } from '../models/Conversation.js';
import { Patient } from '../models/Patient.js';
import { Assessment } from '../models/Assessment.js';
import { Appointment } from '../models/Appointment.js';
import { Handoff } from '../models/Handoff.js';
import { integrationReadiness } from '../services/diagnostics.js';
import { buildSummary } from '../services/summary.js';
import { timingSafeEqual } from 'node:crypto';
import { facilityGuidance, localizeTriage, resolveLanguage } from '../services/language.js';
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 7 * 1024 * 1024 } });
const router = Router();
const bookings = [];

router.get('/health', (_req, res) => res.json({ ok: true, integrations: { gemini: Boolean(process.env.GEMINI_API_KEY), maps: Boolean(process.env.GOOGLE_MAPS_API_KEY), elevenLabs: Boolean(process.env.ELEVENLABS_API_KEY), mongo: Boolean(process.env.MONGODB_URI) } }));
router.get('/diagnostics', (_req, res) => res.json({ ok: true, ...integrationReadiness() }));
router.get('/emergency', (_req, res) => res.json({ number: process.env.EMERGENCY_NUMBER || '112', country: 'IN', note: 'Call your local emergency number now if this is an emergency.' }));
router.post('/chat', upload.single('image'), async (req, res) => {
  const { message = '', profile = '{}' } = req.body;
  const patient = JSON.parse(profile || '{}'); const triage = assessTriage(message);
  let ai; try { ai = await askGemini({ message, triage, profile: patient, image: req.file }); } catch (error) { console.warn(error.message); }
  const answer = ai || localReply({ message, triage });
  const payload = { ...answer, triage, concern: extractConcern(message), imageReviewed: Boolean(req.file), disclaimer: 'MediNav provides navigation support, not a medical diagnosis.' };
  if (process.env.MONGODB_URI) Conversation.create({ patientId: patient.id, message, reply: payload.reply, triage }).catch(() => {});
  res.json(payload);
});
router.post('/triage', async (req, res) => {
  const { message = '', patientId } = req.body;
  if (!String(message).trim()) return res.status(400).json({ message: 'message is required.' });
  const triage = assessTriage(message);
  const payload = { triage, concern: extractConcern(message), disclaimer: 'MediNav provides navigation support, not a medical diagnosis.' };
  if (process.env.MONGODB_URI) Assessment.create({ patientId, concern: payload.concern, triage }).catch(() => {});
  res.json(payload);
});
router.post('/summary', (req, res) => {
  const { message = '', profile = {}, triage = assessTriage(message) } = req.body;
  res.json(buildSummary({ message, profile, triage }));
});
router.post('/vision/analyze', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'An image file is required.' });
  const message = req.body.message || 'Please describe this image in care-navigation terms.';
  const triage = assessTriage(message);
  let analysis;
  try { analysis = await askGemini({ message, triage, profile: {}, image: req.file }); } catch (error) { console.warn(error.message); }
  const answer = analysis || localReply({ message: 'the image you shared', triage });
  res.json({ ...answer, triage, imageReviewed: true, disclaimer: 'Image context cannot diagnose a condition. Seek clinical assessment for concerns.' });
});
router.get('/facilities', async (req, res) => { try { res.json({ facilities: await findFacilities(req.query) }); } catch (error) { res.status(503).json({ message: error.message, facilities: [] }); } });
router.post('/appointments', (req, res) => { const booking = { id: `MN-${Date.now().toString().slice(-6)}`, status: 'Requested — demo booking', ...req.body, createdAt: new Date().toISOString() }; bookings.push(booking); if (process.env.MONGODB_URI) Appointment.create({ patientId: req.body.patientId, facility: req.body.facility, requestedFor: req.body.requestedFor, contact: req.body.contact, details: req.body }).catch(() => {}); res.status(201).json(booking); });
router.post('/profile', async (req, res) => { if (!process.env.MONGODB_URI) return res.json({ ...req.body, saved: false, mode: 'session only' }); const patient = await Patient.findByIdAndUpdate(req.body.id, req.body, { upsert: true, new: true }); res.json({ ...patient.toObject(), saved: true }); });
router.post('/handoff', (req, res) => { const { profile = {}, summary = {} } = req.body; const text = `MEDINAV PATIENT HANDOFF\nPatient: ${profile.name || 'Not provided'}\nConcern: ${summary.concern || 'Not captured'}\nUrgency: ${summary.urgency || 'Not assessed'}\nNext action: ${summary.nextAction || 'Continue assessment'}\nMedications: ${(profile.medications || []).join(', ') || 'Not provided'}\nEmergency contact: ${profile.emergencyContact?.name || 'Not provided'}\n\nMediNav is navigation support only, not a diagnosis.`; if (process.env.MONGODB_URI) Handoff.create({ patientId: profile.id, summary, text }).catch(() => {}); res.json({ text }); });
function authenticateElevenLabsTool(req, res, next) {
  const authorization = req.get('authorization') || '';
  const suppliedSecret = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  const expectedSecret = process.env.ELEVENLABS_TOOL_SECRET || '';
  const supplied = Buffer.from(suppliedSecret);
  const expected = Buffer.from(expectedSecret);
  if (!expected.length || supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return res.status(401).json({ message: 'Unauthorized.' });
  next();
}

function validateToolLanguage(params, res) {
  const language = resolveLanguage(params.language);
  if (!language) {
    res.status(400).json({ message: 'language must be one of: en, hi, hinglish.' });
    return null;
  }
  return language;
}

function triageToolResult(params, language) {
  const triage = localizeTriage(assessTriage(params.message || ''), language);
  return { result: { triage, concern: extractConcern(params.message || '') } };
}

async function facilitiesToolResult(params, language) {
  try { return { result: { facilities: await findFacilities(params), guidance: facilityGuidance(language), language } }; }
  catch (error) { return { result: { facilities: [], guidance: facilityGuidance(language), language, error: error.message } }; }
}

function handoffToolResult(params, language) {
  return { result: buildSummary({ message: params.message, profile: params.profile, triage: params.triage, language }) };
}

router.post('/elevenlabs/tool', authenticateElevenLabsTool, async (req, res) => {
  const tool = req.body.tool_name || req.body.name || req.body.toolName;
  const params = req.body.parameters || req.body.params || req.body;
  const language = validateToolLanguage(params, res);
  if (!language) return;
  if (tool === 'assess_triage') {
    return res.json(triageToolResult(params, language));
  }
  if (tool === 'find_facilities') return res.json(await facilitiesToolResult(params, language));
  if (tool === 'create_handoff') return res.json(handoffToolResult(params, language));
  return res.status(400).json({ message: 'Unsupported tool. Use assess_triage, find_facilities, or create_handoff.' });
});
router.post('/elevenlabs/tool/assess-triage', authenticateElevenLabsTool, (req, res) => {
  const language = validateToolLanguage(req.body, res);
  if (!language) return;
  res.json(triageToolResult(req.body, language));
});
router.post('/elevenlabs/tool/find-facilities', authenticateElevenLabsTool, async (req, res) => {
  const language = validateToolLanguage(req.body, res);
  if (!language) return;
  res.json(await facilitiesToolResult(req.body, language));
});
router.post('/elevenlabs/tool/create-handoff', authenticateElevenLabsTool, (req, res) => {
  const language = validateToolLanguage(req.body, res);
  if (!language) return;
  res.json(handoffToolResult(req.body, language));
});
router.post('/voice', async (req, res) => { if (!process.env.ELEVENLABS_API_KEY || !process.env.ELEVENLABS_VOICE_ID) return res.status(503).json({ message: 'ElevenLabs voice is not configured. Browser read-aloud remains available.' }); const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}`, { method: 'POST', headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'content-type': 'application/json', accept: 'audio/mpeg' }, body: JSON.stringify({ text: req.body.text, model_id: 'eleven_multilingual_v2' }) }); if (!response.ok) return res.status(502).json({ message: 'Voice generation failed.' }); res.set('content-type', 'audio/mpeg'); res.send(Buffer.from(await response.arrayBuffer())); });
export default router;
