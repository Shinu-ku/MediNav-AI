import { assessTriage } from './services/triage.js';
const result = assessTriage('I have chest pain and trouble breathing');
if (!result.emergency) throw new Error('Emergency triage failed');
console.log('Triage smoke test passed');
