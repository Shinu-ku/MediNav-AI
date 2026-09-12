import { Conversation } from '@elevenlabs/client';

const $ = (s) => document.querySelector(s);
const messages = $('#messages'); const input = $('#input'); const status = $('#agentStatus');
const languageCode = { English: 'en', 'हिन्दी': 'hi', Hinglish: 'hinglish' };
const agentId = import.meta.env.VITE_ELEVENLABS_AGENT_ID;
if (import.meta.env.DEV) console.info(`ElevenLabs Agent ID loaded: ${agentId ? 'YES' : 'NO'}`);
let conversation; let facilities = []; let location; let lastTypedMessage = ''; let profile = JSON.parse(localStorage.getItem('medinavProfile') || '{"language":"English","medications":[]}'); const renderedMessages = new Set();

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
function toast(text) { const el = $('#toast'); el.textContent = text; el.classList.add('show'); clearTimeout(window.mediNavToast); window.mediNavToast = setTimeout(() => el.classList.remove('show'), 3200); }
function addMessage(text, user = false, id) { if (!text || (id && renderedMessages.has(id))) return; if (id) renderedMessages.add(id); const nearBottom = messages.scrollHeight - messages.scrollTop - messages.clientHeight < 80; const el = document.createElement('div'); el.className = `msg${user ? ' user' : ''}`; el.innerHTML = `<div class="avatar">${user ? 'You' : 'M'}</div><div class="bubble">${escapeHtml(text)}<small>${user ? 'You' : 'MediNav'}</small></div>`; messages.append(el); if (nearBottom) messages.scrollTo({ top: messages.scrollHeight, behavior: 'smooth' }); }
function setStatus(text) { status.textContent = text; }
function selectedLanguage() { return languageCode[profile.language] || 'en'; }
function setLocationStatus(text) { $('#locationStatus').textContent = text; }
function requestLocation() { return new Promise((resolve) => { if (!navigator.geolocation) { setLocationStatus('Location unsupported'); return resolve(null); } setLocationStatus('Finding your location…'); navigator.geolocation.getCurrentPosition((position) => { location = { lat: position.coords.latitude, lng: position.coords.longitude }; setLocationStatus('Current location ready'); conversation?.sendContextualUpdate(`Current location available: latitude ${location.lat}, longitude ${location.lng}. Use these dynamic location values for nearby-care tools.`); resolve(location); }, (error) => { location = null; setLocationStatus(error.code === error.PERMISSION_DENIED ? 'Location permission denied' : 'Location unavailable'); resolve(null); }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }); }); }
function updateStartButton(active) { $('#startBtn').innerHTML = active ? '<i data-lucide="phone-off"></i>End conversation' : '<i data-lucide="mic"></i>Talk to MediNav'; window.lucide?.createIcons(); }

function updateTriage(result) {
  const triage = result.triage || result; if (!triage?.level) return;
  $('#urgency').classList.toggle('high', !!triage.emergency); $('#urgency').classList.toggle('low', triage.level === 'ROUTINE');
  $('#urgencyLabel').textContent = triage.level; $('#urgencyBadge').textContent = triage.badge || triage.level; $('#urgencyTitle').textContent = triage.title || 'Care navigation update'; $('#urgencyText').textContent = triage.guidance || '';
  $('#pathTitle').textContent = triage.nextAction || 'Continue conversation'; $('#pathText').textContent = triage.guidance || '';
  $('#chips').innerHTML = `<span class="chip">Context captured</span><span class="chip">${triage.emergency ? 'Emergency action' : 'Safety checked'}</span><span class="chip">${profile.language}</span>`;
  $('#sumConcern').textContent = result.concern || 'Not captured'; $('#sumUrgency').textContent = triage.level; $('#sumAction').textContent = triage.nextAction || 'Continue conversation'; $('#emergency').classList.toggle('show', !!triage.emergency);
}
function updateFacilities(result) {
  facilities = result.facilities || [];
  [[facilities[0], 'fac1', 'fac1p', 'dist1', 'fac1Actions'], [facilities[1], 'fac2', 'fac2p', 'dist2', 'fac2Actions']].forEach(([facility, name, detail, distance, action]) => {
    if (!facility) return; $(`#${name}`).textContent = facility.name; $(`#${detail}`).textContent = `${facility.type}${facility.address ? ` · ${facility.address}` : ''}${facility.openNow === null ? '' : facility.openNow ? ' · Open now' : ' · Closed'}`; $(`#${distance}`).textContent = facility.distance || 'Distance unavailable';
    const link = $(`#${action}`); link.hidden = false; link.href = facility.mapsUrl; link.target = '_blank'; link.rel = 'noopener'; link.textContent = facility.phone ? `Call ${facility.phone} · Directions` : 'Directions'; link.onclick = facility.phone ? () => { window.location.href = `tel:${facility.phone}`; return false; } : null;
  });
}
function updateHandoff(result) { if (!result) return; $('#sumConcern').textContent = result.concern || 'Not captured'; $('#sumUrgency').textContent = result.urgency || 'Not assessed'; $('#sumAction').textContent = result.nextAction || 'Continue conversation'; }
function handleToolResponse(event) {
  if (!event.full_tool_result) return;
  try { const payload = JSON.parse(event.full_tool_result); const result = payload.result || payload; if (/assess[-_]?triage/.test(event.tool_name)) updateTriage(result); else if (/find[-_]?facilities/.test(event.tool_name)) updateFacilities(result); else if (/create[-_]?handoff/.test(event.tool_name)) updateHandoff(result); } catch { toast('MediNav received a tool result that could not be displayed.'); }
}

async function startConversation(firstMessage) {
  if (conversation) { if (firstMessage) conversation.sendUserMessage(firstMessage); return; }
  if (!agentId) { setStatus('Agent ID missing'); toast('MediNav voice is not configured. Add VITE_ELEVENLABS_AGENT_ID and rebuild.'); return; }
  if (!navigator.mediaDevices?.getUserMedia) { setStatus('Error'); toast('Microphone access is not available in this browser.'); return; }
  try {
    setStatus('Connecting'); await navigator.mediaDevices.getUserMedia({ audio: true });
    conversation = await Conversation.startSession({
      agentId, dynamicVariables: { language: selectedLanguage(), user_name: profile.name || 'Guest', user_latitude: location?.lat ?? '', user_longitude: location?.lng ?? '', location_permission: Boolean(location) },
      onConnect: () => setStatus('Conversation active'), onStatusChange: ({ status: value }) => setStatus(value === 'connecting' ? 'Connecting' : value === 'connected' ? 'Conversation active' : 'Disconnected'),
      onModeChange: ({ mode }) => setStatus(mode === 'speaking' ? 'MediNav is speaking' : mode === 'listening' ? 'Listening' : 'Conversation active'),
      onMessage: ({ message, role, event_id }) => { if (role === 'user' && message === lastTypedMessage) { lastTypedMessage = ''; return; } addMessage(message, role === 'user', event_id); }, onAgentToolResponse: handleToolResponse,
      onDisconnect: () => { conversation = undefined; setStatus('Disconnected'); updateStartButton(false); }, onError: () => { setStatus('Error'); toast('MediNav could not connect. Check the agent configuration and try again.'); }
    });
    updateStartButton(true); if (firstMessage) conversation.sendUserMessage(firstMessage);
  } catch (error) { conversation = undefined; setStatus('Error'); toast(error?.name === 'NotAllowedError' || /permission/i.test(error?.message || '') ? 'Microphone permission was denied. Allow it in browser settings and try again.' : 'Unable to start MediNav. Check the agent ID and network connection.'); }
}
async function endConversation() { if (!conversation) return; try { await conversation.endSession(); } finally { conversation = undefined; setStatus('Disconnected'); updateStartButton(false); } }
async function sendMessage(message = input.value.trim()) { if (!message) return; lastTypedMessage = message; addMessage(message, true, `typed:${message}:${Date.now()}`); if (conversation) conversation.sendUserMessage(message); else await startConversation(message); input.value = ''; }

function openProfile() { const dialog = document.createElement('dialog'); dialog.innerHTML = `<form method="dialog" class="modal" style="max-width:480px"><div class="modal-head"><h2>Patient context</h2><button class="close" aria-label="Close">×</button></div><p>This stays in this browser unless MongoDB is configured.</p><label>Name <input id="pName" value="${escapeHtml(profile.name || '')}"></label><label>Age <input id="pAge" value="${escapeHtml(profile.age || '')}"></label><label>Medications (comma separated) <input id="pMeds" value="${escapeHtml((profile.medications || []).join(', '))}"></label><button class="primary" id="saveProfile">Save context</button></form>`; document.body.append(dialog); dialog.querySelector('#saveProfile').onclick = async (event) => { event.preventDefault(); profile = { ...profile, name: $('#pName').value, age: $('#pAge').value, medications: $('#pMeds').value.split(',').map((v) => v.trim()).filter(Boolean) }; localStorage.setItem('medinavProfile', JSON.stringify(profile)); await fetch('/api/profile', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(profile) }).catch(() => {}); dialog.close(); toast('Patient context saved'); }; dialog.addEventListener('close', () => dialog.remove()); dialog.showModal(); }

$('#startBtn').onclick = async () => { $('#workspace').scrollIntoView({ behavior: 'smooth', block: 'start' }); if (conversation) await endConversation(); else await startConversation(); };
$('#locationBtn').onclick = requestLocation;
$('#emergencyBtn').onclick = async () => { $('#emergency').classList.add('show'); $('#callBtn').focus(); if (location || await requestLocation()) { setLocationStatus('Finding emergency facilities…'); try { const response = await fetch(`/api/facilities?lat=${encodeURIComponent(location.lat)}&lng=${encodeURIComponent(location.lng)}&type=emergency`); const data = await response.json(); if (!response.ok) throw new Error(data.message); updateFacilities(data); const hospital = facilities.find((facility) => facility.phone); if (hospital) { $('#emergency').querySelector('p').textContent = `Call 112 now. A nearby facility with a published phone number is also available: ${hospital.name}.`; } } catch { setLocationStatus('Emergency locations unavailable'); } } };
$('#voiceBtn').onclick = () => $('#startBtn').click(); $('#textBtn').onclick = () => { input.focus(); $('#workspace').scrollIntoView({ behavior: 'smooth', block: 'start' }); };
document.querySelectorAll('[data-concern]').forEach((button) => { button.onclick = async () => { $('#workspace').scrollIntoView({ behavior: 'smooth', block: 'start' }); await sendMessage(button.dataset.concern); }; });
$('#sendBtn').onclick = () => sendMessage(); input.oninput = () => conversation?.sendUserActivity(); input.onkeydown = (event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendMessage(); } };
$('#imageBtn').onclick = () => $('#imageInput').click(); $('#imageInput').onchange = (event) => { if (event.target.files[0]) toast('Image context is not available in the live voice agent yet; send a text or voice concern instead.'); };
$('#readBtn').onclick = () => toast('Live MediNav replies are spoken by the ElevenLabs agent during an active conversation.'); $('#callBtn').onclick = () => { window.location.href = 'tel:112'; }; $('#profileBtn').onclick = openProfile;
$('#routeBtn').onclick = () => facilities[0]?.mapsUrl ? window.open(facilities[0].mapsUrl, '_blank', 'noopener') : toast('Ask MediNav to find nearby facilities first.');
$('#copyBtn').onclick = () => navigator.clipboard?.writeText(`MediNav Patient Summary\nConcern: ${$('#sumConcern').textContent}\nUrgency: ${$('#sumUrgency').textContent}\nNext action: ${$('#sumAction').textContent}`).then(() => toast('Summary copied')).catch(() => toast('Summary ready to copy'));
$('#costBtn').onclick = () => { const dialog = document.createElement('dialog'); dialog.innerHTML = '<div class="modal"><div class="modal-head"><h2>Cost & coverage — demo</h2><button class="close" aria-label="Close">×</button></div><p><strong>Estimated consultation:</strong> ₹300–₹1,200</p><p><strong>Estimated urgent/emergency visit:</strong> varies by hospital and treatment.</p><p>Confirm coverage directly with your insurer and facility before care.</p><button class="primary">Done</button></div>'; document.body.append(dialog); dialog.querySelectorAll('button').forEach((button) => { button.onclick = () => dialog.close(); }); dialog.addEventListener('close', () => dialog.remove()); dialog.showModal(); };
$('#bookingBtn').onclick = async () => { if (!facilities[0]) return toast('Ask MediNav to find a nearby facility first.'); const response = await fetch('/api/appointments', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ facility: facilities[0].name, patient: profile.name || 'Guest', requestedFor: 'Next available appointment' }) }); const booking = await response.json(); toast(`Booking ${booking.id}: ${booking.status}`); };
$('#shareBtn').onclick = async () => { const response = await fetch('/api/handoff', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ profile, summary: { concern: $('#sumConcern').textContent, urgency: $('#sumUrgency').textContent, nextAction: $('#sumAction').textContent } }) }); const { text } = await response.json(); if (navigator.share) navigator.share({ title: 'MediNav patient handoff', text }).catch(() => {}); else navigator.clipboard.writeText(text).then(() => toast('Handoff copied to clipboard')); };
$('#helpBtn').onclick = () => { $('#modal').classList.add('open'); $('#modalTitle').textContent = 'Safety & help'; }; $('#langBtn').onclick = () => $('#modal').classList.add('open'); $('#closeModal').onclick = () => $('#modal').classList.remove('open');
document.querySelectorAll('[data-lang]').forEach((button) => { button.onclick = () => { profile.language = button.dataset.lang; localStorage.setItem('medinavProfile', JSON.stringify(profile)); $('#langBtn').textContent = `${profile.language} ▾`; $('#modal').classList.remove('open'); conversation?.sendContextualUpdate(`The user selected ${selectedLanguage()} as their preferred language. Continue in that language.`); toast(`Language selected: ${profile.language}`); }; });
window.lucide?.createIcons();
