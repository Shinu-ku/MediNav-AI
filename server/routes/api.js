import { Router } from 'express';
import multer from 'multer';
import { assessTriage, extractConcern } from '../services/triage.js';
import { askGemini, localReply } from '../services/gemini.js';
import { findFacilities } from '../services/maps.js';
import { Conversation } from '../models/Conversation.js';
import { Patient } from '../models/Patient.js';
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 7 * 1024 * 1024 } });
const router = Router();
const bookings = [];

router.get('/health', (_req, res) => res.json({ ok: true, integrations: { gemini: Boolean(process.env.GEMINI_API_KEY), maps: Boolean(process.env.GOOGLE_MAPS_API_KEY), elevenLabs: Boolean(process.env.ELEVENLABS_API_KEY), mongo: Boolean(process.env.MONGODB_URI) } }));
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
router.get('/facilities', async (req, res) => res.json({ facilities: await findFacilities(req.query) }));
router.post('/appointments', (req, res) => { const booking = { id: `MN-${Date.now().toString().slice(-6)}`, status: 'Requested — demo booking', ...req.body, createdAt: new Date().toISOString() }; bookings.push(booking); res.status(201).json(booking); });
router.post('/profile', async (req, res) => { if (!process.env.MONGODB_URI) return res.json({ ...req.body, saved: false, mode: 'session only' }); const patient = await Patient.findByIdAndUpdate(req.body.id, req.body, { upsert: true, new: true }); res.json({ ...patient.toObject(), saved: true }); });
router.post('/handoff', (req, res) => { const { profile = {}, summary = {} } = req.body; const text = `MEDINAV PATIENT HANDOFF\nPatient: ${profile.name || 'Not provided'}\nConcern: ${summary.concern || 'Not captured'}\nUrgency: ${summary.urgency || 'Not assessed'}\nNext action: ${summary.nextAction || 'Continue assessment'}\nMedications: ${(profile.medications || []).join(', ') || 'Not provided'}\nEmergency contact: ${profile.emergencyContact?.name || 'Not provided'}\n\nMediNav is navigation support only, not a diagnosis.`; res.json({ text }); });
router.post('/voice', async (req, res) => { if (!process.env.ELEVENLABS_API_KEY || !process.env.ELEVENLABS_VOICE_ID) return res.status(503).json({ message: 'ElevenLabs voice is not configured. Browser read-aloud remains available.' }); const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}`, { method: 'POST', headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'content-type': 'application/json', accept: 'audio/mpeg' }, body: JSON.stringify({ text: req.body.text, model_id: 'eleven_multilingual_v2' }) }); if (!response.ok) return res.status(502).json({ message: 'Voice generation failed.' }); res.set('content-type', 'audio/mpeg'); res.send(Buffer.from(await response.arrayBuffer())); });
export default router;
