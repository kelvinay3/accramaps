import { api } from './api.js';
import { store } from './state.js';
import { esc, timeAgo } from './util.js';
import { map, pinIcon } from './map.js';
import { showInfo } from './ui.js';

let reportTypes = [];
let reportLayer = null;

export async function initReports() {
  reportLayer = L.layerGroup().addTo(map);
  try {
    const data = await api.get('/api/reports/types');
    reportTypes = data.types;
  } catch {
    reportTypes = [];
  }
  buildIncBar();
  await refreshReports();
  setInterval(refreshReports, 60_000);

  // A pending report type turns the next map click into its location.
  map.on('click', async (e) => {
    if (!store.reportingType) return;
    const type = store.reportingType;
    cancelReportPlacement();
    await submitReport(type, e.latlng.lat, e.latlng.lng);
  });
}

function buildIncBar() {
  const bar = document.getElementById('incBar');
  bar.innerHTML = '';
  reportTypes.forEach((t) => {
    const el = document.createElement('div');
    el.className = 'inc-btn';
    el.textContent = `${t.icon} ${t.label}`;
    el.onclick = () => beginReport(el, t);
    bar.appendChild(el);
  });
}

function beginReport(btn, type) {
  if (store.userLL) {
    submitReport(type.id, store.userLL.lat, store.userLL.lng);
    btn.classList.add('fired');
    setTimeout(() => btn.classList.remove('fired'), 5000);
  } else {
    // No GPS — let the user tap the report location on the map.
    store.reportingType = type.id;
    document.getElementById('map').classList.add('reporting');
    document.getElementById('incHint').style.display = 'block';
    showInfo(`${type.icon} ${type.label}`, 'Tap the map where it is happening', '');
  }
}

function cancelReportPlacement() {
  store.reportingType = null;
  document.getElementById('map').classList.remove('reporting');
  document.getElementById('incHint').style.display = 'none';
}

async function submitReport(typeId, lat, lng) {
  try {
    const data = await api.post('/api/reports', { type: typeId, lat, lng });
    showInfo(`${data.report.icon} ${data.report.label} reported!`, 'Visible to all AccraMaps users', 'ok');
    await refreshReports();
    refreshTrafficWidget();
  } catch (err) {
    showInfo('Report failed', err.message, 'err');
  }
}

export async function refreshReports() {
  if (!reportLayer) return;
  try {
    const data = await api.get('/api/reports');
    reportLayer.clearLayers();
    data.reports.forEach((r) => {
      const marker = L.marker([r.lat, r.lng], { icon: pinIcon(r.icon, '#CE1126') });
      marker.bindPopup(reportPopupHtml(r));
      reportLayer.addLayer(marker);
    });
  } catch { /* offline — keep whatever is shown */ }
}

function reportPopupHtml(r) {
  return `<div class="pp-card"><div class="pp-body">
    <div class="pp-name">${r.icon} ${esc(r.label)}</div>
    ${r.description ? `<div class="pp-desc">${esc(r.description)}</div>` : ''}
    <div class="pp-desc">Reported ${timeAgo(r.created_at)} · ${r.confirms} confirm${r.confirms === 1 ? '' : 's'}</div>
    <div class="pp-btns">
      <button class="pp-confirm" onclick="AM.confirmReport(${r.id})">👍 Still there</button>
    </div>
  </div></div>`;
}

export async function confirmReport(id) {
  try {
    await api.post(`/api/reports/${id}/confirm`);
    map.closePopup();
    showInfo('✓ Thanks!', 'Report confirmed — it stays visible longer', 'ok');
    await refreshReports();
  } catch (err) {
    showInfo('Could not confirm', err.message, 'err');
  }
}

export function toggleIncBar() {
  const b = document.getElementById('incBar');
  const showing = b.style.display === 'flex';
  b.style.display = showing ? 'none' : 'flex';
  if (showing) cancelReportPlacement();
}

export function toggleReportsLayer() {
  store.reportsOn = !store.reportsOn;
  if (store.reportsOn) reportLayer.addTo(map);
  else map.removeLayer(reportLayer);
  document.getElementById('trafficBtn').classList.toggle('on', store.reportsOn);
}

// Re-pull the traffic summary after a new report lands.
async function refreshTrafficWidget() {
  const { updateTraffic } = await import('./widgets.js');
  updateTraffic();
}
