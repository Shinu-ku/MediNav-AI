const EMERGENCY_PATTERNS = [
  /chest (pain|pressure|tightness|discomfort).*(breath|sweat|faint|dizz|arm|jaw)/i,
  /(trouble|difficulty|unable) (to )?breath/i,
  /(face|arm).*(weak|numb)|speech.*(slur|problem)/i,
  /suicid|kill myself|self.?harm/i,
  /severe bleeding|bleeding.*(won't|will not) stop/i,
  /unconscious|passed out|seizure/i,
  /anaphyla|swelling.*(throat|tongue)/i,
  /(chest|seene).*(severe|bahut).*(pain|dard).*(breath|saans)/i,
  /सीने.*(दर्द|पीड़ा).*(सांस|श्वास)|(सांस|श्वास).*(दिक्कत|परेशानी).*(सीने|छाती).*(दर्द|पीड़ा)/u,
  /(सीने|छाती).*(बहुत तेज|तेज़).*(दर्द|पीड़ा).*(सांस|श्वास)/u
];
const URGENT_PATTERNS = [/high fever/i, /persistent vomiting/i, /dehydrat/i, /severe.*pain/i, /pregnan.*(pain|bleed)/i, /infection.*worsen/i];

export function assessTriage(message = '') {
  const text = message.trim();
  const emergency = EMERGENCY_PATTERNS.some((pattern) => pattern.test(text));
  const urgent = !emergency && URGENT_PATTERNS.some((pattern) => pattern.test(text));
  if (emergency) return {
    level: 'EMERGENCY', badge: 'Act now', emergency: true,
    title: 'Seek emergency help now',
    guidance: 'Call 112 or your local emergency number now, or go to the nearest emergency department. Do not drive yourself if you feel faint or severely unwell.',
    nextAction: 'Emergency evaluation', careType: 'hospital'
  };
  if (urgent) return {
    level: 'URGENT', badge: 'Same-day care', emergency: false,
    title: 'Arrange urgent medical assessment today',
    guidance: 'Please seek same-day care. If symptoms become severe, new, or rapidly worse, call emergency services.',
    nextAction: 'Urgent clinic or hospital', careType: 'hospital'
  };
  return {
    level: 'ROUTINE', badge: 'Care navigation', emergency: false,
    title: 'Continue a guided check-in',
    guidance: 'MediNav can help organize your concern and find an appropriate care option. It cannot diagnose a condition.',
    nextAction: 'Continue conversation', careType: 'clinic'
  };
}

export function extractConcern(message = '') {
  const lower = message.toLowerCase();
  const terms = ['fever', 'headache', 'cough', 'rash', 'pain', 'chest discomfort', 'stomach pain', 'joint pain', 'breathing'];
  return terms.find((term) => lower.includes(term)) || (message.length > 70 ? message.slice(0, 70) : message || 'Not captured');
}
