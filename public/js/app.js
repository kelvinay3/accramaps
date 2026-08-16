import { store } from './state.js';
import { api } from './api.js';
import { esc } from './util.js';
import { initMap, resetView, toggleSat, setMapDark, map, flyTo } from './map.js';
import { setupAllAC, clearGS, clearDF, swapInputs } from './search.js';
import { setMode, useMyLocation, startNav, stopNav, toggleVoice, navToCoords } from './directions.js';
import { toggleGPS } from './gps.js';
import { buildCatBars, loadInitialPlaces, loadHotAndQuick, nearbySearch, filterCat } from './places.js';
import { initReports, toggleIncBar, toggleReportsLayer, confirmReport, voteReport } from './reports.js';
import { startWidgetTimers } from './widgets.js';
import { loadTrotro, showTrotroDetail, showTrotroModal, navToTrotroStation } from './trotro.js';
import { initAuth, showAuthModal, switchAuthTab, submitAuth, logout, savePlace, submitSavePlace, setSaveLabel, goSavedSlot, showForgotView, submitForgot, submitReset } from './auth.js';
import { openReviewModal, pickStar, submitReview } from './reviews.js';
import { closeModal, openModal, toggleDark, restoreTheme, toggleBS, collapseBS, shareWA, copyLink } from './ui.js';
import { logEvent } from './analytics.js';

// Inline onclick handlers in index.html call through this global.
window.AM = {
  resetView, toggleSat, toggleDark: () => { toggleDark(); setMapDark(store.darkOn); },
  toggleBS, collapseBS,
  clearGS, clearDF, swapInputs,
  setMode, useMyLocation, startNav, stopNav, toggleVoice, navToCoords,
  toggleGPS,
  nearbySearch, filterCat,
  toggleIncBar, toggleReportsLayer, confirmReport, voteReport,
  showTrotroDetail, showTrotroModal, navToTrotroStation,
  showAuthModal, switchAuthTab, submitAuth, logout, savePlace, submitSavePlace, setSaveLabel, goSavedSlot, showForgotView, submitForgot, submitReset,
  openReviewModal, pickStar, submitReview,
  closeModal, showShareModal: () => openModal('shareModal'), shareWA, copyLink,
  showSubModal: () => openModal('subModal'),
  closeOnboard() {
    const modal = document.getElementById('onboardModal');
    if (modal) modal.classList.remove('open');
    localStorage.setItem('am_onboarded', '1');
    logEvent('onboard_done');
  },
  startPaystack(plan) {
    // Paystack integration stub — show info for now
    import('./ui.js').then(({ showInfo }) => showInfo('Coming Soon', `${plan.charAt(0).toUpperCase() + plan.slice(1)} plan payments launching soon via MTN MoMo & Vodafone Cash`, ''));
  },
  centerOnMe() {
    if (store.userLL) {
      flyTo(store.userLL.lat, store.userLL.lng, 16);
    } else {
      import('./gps.js').then(({ startGPS }) => startGPS());
    }
  },
};

function setupMapHandlers() {
  // Left-click: show a reverse-geocode popup (skip if a report is being placed)
  map.on('click', async (e) => {
    if (store.reportingType) return;
    const { lat, lng } = e.latlng;
    const coordStr = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    const initHtml = popupCard(coordStr, null, lat, lng);
    const popup = L.popup({ closeButton: true, maxWidth: 260 })
      .setLatLng(e.latlng).setContent(initHtml).openOn(map);
    try {
      const data = await api.get(`/api/geocode/reverse?lat=${lat.toFixed(6)}&lng=${lng.toFixed(6)}`);
      const name = data.name || coordStr;
      const sub = data.display ? data.display.split(',').slice(1, 3).join(',').trim() : '';
      if (map.hasLayer(popup) || map._popup === popup) {
        popup.setContent(popupCard(name, sub, lat, lng));
      }
    } catch { /* keep coordinate popup */ }
  });

  // Right-click / long-press: directions from/to menu
  map.on('contextmenu', (e) => {
    const { lat, lng } = e.latlng;
    const html = `<div class="pp-card"><div class="pp-body">
      <div class="pp-name">📍 ${lat.toFixed(5)}, ${lng.toFixed(5)}</div>
      <div class="pp-btns" style="flex-direction:column;gap:5px">
        <button class="pp-nav" onclick="AM._dirFrom(${lat},${lng})">🟢 Directions from here</button>
        <button class="pp-nav" onclick="AM._dirTo(${lat},${lng})">🔴 Directions to here</button>
        <button class="pp-save" style="flex:1" onclick="AM.savePlace(${lat},${lng},'Pinned spot')">⭐ Save this spot</button>
      </div>
    </div></div>`;
    L.popup({ maxWidth: 260 }).setLatLng(e.latlng).setContent(html).openOn(map);
  });

  window.AM._dirFrom = (lat, lng) => {
    map.closePopup();
    store.selFrom = { lat, lng, name: `${lat.toFixed(4)}, ${lng.toFixed(4)}` };
    document.getElementById('fromInput').value = store.selFrom.name;
  };
  window.AM._dirTo = (lat, lng) => {
    map.closePopup();
    navToCoords(lat, lng, `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
  };
}

function popupCard(name, sub, lat, lng) {
  const safeName = esc(name).replace(/'/g, '&#39;');
  return `<div class="pp-card rg-popup">
    <div class="pp-body">
      <div class="pp-name">📍 ${esc(name)}</div>
      ${sub ? `<div class="pp-desc">${esc(sub)}</div>` : ''}
      <div class="pp-btns" style="margin-top:10px">
        <button class="pp-nav" onclick="AM._dirTo(${lat},${lng})">🧭 Navigate</button>
        <button class="pp-save" onclick="AM.savePlace(${lat},${lng},'${safeName.slice(0, 40)}')">⭐</button>
      </div>
    </div>
  </div>`;
}

// Track search queries for analytics
function trackSearch(query) {
  if (query && query.length > 1) logEvent('search', { q: query.slice(0, 100) });
}

// Patch search inputs to fire analytics on submission
function patchSearchAnalytics() {
  const inputs = ['gSearch', 'mSearch', 'fromInput', 'toInput'];
  inputs.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && el.value.trim()) trackSearch(el.value.trim());
    });
  });
}

async function init() {
  restoreTheme();
  initMap();
  setMapDark(store.darkOn);
  setupAllAC();
  setupMapHandlers();
  patchSearchAnalytics();
  startWidgetTimers();

  // Log page view
  logEvent('page_view', { path: location.pathname });

  await Promise.all([
    buildCatBars(),
    loadTrotro(),
    initAuth(),
  ]);
  await loadInitialPlaces();
  loadHotAndQuick();
  initReports();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
}

init();
