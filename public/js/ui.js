import { store } from './state.js';

export function showInfo(title, body, type = '') {
  const c = document.getElementById('infoCard');
  c.className = 'info-card show' + (type ? ' ' + type : '');
  document.getElementById('icT').textContent = title;
  document.getElementById('icB').textContent = body || '';
}

export function hideInfo() {
  document.getElementById('infoCard').classList.remove('show');
}

export function openModal(id) { document.getElementById(id).classList.add('open'); }
export function closeModal(id) { document.getElementById(id).classList.remove('open'); }

export function toggleDark() {
  store.darkOn = !store.darkOn;
  document.documentElement.setAttribute('data-theme', store.darkOn ? 'dark' : 'light');
  document.getElementById('darkBtn').textContent = store.darkOn ? '☀️' : '🌙';
  localStorage.setItem('accramaps_theme', store.darkOn ? 'dark' : 'light');
}

export function restoreTheme() {
  if (localStorage.getItem('accramaps_theme') === 'dark') toggleDark();
}

export function toggleBS() {
  store.bsOpen = !store.bsOpen;
  document.getElementById('bs').style.transform = store.bsOpen ? 'translateY(0)' : 'translateY(calc(100% - 74px))';
  document.getElementById('bsChev').textContent = store.bsOpen ? '⌄' : '⌃';
}

export function collapseBS() {
  store.bsOpen = false;
  document.getElementById('bs').style.transform = 'translateY(calc(100% - 74px))';
  document.getElementById('bsChev').textContent = '⌃';
}

export function shareWA() {
  const loc = store.userLL
    ? `https://www.openstreetmap.org/?mlat=${store.userLL.lat}&mlon=${store.userLL.lng}#map=17/${store.userLL.lat}/${store.userLL.lng}`
    : window.location.href;
  window.open('https://wa.me/?text=' + encodeURIComponent('🗺️ Using AccraMaps to navigate Ghana!\n' + loc + "\n\nAccra's own maps app 🇬🇭"), '_blank');
  closeModal('shareModal');
}

export function copyLink() {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(window.location.href).then(() => showInfo('Copied!', 'Link copied to clipboard', 'ok'));
  }
  closeModal('shareModal');
}
