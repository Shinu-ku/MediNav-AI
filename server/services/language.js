const SUPPORTED_LANGUAGES = new Set(['en', 'hi', 'hinglish']);

const copy = {
  en: {
    EMERGENCY: { badge: 'Act now', title: 'Seek emergency help now', guidance: 'Call 112 or your local emergency number now, or go to the nearest emergency department. Do not drive yourself if you feel faint or severely unwell.', nextAction: 'Emergency evaluation' },
    URGENT: { badge: 'Same-day care', title: 'Arrange urgent medical assessment today', guidance: 'Please seek same-day care. If symptoms become severe, new, or rapidly worse, call emergency services.', nextAction: 'Urgent clinic or hospital' },
    ROUTINE: { badge: 'Care navigation', title: 'Continue a guided check-in', guidance: 'MediNav can help organize your concern and find an appropriate care option. It cannot diagnose a condition.', nextAction: 'Continue conversation' },
    facilities: 'Here are nearby care options. Confirm availability directly with the facility.'
  },
  hi: {
    EMERGENCY: { badge: 'अभी कार्रवाई करें', title: 'तुरंत आपातकालीन सहायता लें', guidance: 'अभी 112 या अपने स्थानीय आपातकालीन नंबर पर कॉल करें, या निकटतम आपातकालीन विभाग जाएं। यदि चक्कर आ रहा हो या बहुत अस्वस्थ महसूस हो, तो स्वयं गाड़ी न चलाएं।', nextAction: 'आपातकालीन जांच' },
    URGENT: { badge: 'आज ही देखभाल', title: 'आज ही तुरंत चिकित्सा जांच कराएं', guidance: 'कृपया आज ही चिकित्सा सहायता लें। लक्षण गंभीर, नए या तेजी से बिगड़ें तो आपातकालीन सेवाओं को कॉल करें।', nextAction: 'तत्काल क्लिनिक या अस्पताल' },
    ROUTINE: { badge: 'देखभाल मार्गदर्शन', title: 'निर्देशित जांच जारी रखें', guidance: 'MediNav आपकी चिंता को व्यवस्थित करने और सही देखभाल विकल्प खोजने में मदद कर सकता है। यह निदान नहीं कर सकता।', nextAction: 'बातचीत जारी रखें' },
    facilities: 'ये आस-पास के देखभाल विकल्प हैं। उपलब्धता की पुष्टि सीधे सुविधा से करें।'
  },
  hinglish: {
    EMERGENCY: { badge: 'Abhi action lein', title: 'Turant emergency help lein', guidance: 'Abhi 112 ya apne local emergency number par call karein, ya nearest emergency department jayen. Agar chakkar aa raha ho ya bahut unwell feel ho, khud drive na karein.', nextAction: 'Emergency evaluation' },
    URGENT: { badge: 'Aaj hi care', title: 'Aaj hi urgent medical assessment karayein', guidance: 'Please aaj hi medical care lein. Symptoms severe, naye, ya jaldi worse hon to emergency services ko call karein.', nextAction: 'Urgent clinic ya hospital' },
    ROUTINE: { badge: 'Care navigation', title: 'Guided check-in continue karein', guidance: 'MediNav aapki concern ko organize karne aur sahi care option dhoondhne mein help kar sakta hai. Yeh diagnosis nahi karta.', nextAction: 'Conversation continue karein' },
    facilities: 'Yeh nearby care options hain. Availability facility se directly confirm karein.'
  }
};

export function resolveLanguage(language) {
  if (language === undefined || language === null || language === '') return 'en';
  return SUPPORTED_LANGUAGES.has(language) ? language : null;
}

export function localizeTriage(triage, language = 'en') {
  return { ...triage, ...copy[language][triage.level], language };
}

export function facilityGuidance(language = 'en') {
  return copy[language].facilities;
}

export function summaryLabels(language = 'en') {
  const labels = {
    en: { concern: 'Concern', urgency: 'Urgency', nextAction: 'Next action', patient: 'Patient', medications: 'Medications', safetyNote: 'This is a care-navigation summary, not a diagnosis.' },
    hi: { concern: 'मुख्य चिंता', urgency: 'तत्कालता', nextAction: 'अगला कदम', patient: 'रोगी', medications: 'दवाइयां', safetyNote: 'यह देखभाल-मार्गदर्शन सारांश है, निदान नहीं।' },
    hinglish: { concern: 'Main concern', urgency: 'Urgency', nextAction: 'Next action', patient: 'Patient', medications: 'Medicines', safetyNote: 'Yeh care-navigation summary hai, diagnosis nahi.' }
  };
  return labels[language];
}
