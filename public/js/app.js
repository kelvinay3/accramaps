import { store } from './state.js';
import { initMap, resetView, toggleSat, map } from './map.js';
import { setupAllAC, clearGS, clearDF, swapInputs } from './search.js';
import { setMode, useMyLocation, startNav, stopNav, toggleVoice, navToCoords } from './directions.js';
import { toggleGPS } from './gps.js';
import { buildCatBars, loadInitialPlaces, loadHotAndQuick, nearbySearch, filterCat } from './places.js';
import { initReports, toggleIncBar, toggleReportsLayer, confirmReport } from './reports.js';
import { startWidgetTimers } from './widgets.js';
import { loadTrotro, showTrotroDetail, showTrotroModal, navToTrotroStation } from './trotro.js';
import { initAuth, showAuthModal, switchAuthTab, submitAuth, logout, savePlace, submitSavePlace } from './auth.js';
import { closeModal, openModal, toggleDark, restoreTheme, toggleBS, collapseBS, shareWA, copyLink } from './ui.js';

// Inline onclick handlers in index.html call through this global.
window.AM = {
  resetView, toggleSat, toggleDark, toggleBS, collapseBS,
  clearGS, clearDF, swapInputs,
  setMode, useMyLocation, startNav, stopNav, toggleVoice, navToCoords,
  toggleGPS,
  nearbySearch, filterCat,
  toggleIncBar, toggleReportsLayer, confirmReport,
  showTrotroDetail, showTrotroModal, navToTrotroStation,
  showAuthModal, switchAuthTab, submitAuth, logout, savePlace, submitSavePlace,
  closeModal, showShareModal: () => openModal('shareModal'), shareWA, copyLink,
};

function setupContextMenu() {
  map.on('contextmenu', (e) => {
    const { lat, lng } = e.latlng;
    const html = `<div class="pp-card"><div class="pp-body">
      <div class="pp-name">📍 ${lat.toFixed(5)}, ${lng.toFixed(5)}</div>
      <div class="pp-btns" style="flex-direction:column">
        <button class="pp-nav" onclick="AM._dirFrom(${lat},${lng})">🟢 Directions from here</button>
        <button class="pp-nav" onclick="AM._dirTo(${lat},${lng})">🔴 Directions to here</button>
        <button class="pp-save" onclick="AM.savePlace(${lat},${lng},'Pinned spot')">⭐ Save this spot</button>
      </div>
    </div></div>`;
    L.popup().setLatLng(e.latlng).setContent(html).openOn(map);
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

async function init() {
  restoreTheme();
  initMap();
  setupAllAC();
  setupContextMenu();
  startWidgetTimers();

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
