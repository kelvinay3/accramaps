import { store } from './state.js';
import { esc } from './util.js';

export const ACCRA = { lat: 5.6037, lng: -0.187 };

export let map = null;
let cartoLayer = null;
let darkLayer = null;
let satLayer = null;
let routeLine = null;
let userMarker = null;
let accuracyCircle = null;
let clusterGroup = null;
const placeMarkers = [];

const CARTO_URL = '/tiles/carto/{z}/{x}/{y}.png';
const DARK_URL = '/tiles/dark/{z}/{x}/{y}.png';
const SAT_URL = '/tiles/sat/{z}/{x}/{y}.png';
const CARTO_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';
const SAT_ATTR = 'Imagery &copy; Esri &amp; contributors';

export function initMap() {
  map = L.map('map', { zoomControl: false, attributionControl: true })
    .setView([ACCRA.lat, ACCRA.lng], 13);
  L.control.zoom({ position: 'bottomright' }).addTo(map);
  cartoLayer = L.tileLayer(CARTO_URL, { attribution: CARTO_ATTR, maxZoom: 19 }).addTo(map);
  darkLayer = L.tileLayer(DARK_URL, { attribution: CARTO_ATTR, maxZoom: 19 });
  satLayer = L.tileLayer(SAT_URL, { attribution: SAT_ATTR, maxZoom: 19 });

  if (typeof L.markerClusterGroup === 'function') {
    clusterGroup = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 90,
      spiderfyOnMaxZoom: true,
      disableClusteringAtZoom: 17,
      iconCreateFunction(cluster) {
        const n = cluster.getChildCount();
        const sz = n < 10 ? 'small' : n < 100 ? 'medium' : 'large';
        return L.divIcon({
          html: `<div><span>${n}</span></div>`,
          className: `marker-cluster marker-cluster-${sz}`,
          iconSize: [40, 40],
        });
      },
    });
    map.addLayer(clusterGroup);
  }

  map.on('mousemove', (e) => {
    const la = e.latlng.lat, lo = e.latlng.lng;
    document.getElementById('coordsBar').textContent =
      Math.abs(la).toFixed(4) + '°' + (la >= 0 ? 'N' : 'S') + ', ' +
      Math.abs(lo).toFixed(4) + '°' + (lo >= 0 ? 'E' : 'W');
  });
  return map;
}

export function setMapDark(isDark) {
  if (!map) return;
  if (store.satOn) {
    document.getElementById('map').classList.toggle('map-dark-tiles', false);
    return;
  }
  if (isDark) {
    if (map.hasLayer(cartoLayer)) { map.removeLayer(cartoLayer); darkLayer.addTo(map); }
    document.getElementById('map').classList.add('map-dark-tiles');
  } else {
    if (map.hasLayer(darkLayer)) { map.removeLayer(darkLayer); cartoLayer.addTo(map); }
    document.getElementById('map').classList.remove('map-dark-tiles');
  }
}

export function resetView() {
  map.setView([ACCRA.lat, ACCRA.lng], 13);
}

export function toggleSat() {
  store.satOn = !store.satOn;
  if (store.satOn) {
    if (map.hasLayer(cartoLayer)) map.removeLayer(cartoLayer);
    if (map.hasLayer(darkLayer)) map.removeLayer(darkLayer);
    satLayer.addTo(map);
    document.getElementById('map').classList.remove('map-dark-tiles');
  } else {
    map.removeLayer(satLayer);
    if (store.darkOn) { darkLayer.addTo(map); document.getElementById('map').classList.add('map-dark-tiles'); }
    else { cartoLayer.addTo(map); }
  }
  document.getElementById('map').classList.toggle('map-sat', store.satOn);
  document.getElementById('satBtn').classList.toggle('on', store.satOn);
}

export function pinIcon(emoji, color = '#C9A84C') {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="38" viewBox="0 0 30 38" style="filter:drop-shadow(0 2px 5px rgba(0,0,0,0.35))">` +
    `<path d="M15 0C6.72 0 0 6.72 0 15c0 11.25 15 23 15 23s15-11.75 15-23C30 6.72 23.28 0 15 0z" fill="${color}"/>` +
    `<circle cx="15" cy="15" r="6.5" fill="rgba(255,255,255,0.25)"/>` +
    `<text x="15" y="18" text-anchor="middle" dominant-baseline="middle" font-size="10">${emoji}</text></svg>`;
  return L.divIcon({
    className: 'am-pin',
    html: `<div class="pin-bounce">${svg}</div>`,
    iconSize: [30, 38],
    iconAnchor: [15, 38],
    popupAnchor: [0, -38],
  });
}

export function clearPlaceMarkers() {
  if (clusterGroup) {
    clusterGroup.clearLayers();
  } else {
    placeMarkers.forEach((m) => m.remove());
  }
  placeMarkers.length = 0;
}

export function addPlaceMarkers(places, popupHtml) {
  clearPlaceMarkers();
  places.forEach((p) => {
    const marker = L.marker([p.lat, p.lng], { icon: pinIcon(p.icon || '📍') })
      .bindPopup(popupHtml(p), { closeButton: true, maxWidth: 280 });
    placeMarkers.push(marker);
  });
  if (clusterGroup) {
    clusterGroup.addLayers(placeMarkers);
  } else {
    placeMarkers.forEach((m) => m.addTo(map));
  }
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
  routeLine = L.polyline(latlngs, { color: '#C9A84C', weight: 6, opacity: 0.95 }).addTo(map);
  const outline = L.polyline(latlngs, { color: '#1A1612', weight: 10, opacity: 0.2 });
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

export function setUserMarker(lat, lng, accuracyM = 0) {
  if (!userMarker) {
    userMarker = L.marker([lat, lng], {
      icon: L.divIcon({ className: 'am-pin', html: '<div class="user-dot"></div>', iconSize: [20, 20], iconAnchor: [10, 10] }),
      zIndexOffset: 9999,
      title: 'You are here',
    }).addTo(map);
  } else {
    userMarker.setLatLng([lat, lng]);
  }

  if (accuracyM > 0 && accuracyM < 5000) {
    if (!accuracyCircle) {
      accuracyCircle = L.circle([lat, lng], {
        radius: accuracyM,
        stroke: true,
        weight: 1.5,
        color: 'rgba(201,168,76,.6)',
        fillColor: 'rgba(201,168,76,.08)',
        fillOpacity: 1,
        interactive: false,
      }).addTo(map);
    } else {
      accuracyCircle.setLatLng([lat, lng]).setRadius(accuracyM);
    }
  }
}

export function removeUserMarker() {
  userMarker?.remove();
  userMarker = null;
  accuracyCircle?.remove();
  accuracyCircle = null;
}

export function flyTo(lat, lng, zoom = 16) {
  map.flyTo([lat, lng], zoom, { duration: 0.8 });
}

export function openPopupAt(lat, lng, html) {
  L.popup({ closeButton: true }).setLatLng([lat, lng]).setContent(html).openOn(map);
}

export function placePopupHtml(p) {
  const name = esc(p.name);
  const stars = p.rating ? '★'.repeat(Math.round(p.rating)) + '☆'.repeat(5 - Math.round(p.rating)) : '';
  return `<div class="pp-card">
    <div class="pp-hero">${p.icon || '📍'}</div>
    <div class="pp-body">
      <div class="pp-name">${name}</div>
      <div class="pp-meta">
        ${p.rating ? `<span class="pp-stars">${stars}</span><span class="pp-review-count">${p.rating}</span>` : ''}
        ${p.area ? `<span style="font-size:10px;color:#9C9484">${esc(p.area)}${p.city && p.city !== 'Accra' ? ', ' + esc(p.city) : ''}</span>` : ''}
      </div>
      ${p.description ? `<div class="pp-desc">${esc(p.description)}</div>` : ''}
      <div class="pp-btns">
        <button class="pp-nav" onclick="AM.navToCoords(${p.lat},${p.lng},'${name.replace(/'/g, "\\'")}')">🧭 Go</button>
        <button class="pp-reviews" onclick="AM.openReviewModal(${p.id},'${name.replace(/'/g, "\\'")}')">⭐ Reviews</button>
        <button class="pp-save" onclick="AM.savePlace(${p.lat},${p.lng},'${name.replace(/'/g, "\\'")}')" title="Save">🔖</button>
      </div>
    </div>
  </div>`;
}
