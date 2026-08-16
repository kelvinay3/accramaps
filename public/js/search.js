import { api } from './api.js';
import { store } from './state.js';
import { esc, debounce } from './util.js';
import { flyTo } from './map.js';
import { collapseBS } from './ui.js';

function renderDrop(drop, results, onPick) {
  drop.innerHTML = '';
  if (!results.length) { drop.classList.remove('open'); return; }
  results.forEach((r) => {
    const item = document.createElement('div');
    item.className = 'ac-item';
    item.innerHTML =
      `<div class="ac-ico">${r.icon || '📍'}</div>` +
      '<div style="flex:1;min-width:0">' +
      `<div class="ac-name">${esc(r.name)}</div>` +
      `<div class="ac-sub">${esc(r.sub || '')}</div>` +
      '</div>';
    // mousedown fires before the input's blur, so selection always registers
    item.addEventListener('mousedown', (e) => {
      e.preventDefault();
      drop.classList.remove('open');
      onPick(r);
    });
    drop.appendChild(item);
  });
  drop.classList.add('open');
}

export function setupAC(inputId, dropId, onSelect) {
  const inp = document.getElementById(inputId);
  const drop = document.getElementById(dropId);
  if (!inp || !drop) return;

  const search = debounce(async (q) => {
    try {
      const data = await api.get(`/api/geocode?q=${encodeURIComponent(q)}`);
      if (inp.value.trim() !== q) return; // stale response
      if (data.ghanaPostGps && !data.results.length) {
        renderDrop(drop, [{
          name: data.ghanaPostGps.code, icon: '🇬🇭',
          sub: `GhanaPost GPS · ${data.ghanaPostGps.region || 'Ghana'} — save it to a place to navigate`,
          unresolvable: true,
        }], () => {});
        return;
      }
      renderDrop(drop, data.results, (r) => {
        inp.value = r.name;
        onSelect({ lat: r.lat, lng: r.lng, name: r.name });
      });
    } catch {
      drop.classList.remove('open');
    }
  }, 250);

  inp.addEventListener('input', () => {
    const q = inp.value.trim();
    if (q.length < 2) { drop.classList.remove('open'); return; }
    search(q);
  });

  inp.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') drop.classList.remove('open');
    if (e.key === 'Enter') { e.preventDefault(); drop.classList.remove('open'); }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#' + inputId) && !e.target.closest('#' + dropId)) {
      drop.classList.remove('open');
    }
  });
}

export function setupAllAC() {
  setupAC('gSearch', 'gDrop', (item) => flyTo(item.lat, item.lng));
  setupAC('fromInput', 'fromDrop', (item) => { store.selFrom = item; });
  setupAC('toInput', 'toDrop', (item) => { store.selTo = item; });
  setupAC('mFromInput', 'mFromDrop', (item) => { store.selFrom = item; document.getElementById('fromInput').value = item.name; });
  setupAC('mToInput', 'mToDrop', (item) => { store.selTo = item; document.getElementById('toInput').value = item.name; });
  setupAC('mSearch', 'mDrop', (item) => { flyTo(item.lat, item.lng); collapseBS(); });
}

// Resolve free text typed without picking a suggestion → first geocode hit.
export async function geocodeText(text) {
  if (!text) return null;
  try {
    const data = await api.get(`/api/geocode?q=${encodeURIComponent(text)}`);
    const r = data.results?.[0];
    return r ? { lat: r.lat, lng: r.lng, name: r.name } : null;
  } catch {
    return null;
  }
}

export function clearGS() {
  document.getElementById('gSearch').value = '';
  document.getElementById('gDrop').classList.remove('open');
}

export function clearDF(which) {
  const inp = document.getElementById(which === 'from' ? 'fromInput' : 'toInput');
  const drp = document.getElementById(which === 'from' ? 'fromDrop' : 'toDrop');
  inp.value = '';
  drp.classList.remove('open');
  if (which === 'from') store.selFrom = null; else store.selTo = null;
}

export function swapInputs() {
  const from = document.getElementById('fromInput');
  const to = document.getElementById('toInput');
  [from.value, to.value] = [to.value, from.value];
  [store.selFrom, store.selTo] = [store.selTo, store.selFrom];
}
