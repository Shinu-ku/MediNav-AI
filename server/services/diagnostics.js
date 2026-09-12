/** Report configuration only; never expose secret values to callers. */
export function integrationReadiness() {
  const configured = (name) => Boolean(process.env[name]);
  const services = {
    gemini: { configured: configured('GEMINI_API_KEY'), detail: configured('GEMINI_API_KEY') ? `Model: ${process.env.GEMINI_MODEL || 'gemini-3.6-flash'}` : 'Set GEMINI_API_KEY for AI chat and vision.' },
    maps: { configured: configured('GOOGLE_MAPS_API_KEY'), detail: configured('GOOGLE_MAPS_API_KEY') ? 'Places API (New) server key detected.' : 'Demo facilities are active.' },
    elevenLabs: { configured: configured('ELEVENLABS_API_KEY') && configured('ELEVENLABS_VOICE_ID'), detail: configured('ELEVENLABS_API_KEY') ? (configured('ELEVENLABS_VOICE_ID') ? 'Text-to-speech is configured.' : 'Set ELEVENLABS_VOICE_ID to enable text-to-speech.') : 'Browser read-aloud remains available.' },
    elevenLabsAgent: { configured: configured('ELEVENLABS_AGENT_ID'), detail: configured('ELEVENLABS_AGENT_ID') ? 'Agent ID detected; configure its webhook tools using the README.' : 'Optional: set ELEVENLABS_AGENT_ID for Conversational AI.' },
    mongo: { configured: configured('MONGODB_URI'), detail: configured('MONGODB_URI') ? 'Persistence connection is configured.' : 'Session-only demo mode is active.' }
  };
  return { ready: Object.values(services).filter((service) => service.configured).length, total: Object.keys(services).length, services };
}
