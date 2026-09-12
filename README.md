# MediNav AI

MediNav is a hackathon healthcare-navigation MVP. It supports safety-first symptom conversations, image context, nearby care, demo bookings, patient context, and shareable handoff summaries. It is not a diagnostic or emergency service.

## Run

1. Copy `.env.example` to `.env` and add available server-side keys.
2. Run `npm install`.
3. Run `npm start`.
4. Visit `http://localhost:3000`.

The app starts in useful demo mode when credentials or MongoDB are absent. Google Places, Gemini vision/chat, MongoDB persistence, and ElevenLabs TTS become live when their variables are present. `GEMINI_MODEL` defaults to `gemini-3.6-flash` because the supplied key's Gemini API no longer accepts Gemini 2.5 Flash for new users; it can be changed to another model enabled for the key.

## Safety

The deterministic triage layer runs before Gemini. It detects prominent emergency phrases and promotes urgent action; generative AI is asked only to organize and communicate care-navigation guidance. It must not diagnose or replace emergency services.

## API and readiness

`GET /api/diagnostics` reports whether each optional integration is configured without returning secret values. `POST /api/triage`, `/api/summary`, and `/api/vision/analyze` provide standalone triage, handoff-summary, and image-context flows. Run `npm test` for deterministic triage coverage and `npm run smoke` for a minimal smoke check.

## ElevenLabs Conversational AI

Create an ElevenLabs agent, set `ELEVENLABS_AGENT_ID`, and add a server webhook tool pointing to `https://YOUR_DOMAIN/api/elevenlabs/tool` (use a tunneled HTTPS URL in development). Set a long, private `ELEVENLABS_TOOL_SECRET` in the server environment and configure the webhook custom header `Authorization: Bearer <that secret>`. The route rejects a missing or incorrect credential with `401`; do not put this value in client code or a public tool definition.

```json
[
  { "name": "assess_triage", "description": "Classify a user's health concern for care navigation.", "parameters": { "type": "object", "properties": { "message": { "type": "string" }, "language": { "type": "string", "enum": ["en", "hi", "hinglish"] } }, "required": ["message"] } },
  { "name": "find_facilities", "description": "Find nearby care facilities.", "parameters": { "type": "object", "properties": { "lat": { "type": "number" }, "lng": { "type": "number" }, "type": { "type": "string" }, "language": { "type": "string", "enum": ["en", "hi", "hinglish"] } }, "required": ["lat", "lng"] } },
  { "name": "create_handoff", "description": "Create a concise care-navigation handoff summary.", "parameters": { "type": "object", "properties": { "message": { "type": "string" }, "profile": { "type": "object" }, "triage": { "type": "object" }, "language": { "type": "string", "enum": ["en", "hi", "hinglish"] } } } }
]
```

The endpoint accepts the common `tool_name`/`parameters` shape (and retains `name`/`toolName` plus `params` aliases for compatibility). `language` is optional and defaults to `en`; permitted values are `en`, `hi`, and `hinglish`. The exact request shapes are:

```json
{ "tool_name": "assess_triage", "parameters": { "message": "I have chest pain and trouble breathing", "language": "en" } }
{ "tool_name": "find_facilities", "parameters": { "lat": 28.6139, "lng": 77.2090, "type": "hospital", "language": "hi" } }
{ "tool_name": "create_handoff", "parameters": { "message": "High fever", "profile": { "name": "Patient" }, "triage": { "level": "URGENT", "nextAction": "Urgent clinic" }, "language": "hinglish" } }
```

Do not expose this endpoint publicly until it is behind HTTPS and the `Authorization` custom header has been configured in ElevenLabs.
