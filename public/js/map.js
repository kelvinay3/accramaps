import { store } from './state.js';
import { esc } from './util.js';

export const ACCRA = { lat: 5.6037, lng: -0.187 };

export let map = null;
let baseLayer = null;
let satLayer = null;
let routeLine = null;
let userMarker = null;
const placeMarkers = [];

// Tiles come through our own backend (cached server-side) — see server/routes/tiles.js
const OSM_URL = '/tiles/osm/{z}/{x}/{y}.png';
const OSM_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const SAT_URL = '/tiles/sat/{z}/{x}/{y}.png';
const SAT_ATTR = 'Imagery &copy; Esri &amp; contributors';

export function initMap() {
  map = L.map('map', { zoomControl: false, attributionControl: true })
    .setView([ACCRA.lat, ACCRA.lng], 13);
  L.control.zoom({ position: 'bottomright' }).addTo(map);
  baseLayer = L.tileLayer(OSM_URL, { attribution: OSM_ATTR, maxZoom: 19 }).addTo(map);
  satLayer = L.tileLayer(SAT_URL, { attribution: SAT_ATTR, maxZoom: 19 });

  map.on('mousemove', (e) => {
    const la = e.latlng.lat, lo = e.latlng.lng;
    document.getElementById('coordsBar').textContent =
      Math.abs(la).toFixed(4) + '°' + (la >= 0 ? 'N' : 'S') + ', ' +
      Math.abs(lo).toFixed(4) + '°' + (lo >= 0 ? 'E' : 'W');
  });
  return map;
}

export function resetView() {
  map.setView([ACCRA.lat, ACCRA.lng], 13);
}

export function toggleSat() {
  store.satOn = !store.satOn;
  if (store.satOn) { map.removeLayer(baseLayer); satLayer.addTo(map); }
  else { map.removeLayer(satLayer); baseLayer.addTo(map); }
  document.getElementById('map').classList.toggle('map-sat', store.satOn);
  document.getElementById('satBtn').classList.toggle('on', store.satOn);
}

export function pinIcon(emoji, color = '#FCD116') {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44">` +
    `<path d="M18 0C9.16 0 2 7.16 2 16c0 12 16 28 16 28s16-16 16-28C34 7.16 26.84 0 18 0z" fill="${color}" stroke="#1A1612" stroke-width="1.5"/>` +
    `<text x="18" y="21" text-anchor="middle" dominant-baseline="middle" font-size="13">${emoji}</text></svg>`;
  return L.divIcon({
    className: 'am-pin',
    html: `<div class="pin-bounce">${svg}</div>`,
    iconSize: [36, 44],
    iconAnchor: [18, 44],
    popupAnchor: [0, -44],
  });
}

export function clearPlaceMarkers() {
  placeMarkers.forEach((m) => m.remove());
  placeMarkers.length = 0;
}

export function addPlaceMarkers(places, popupHtml) {
  clearPlaceMarkers();
  places.forEach((p) => {
    const marker = L.marker([p.lat, p.lng], { icon: pinIcon(p.icon || '📍') })
      .addTo(map)
      .bindPopup(popupHtml(p), { closeButton: true });
    placeMarkers.push(marker);
  });
  return placeMarkers;
}

export function fitToPlaces(places) {
  if (!places.length) return;
  const bounds = L.latLngBounds(places.map((p) => [p.lat, p.lng]));
  map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
}

export function drawRoute(geometry) {
  clearRoute();
  const latlngs = geometry.coordinates.map(([lng, lat]) => [lat, lng]);
  routeLine = L.polyline(latlngs, { color: '#FCD116', weight: 6, opacity: 0.9 }).addTo(map);
  const outline = L.polyline(latlngs, { color: '#1A1612', weight: 9, opacity: 0.25 });
  outline.addTo(map);
  outline.bringToBack();
  routeLine._outline = outline;
  map.fitBounds(routeLine.getBounds(), { padding: [50, 50] });
}

export function clearRoute() {
  if (routeLine) {
    routeLine._outline?.remove();
    routeLine.remove();
    routeLine = null;
  }
}

export function setUserMarker(lat, lng) {
  if (!userMarker) {
    userMarker = L.marker([lat, lng], {
      icon: L.divIcon({ className: 'am-pin', html: '<div class="user-dot"></div>', iconSize: [20, 20], iconAnchor: [10, 10] }),
      zIndexOffset: 9999,
      title: 'You are here',
    }).addTo(map);
  } else {
    userMarker.setLatLng([lat, lng]);
  }
}

export function removeUserMarker() {
  userMarker?.remove();
  userMarker = null;
}

export function flyTo(lat, lng, zoom = 16) {
  map.flyTo([lat, lng], zoom, { duration: 0.8 });
}

export function openPopupAt(lat, lng, html) {
  L.popup({ closeButton: true }).setLatLng([lat, lng]).setContent(html).openOn(map);
}

export function placePopupHtml(p) {
  const name = esc(p.name);
  return `<div class="pp-card">
    <div class="pp-hero">${p.icon || '📍'}</div>
    <div class="pp-body">
      <div class="pp-name">${name}</div>
      <div class="pp-meta">
        ${p.rating ? `<span class="pp-rating">${p.rating}★</span>` : ''}
        ${p.area ? `<span style="font-size:10px;color:#9C9484">${esc(p.area)}${p.city && p.city !== 'Accra' ? ', ' + esc(p.city) : ''}</span>` : ''}
      </div>
      ${p.description ? `<div class="pp-desc">${esc(p.description)}</div>` : ''}
      <div class="pp-btns">
        <button class="pp-nav" onclick="AM.navToCoords(${p.lat},${p.lng},'${name.replace(/'/g, "\\'")}')">🧭 Navigate</button>
        <button class="pp-save" onclick="AM.savePlace(${p.lat},${p.lng},'${name.replace(/'/g, "\\'")}')" title="Save to My Places">⭐</button>
      </div>
    </div>
  </div>`;
}
