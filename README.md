# MediNav AI

MediNav is a hackathon healthcare-navigation MVP. It supports safety-first symptom conversations, image context, nearby care, demo bookings, patient context, and shareable handoff summaries. It is not a diagnostic or emergency service.

## Run

1. Copy `.env.example` to `.env` and add available server-side keys.
2. Run `npm install`.
3. Run `npm start`.
4. Visit `http://localhost:3000`.

The app starts in useful demo mode when credentials or MongoDB are absent. Google Places, Gemini vision/chat, MongoDB persistence, and ElevenLabs TTS become live when their variables are present.

## Safety

The deterministic triage layer runs before Gemini. It detects prominent emergency phrases and promotes urgent action; generative AI is asked only to organize and communicate care-navigation guidance. It must not diagnose or replace emergency services.
