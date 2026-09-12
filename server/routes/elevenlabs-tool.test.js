import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createServer } from 'node:http';

// This is a test-only value; no configured credential is read or printed.
process.env.ELEVENLABS_TOOL_SECRET = 'test-tool-secret';
process.env.GOOGLE_MAPS_API_KEY = '';
process.env.MONGODB_URI = '';
const { default: api } = await import('./api.js');

const app = express();
app.use(express.json());
app.use('/api', api);
const server = createServer(app);
let baseUrl;

before(async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api/elevenlabs/tool`;
});

after(async () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));

async function call(body, authorization = 'Bearer test-tool-secret') {
  const response = await fetch(baseUrl, { method: 'POST', headers: { 'content-type': 'application/json', ...(authorization ? { authorization } : {}) }, body: JSON.stringify(body) });
  return { status: response.status, body: await response.json() };
}

test('accepts authenticated English triage', async () => {
  const response = await call({ tool_name: 'assess_triage', parameters: { message: 'I have a high fever', language: 'en' } });
  assert.equal(response.status, 200);
  assert.equal(response.body.result.triage.level, 'URGENT');
  assert.equal(response.body.result.triage.language, 'en');
});

test('accepts authenticated Hindi emergency triage', async () => {
  const response = await call({ tool_name: 'assess_triage', parameters: { message: 'मुझे सीने में बहुत तेज दर्द है और सांस लेने में दिक्कत हो रही है।', language: 'hi' } });
  assert.equal(response.status, 200);
  assert.equal(response.body.result.triage.level, 'EMERGENCY');
  assert.equal(response.body.result.triage.language, 'hi');
  assert.equal(response.body.result.triage.title, 'तुरंत आपातकालीन सहायता लें');
});

test('accepts authenticated Hinglish emergency triage', async () => {
  const response = await call({ tool_name: 'assess_triage', parameters: { message: 'Mere chest mein bahut severe pain hai aur breathing mein problem ho rahi hai.', language: 'hinglish' } });
  assert.equal(response.status, 200);
  assert.equal(response.body.result.triage.level, 'EMERGENCY');
  assert.equal(response.body.result.triage.language, 'hinglish');
});

test('rejects an unauthenticated tool call', async () => {
  const response = await call({ tool_name: 'assess_triage', parameters: { message: 'headache' } }, '');
  assert.equal(response.status, 401);
  assert.equal(response.body.message, 'Unauthorized.');
});

test('rejects an invalid tool secret', async () => {
  const response = await call({ tool_name: 'assess_triage', parameters: { message: 'headache' } }, 'Bearer incorrect-secret');
  assert.equal(response.status, 401);
  assert.equal(response.body.message, 'Unauthorized.');
});

test('returns localized facility guidance without changing facility source fields', async () => {
  const response = await call({ tool_name: 'find_facilities', parameters: { lat: 28.6139, lng: 77.209, type: 'hospital', language: 'hi' } });
  assert.equal(response.status, 200);
  assert.equal(response.body.result.language, 'hi');
  assert.ok(Array.isArray(response.body.result.facilities));
  assert.match(response.body.result.guidance, /आस-पास/);
});

test('creates a Hindi navigation summary', async () => {
  const response = await call({ tool_name: 'create_handoff', parameters: { message: 'मुझे बुखार है', profile: { name: 'रीना', medications: ['दवा'] }, triage: { level: 'URGENT' }, language: 'hi' } });
  assert.equal(response.status, 200);
  assert.equal(response.body.result.language, 'hi');
  assert.match(response.body.result.summaryText, /मुख्य चिंता/);
  assert.equal(response.body.result.nextAction, 'तत्काल क्लिनिक या अस्पताल');
});
