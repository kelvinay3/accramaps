import { api } from './api.js';
import { store } from './state.js';
import { esc, fmtDist } from './util.js';
import { addPlaceMarkers, fitToPlaces, flyTo, placePopupHtml } from './map.js';
import { collapseBS } from './ui.js';

let categories = [];

export async function buildCatBars() {
  try {
    const data = await api.get('/api/places/categories');
    categories = [{ id: 'all', label: 'All', icon: '🗺️' }, ...data.categories];
  } catch {
    categories = [{ id: 'all', label: 'All', icon: '🗺️' }];
  }
  ['catBar', 'mCatBar'].forEach((barId) => {
    const bar = document.getElementById(barId);
    if (!bar) return;
    bar.innerHTML = '';
    categories.forEach((c) => {
      const el = document.createElement('div');
      el.className = 'cat-chip' + (c.id === 'all' ? ' active' : '');
      el.setAttribute('data-cat', c.id);
      el.textContent = `${c.icon} ${c.label}`;
      el.onclick = () => {
        document.querySelectorAll('.cat-chip').forEach((x) => x.classList.remove('active'));
        document.querySelectorAll(`[data-cat="${c.id}"]`).forEach((x) => x.classList.add('active'));
        filterCat(c.id);
      };
      bar.appendChild(el);
    });
  });
}

export async function loadInitialPlaces() {
  try {
    const data = await api.get('/api/places?limit=30');
    store.currentPlaces = data.places;
    renderPlaceList(data.places, 'placeList');
    renderPlaceList(data.places, 'mPlaceList');
    addPlaceMarkers(data.places, placePopupHtml);
  } catch {
    document.getElementById('placeList').innerHTML =
      '<div style="padding:12px;font-size:11px;color:var(--muted)">Could not load places — is the server running?</div>';
  }
}

export async function nearbySearch(category, label) {
  document.getElementById('listLbl').textContent = `📍 ${label} Near You`;
  document.getElementById('placeList').innerHTML =
    `<div class="loading-row"><div class="spinner"></div>Finding ${esc(label)}…</div>`;
  const near = store.userLL ? `&near=${store.userLL.lat},${store.userLL.lng}&radius=15000` : '';
  try {
    const data = await api.get(`/api/places?category=${encodeURIComponent(category)}${near}`);
    store.currentPlaces = data.places;
    renderPlaceList(data.places, 'placeList');
    renderPlaceList(data.places, 'mPlaceList');
    addPlaceMarkers(data.places, placePopupHtml);
    fitToPlaces(data.places);
    document.getElementById('bsSub').textContent = `${data.places.length} ${label} found`;
  } catch {
    document.getElementById('placeList').innerHTML =
      '<div style="padding:12px;font-size:11px;color:var(--muted)">No results found nearby.</div>';
  }
}

export function filterCat(catId) {
  if (catId === 'all') {
    loadInitialPlaces();
    document.getElementById('listLbl').textContent = '✨ Places in Accra';
    return;
  }
  const c = categories.find((x) => x.id === catId);
  if (c) nearbySearch(c.id, c.label);
}

export function renderPlaceList(places, cid) {
  const el = document.getElementById(cid);
  if (!el) return;
  el.innerHTML = '';
  if (!places || !places.length) {
    el.innerHTML = '<div style="padding:12px;font-size:11px;color:var(--muted)">No places found</div>';
    return;
  }
  places.slice(0, 30).forEach((p) => {
    const row = document.createElement('div');
    row.className = 'place-row';
    row.innerHTML =
      `<div class="place-photo">${p.icon || '📍'}</div>` +
      '<div class="place-body">' +
      `<div class="place-name">${esc(p.name)}</div>` +
      '<div class="place-meta">' +
      (p.rating ? `<span class="place-rating">${p.rating}★</span>` : '') +
      `<span class="place-area">${esc([p.area, p.city !== 'Accra' ? p.city : ''].filter(Boolean).join(', '))}</span>` +
      (p.distance_m != null ? `<span class="open-badge open-u">${fmtDist(p.distance_m)}</span>` : '') +
      '</div>' +
      '</div>' +
      '<div class="place-nav-arrow"><svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg></div>';
    row.onclick = () => {
      flyTo(p.lat, p.lng, 16);
      const markers = addPlaceMarkers(store.currentPlaces, placePopupHtml);
      const idx = store.currentPlaces.indexOf(p);
      if (idx >= 0) markers[idx]?.openPopup();
      collapseBS();
    };
    el.appendChild(row);
  });
}

export async function loadHotAndQuick() {
  try {
    const hot = await api.get('/api/places/hot');
    const scroll = document.getElementById('hotScroll');
    scroll.innerHTML = '';
    hot.places.forEach((p) => {
      const tag = p.rating >= 4.5 ? '🔥 Popping' : '⭐ Trending';
      const card = document.createElement('div');
      card.className = 'hot-card';
      card.innerHTML =
        `<div class="hot-ico">${p.icon}</div>` +
        `<div class="hot-name">${esc(p.name)}</div>` +
        `<div class="hot-tag">${tag}</div>`;
      card.onclick = () => window.AM.navToCoords(p.lat, p.lng, p.name);
      scroll.appendChild(card);
    });
  } catch { /* section stays empty offline */ }

  try {
    const quick = await api.get('/api/places/quick');
    const grid = document.getElementById('quickGrid');
    grid.innerHTML = '';
    quick.places.forEach((p) => {
      const chip = document.createElement('div');
      chip.className = 'quick-chip';
      chip.innerHTML =
        `<div class="qc-ico">${p.icon}</div>` +
        `<div><div class="qc-lbl">${esc(p.name)}</div><div class="qc-sub">${esc(p.area || '')}</div></div>`;
      chip.onclick = () => window.AM.navToCoords(p.lat, p.lng, p.name);
      grid.appendChild(chip);
    });
  } catch { /* section stays empty offline */ }
}
