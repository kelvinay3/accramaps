import { api } from './api.js';
import { store } from './state.js';
import { esc } from './util.js';
import { openModal, closeModal } from './ui.js';

let routes = [];

export async function loadTrotro() {
  try {
    const data = await api.get('/api/trotro');
    routes = data.routes;
  } catch {
    routes = [];
  }
  const list = document.getElementById('trotroList');
  list.innerHTML = '';
  routes.forEach((r) => {
    const row = document.createElement('div');
    row.className = 'trotro-row';
    row.innerHTML =
      `<div class="tr-top"><div class="tr-route">${esc(r.title.replace('🚌 ', ''))}</div><div class="tr-fare">${esc(r.fare.replace('.00', ''))}</div></div>` +
      `<div class="tr-detail">${esc(r.duration)} · ${esc(r.frequency)} · ${esc(r.board_at)}</div>`;
    row.onclick = () => showTrotroDetail(r.slug);
    list.appendChild(row);
  });
}

export function showTrotroDetail(slug) {
  const d = routes.find((r) => r.slug === slug);
  if (!d) return;
  store.currentTrotro = { lat: d.station_lat, lng: d.station_lng, name: d.station_name };
  document.getElementById('trotroTitle').textContent = d.title;
  const tr = (k, v) => `<div class="td-row"><span class="td-key">${k}</span><span class="td-val">${v}</span></div>`;
  document.getElementById('trotroDetail').innerHTML =
    tr('Route', esc(d.route)) +
    tr('Fare', `<span style="color:var(--gh-green);font-weight:700">${esc(d.fare)}</span>`) +
    tr('Time', esc(d.duration)) +
    tr('Frequency', esc(d.frequency)) +
    tr('Board at', esc(d.board_at)) +
    tr('Mate says', `<em style="color:var(--gh-red)">"${esc(d.callout)}"</em>`) +
    tr('⚠️ Traffic', esc(d.traffic_note));
  openModal('trotroModal');
}

export function showTrotroModal() {
  if (routes.length) showTrotroDetail(routes[0].slug);
  else openModal('trotroModal');
}

export function navToTrotroStation() {
  if (!store.currentTrotro) return;
  closeModal('trotroModal');
  setTimeout(() => window.AM.navToCoords(store.currentTrotro.lat, store.currentTrotro.lng, store.currentTrotro.name), 200);
}
