const systemInstruction = `You are MediNav, a calm healthcare navigation assistant for India. You are not a doctor and must not diagnose, prescribe, or claim certainty. Reply in the user's language (English, Hindi, or Hinglish). Give concise, practical navigation guidance, ask at most two relevant follow-up questions, and state a safety boundary. If the supplied deterministic triage says EMERGENCY, do not downplay it: tell the user to call 112 or go to emergency care now. Return JSON only with keys reply, duration, followUp, careNote.`;

export async function askGemini({ message, triage, profile, image }) {
  if (!process.env.GEMINI_API_KEY) return null;
  const parts = [{ text: `${systemInstruction}\n\nTRIAGE: ${JSON.stringify(triage)}\nPATIENT CONTEXT: ${JSON.stringify(profile || {})}\nUSER: ${message}` }];
  if (image?.buffer) parts.push({ inline_data: { mime_type: image.mimetype, data: image.buffer.toString('base64') } });
  // Gemini 2.5 Flash remains supported for existing projects, but this key's API
  // response directs new users to 3.6 Flash. Keep the model configurable so a
  // hackathon team can select an allow-listed model without changing source.
  const model = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ contents: [{ role: 'user', parts }], generationConfig: { responseMimeType: 'application/json', temperature: 0.25 } })
  });
  if (!response.ok) throw new Error(`Gemini request failed (${response.status})`);
  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  return JSON.parse(text.replace(/^```json\s*|\s*```$/g, ''));
}

export function localReply({ message, triage }) {
  if (triage.emergency) return { reply: 'This could be serious. Please call 112 now or go to the nearest emergency department. Do not wait for a chat response if symptoms are severe or worsening.', duration: 'Needs urgent assessment', followUp: [], careNote: 'Emergency support activated.' };
  return { reply: `I hear that you're dealing with ${message}. I can help you find the right next step, but I cannot diagnose. When did this start, and is it getting better, worse, or staying the same?`, duration: 'To confirm', followUp: ['When did it start?', 'Has it changed or worsened?'], careNote: triage.guidance };
}
