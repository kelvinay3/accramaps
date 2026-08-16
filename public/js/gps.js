import { store } from './state.js';
import { map, setUserMarker, removeUserMarker, flyTo } from './map.js';
import { showInfo } from './ui.js';
import { updateActiveStep } from './directions.js';

const GPS_SVG = '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="9" stroke-dasharray="2 3"/></svg>';

export function toggleGPS() {
  store.isTracking ? stopGPS() : startGPS();
}

export function startGPS() {
  if (!navigator.geolocation) {
    showInfo('GPS Error', 'Geolocation not supported by your browser', 'err');
    return;
  }
  const btn = document.getElementById('gpsBtn');
  btn.innerHTML = '⌛ Locating…';
  btn.disabled = true;
  store.watchId = navigator.geolocation.watchPosition((pos) => {
    store.userLL = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    setUserMarker(store.userLL.lat, store.userLL.lng, pos.coords.accuracy || 0);
    if (!store.isTracking) {
      flyTo(store.userLL.lat, store.userLL.lng, 16);
      store.isTracking = true;
      btn.innerHTML = '🟡 Tracking Live';
      btn.classList.add('tracking');
      btn.disabled = false;
      document.getElementById('gpsTopBtn').classList.add('active');
      document.getElementById('speedFloat').classList.add('on');
      showInfo('📍 Live position active', 'Your location is on the map', 'ok');
    }
    const spd = pos.coords.speed != null ? (pos.coords.speed * 3.6).toFixed(0) : '0';
    document.getElementById('spVal').textContent = spd;
    document.getElementById('statusR').textContent = spd + ' km/h';
    updateActiveStep(store.userLL);
  }, (err) => {
    store.isTracking = false;
    btn.disabled = false;
    btn.innerHTML = GPS_SVG + ' Locate Me';
    const msg = err.code === 1
      ? 'Location access denied — enable in browser settings'
      : 'GPS signal unavailable, please try again';
    showInfo('GPS Error', msg, 'err');
  }, { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 });
}

export function stopGPS() {
  if (store.watchId != null) {
    navigator.geolocation.clearWatch(store.watchId);
    store.watchId = null;
  }
  removeUserMarker();
  store.userLL = null;
  store.isTracking = false;
  const btn = document.getElementById('gpsBtn');
  btn.classList.remove('tracking');
  btn.innerHTML = GPS_SVG + ' Locate Me';
  btn.disabled = false;
  document.getElementById('gpsTopBtn').classList.remove('active');
  document.getElementById('speedFloat').classList.remove('on');
  document.getElementById('statusR').textContent = 'Navigate Ghana';
}
