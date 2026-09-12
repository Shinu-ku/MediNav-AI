import { extractConcern } from './triage.js';
import { summaryLabels } from './language.js';

export function buildSummary({ message = '', profile = {}, triage = {}, language = 'en' } = {}) {
  const labels = summaryLabels(language);
  const concern = extractConcern(message);
  const urgency = triage.level || 'ROUTINE';
  const nextAction = triage.nextAction || (urgency === 'EMERGENCY' ? { en: 'Emergency evaluation', hi: 'आपातकालीन जांच', hinglish: 'Emergency evaluation' }[language] : urgency === 'URGENT' ? { en: 'Urgent clinic or hospital', hi: 'तत्काल क्लिनिक या अस्पताल', hinglish: 'Urgent clinic ya hospital' }[language] : { en: 'Continue conversation', hi: 'बातचीत जारी रखें', hinglish: 'Conversation continue karein' }[language]);
  const patient = profile.name || { en: 'Not provided', hi: 'उपलब्ध नहीं', hinglish: 'Not provided' }[language];
  const medications = profile.medications || [];
  const noMedications = { en: 'Not provided', hi: 'उपलब्ध नहीं', hinglish: 'Not provided' }[language];
  return {
    concern,
    urgency,
    nextAction,
    patient,
    medications,
    safetyNote: labels.safetyNote,
    language,
    labels: { concern: labels.concern, urgency: labels.urgency, nextAction: labels.nextAction, patient: labels.patient, medications: labels.medications },
    summaryText: `${labels.concern}: ${concern}\n${labels.urgency}: ${urgency}\n${labels.nextAction}: ${nextAction}\n${labels.patient}: ${patient}\n${labels.medications}: ${medications.join(', ') || noMedications}\n${labels.safetyNote}`
  };
}
