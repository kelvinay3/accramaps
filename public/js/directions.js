import { api } from './api.js';
import { store } from './state.js';
import { esc, fmtKm, fmtDist } from './util.js';
import { drawRoute, clearRoute } from './map.js';
import { showInfo, hideInfo, collapseBS } from './ui.js';
import { geocodeText } from './search.js';
import { startGPS } from './gps.js';

export function setMode(id, mode) {
  document.querySelectorAll('.dmode').forEach((b) => b.classList.remove('active'));
  document.getElementById('dm-' + id).classList.add('active');
  store.travelMode = mode;
}

export function useMyLocation() {
  if (store.userLL) {
    store.selFrom = { ...store.userLL, name: 'My Location' };
    document.getElementById('fromInput').value = '📍 My Location';
    showInfo('✓ Location set', 'Using your GPS position as start', 'ok');
  } else {
    showInfo('No GPS yet', 'Tap Locate Me first, then try again', 'err');
    startGPS();
  }
}

function restoreGoBtn() {
  const b = document.getElementById('goBtn');
  b.disabled = false;
  b.innerHTML = '<svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="m3 11 19-9-9 19-2-8-8-2z"/></svg> Go';
}

export async function startNav() {
  // Sync mobile inputs → desktop fields
  const mfRaw = document.getElementById('mFromInput').value.trim();
  const mtRaw = document.getElementById('mToInput').value.trim();
  if (mfRaw && !document.getElementById('fromInput').value.trim()) document.getElementById('fromInput').value = mfRaw;
  if (mtRaw && !document.getElementById('toInput').value.trim()) document.getElementById('toInput').value = mtRaw;

  const fromTxt = document.getElementById('fromInput').value.trim();
  const toTxt = document.getElementById('toInput').value.trim();

  if (!toTxt && !store.selTo) {
    showInfo('Where are you going?', 'Type a destination in the "To" field', 'err');
    document.getElementById('toInput').focus();
    return;
  }

  if (!fromTxt && !store.selFrom) {
    if (store.userLL) {
      store.selFrom = { ...store.userLL, name: 'My Location' };
      document.getElementById('fromInput').value = '📍 My Location';
    } else {
      showInfo('Where are you starting?', 'Enter a start point or tap "My location"', 'err');
      document.getElementById('fromInput').focus();
      return;
    }
  }

  const goBtn = document.getElementById('goBtn');
  goBtn.disabled = true;
  goBtn.textContent = '⌛ Routing…';
  showInfo('Finding route…', 'Calculating the best way to get there');

  const from = store.selFrom ?? await geocodeText(fromTxt);
  if (!from) {
    restoreGoBtn();
    showInfo('Start not found', `"${fromTxt}" — try a more specific Ghana address`, 'err');
    return;
  }
  const to = store.selTo ?? await geocodeText(toTxt);
  if (!to) {
    restoreGoBtn();
    showInfo('Destination not found', `"${toTxt}" — try a more specific Ghana address`, 'err');
    return;
  }
  store.selFrom = from;
  store.selTo = to;

  try {
    const route = await api.get(
      `/api/directions?from=${from.lat},${from.lng}&to=${to.lat},${to.lng}&mode=${store.travelMode}`
    );
    restoreGoBtn();
    renderRoute(from, to, route);
  } catch (err) {
    restoreGoBtn();
    showInfo('No route found', err.message || 'Could not find a route between these locations', 'err');
  }
}

function renderRoute(from, to, route) {
  drawRoute(route.geometry);

  const mins = Math.max(1, Math.round(route.duration_s / 60));
  const eta = new Date(route.eta).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  document.getElementById('sdist').textContent = fmtKm(route.distance_m);
  document.getElementById('stime').textContent = mins;
  document.getElementById('seta').textContent = eta;
  document.getElementById('rrRoute').textContent = `${from.name || 'Start'} → ${to.name || 'Destination'}`;

  const note = document.getElementById('rrTrafficNote');
  if (route.source === 'estimate') {
    note.textContent = '⚠️ Offline estimate — routing service unreachable';
  } else if (route.traffic_factor > 1.0) {
    const extra = Math.round((route.duration_s - route.duration_freeflow_s) / 60);
    note.textContent = `🚦 Accra traffic: +${extra} min vs free flow`;
  } else {
    note.textContent = '';
  }

  document.getElementById('routeResult').classList.add('show');
  hideInfo();
  document.querySelector('.panel-scroll').scrollTop = 0;

  store.routeSteps = route.steps || [];
  store.activeStep = -1;
  buildTBT(store.routeSteps);
  collapseBS();

  if (store.voiceEnabled && store.routeSteps.length > 0) {
    speak(`Starting navigation. ${store.routeSteps[0].instruction}. Distance: ${fmtDist(route.distance_m)}.`);
  }
}

export function stopNav() {
  clearRoute();
  document.getElementById('routeResult').classList.remove('show');
  ['fromInput', 'toInput', 'mFromInput', 'mToInput'].forEach((id) => { document.getElementById(id).value = ''; });
  store.selFrom = null;
  store.selTo = null;
  store.routeSteps = [];
  store.activeStep = -1;
  hideInfo();
  hideVoice();
  restoreGoBtn();
}

function buildTBT(steps) {
  const c = document.getElementById('tbtSteps');
  c.innerHTML = '';
  steps.forEach((s, i) => {
    const el = document.createElement('div');
    el.className = 'tbt-step';
    el.id = 'ts' + i;
    el.innerHTML =
      `<div class="step-ico">${s.icon}</div>` +
      `<div><div class="step-road">${esc(s.instruction)}</div>` +
      `<div class="step-dist">${fmtDist(s.distance_m)}</div></div>`;
    c.appendChild(el);
  });
}

function distMeters(a, b) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

export function updateActiveStep(pos) {
  if (!store.routeSteps.length || !pos) return;
  let minD = Infinity, ci = 0;
  store.routeSteps.forEach((s, i) => {
    const d = distMeters(pos, s.location);
    if (d < minD) { minD = d; ci = i; }
  });
  if (ci !== store.activeStep) {
    document.getElementById('ts' + store.activeStep)?.classList.remove('cur');
    store.activeStep = ci;
    const cur = document.getElementById('ts' + ci);
    if (cur) { cur.classList.add('cur'); cur.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
    if (store.voiceEnabled && store.routeSteps[ci]) speak(store.routeSteps[ci].instruction);
  }
}

export function navToCoords(lat, lng, name) {
  store.selTo = { lat, lng, name };
  document.getElementById('toInput').value = name;
  startNav();
}

// ── Voice guidance ─────────────────────────────────────────────
export function speak(text) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-GH';
  u.rate = 1.0;
  window.speechSynthesis.speak(u);
  document.getElementById('voiceTxt').textContent = text;
  document.getElementById('voiceBar').classList.add('on');
  clearTimeout(window._vt);
  window._vt = setTimeout(() => document.getElementById('voiceBar').classList.remove('on'), 4500);
}

export function hideVoice() {
  document.getElementById('voiceBar').classList.remove('on');
  if (window.speechSynthesis) window.speechSynthesis.cancel();
}

export function toggleVoice() {
  store.voiceEnabled = !store.voiceEnabled;
  const b = document.getElementById('voiceBtn');
  b.textContent = store.voiceEnabled ? '🔇 Mute' : '🔊 Voice';
  b.classList.toggle('on', store.voiceEnabled);
  if (store.voiceEnabled) speak('AccraMaps voice navigation enabled.');
  else hideVoice();
}
