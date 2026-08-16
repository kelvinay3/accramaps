import { api, setToken, clearToken, getToken } from './api.js';
import { store } from './state.js';
import { esc } from './util.js';
import { openModal, closeModal, showInfo } from './ui.js';

let authTab = 'login';
let _saveLabel = 'fav';

export async function initAuth() {
  if (!getToken()) return;
  try {
    const data = await api.get('/api/auth/me');
    store.user = data.user;
    onSignedIn();
  } catch {
    clearToken();
  }
}

export function showAuthModal() {
  const forms = document.getElementById('authForms');
  const profile = document.getElementById('authProfile');
  if (store.user) {
    forms.style.display = 'none';
    profile.style.display = 'block';
    document.getElementById('authTitle').textContent = `👋 ${store.user.name}`;
    document.getElementById('profileInfo').textContent =
      `Signed in as ${store.user.email}. Your saved places sync to this account.`;
    const credEl = document.getElementById('profileCredits');
    if (credEl) credEl.textContent = store.credits ?? 0;
  } else {
    forms.style.display = 'block';
    profile.style.display = 'none';
    document.getElementById('authTitle').textContent = '👤 Welcome to AccraMaps';
  }
  openModal('authModal');
}

export function switchAuthTab(tab) {
  authTab = tab;
  document.getElementById('tabLogin').classList.toggle('active', tab === 'login');
  document.getElementById('tabRegister').classList.toggle('active', tab === 'register');
  document.getElementById('authName').style.display = tab === 'register' ? 'block' : 'none';
  document.getElementById('authSubmit').textContent = tab === 'login' ? 'Sign in' : 'Create account';
  setAuthError('');
}

function setAuthError(msg) {
  const el = document.getElementById('authError');
  el.textContent = msg;
  el.classList.toggle('show', Boolean(msg));
}

export async function submitAuth() {
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;
  const name = document.getElementById('authName').value.trim();
  setAuthError('');
  try {
    const data = authTab === 'login'
      ? await api.post('/api/auth/login', { email, password })
      : await api.post('/api/auth/register', { email, password, name });
    setToken(data.token);
    store.user = data.user;
    closeModal('authModal');
    showInfo(`👋 Akwaaba, ${data.user.name}!`, 'You are signed in — saved places now sync', 'ok');
    onSignedIn();
  } catch (err) {
    setAuthError(err.message);
  }
}

export function logout() {
  clearToken();
  store.user = null;
  store.credits = 0;
  store.savedSlots = {};
  closeModal('authModal');
  document.getElementById('authBtn').classList.remove('active');
  document.getElementById('favSec').style.display = 'none';
  showInfo('Signed out', 'See you soon 👋', '');
}

function onSignedIn() {
  document.getElementById('authBtn').classList.add('active');
  document.getElementById('favSec').style.display = 'block';
  loadFavorites();
  loadCredits();
  loadSavedSlots();
}

// ── Credits ────────────────────────────────────────────────────
async function loadCredits() {
  try {
    const data = await api.get('/api/credits');
    store.credits = data.balance;
    const el = document.getElementById('profileCredits');
    if (el) el.textContent = data.balance;
  } catch { /* ignore */ }
}

// ── Saved Slots (Home / Work) ──────────────────────────────────
async function loadSavedSlots() {
  try {
    const data = await api.get('/api/saved');
    store.savedSlots = {};
    (data.places || []).forEach((p) => { store.savedSlots[p.label] = p; });
    updateSlotUI('home');
    updateSlotUI('work');
  } catch { /* ignore */ }
}

function updateSlotUI(label) {
  const slot = store.savedSlots?.[label];
  const id = `slot${label.charAt(0).toUpperCase() + label.slice(1)}Name`;
  const nameEl = document.getElementById(id);
  if (!nameEl) return;
  const rowEl = nameEl.closest('.saved-slot');
  if (slot) {
    nameEl.textContent = slot.name.slice(0, 22);
    rowEl?.classList.add('set');
  } else {
    nameEl.innerHTML = '<span class="ss-empty">Tap to set</span>';
    rowEl?.classList.remove('set');
  }
}

export function goSavedSlot(label) {
  const slot = store.savedSlots?.[label];
  if (slot) {
    window.AM.navToCoords(slot.lat, slot.lng, slot.name);
  } else {
    showInfo(
      `Set your ${label} location`,
      `Tap ⭐ on any place popup, then choose ${label.charAt(0).toUpperCase() + label.slice(1)}.`,
      ''
    );
  }
}

export function setSaveLabel(label) {
  _saveLabel = label;
  ['fav', 'home', 'work'].forEach((l) => {
    const btn = document.getElementById(`slbl-${l}`);
    if (btn) btn.classList.toggle('active', l === label);
  });
  // Show note field only for favourites
  const noteEl = document.getElementById('saveNote');
  if (noteEl) noteEl.style.display = (label === 'fav') ? 'block' : 'none';
}

// ── Favorites ──────────────────────────────────────────────────
export async function loadFavorites() {
  if (!store.user) return;
  const list = document.getElementById('favList');
  try {
    const data = await api.get('/api/favorites');
    list.innerHTML = '';
    if (!data.favorites.length) {
      list.innerHTML = '<div style="padding:10px;font-size:11px;color:var(--muted)">No saved places yet — tap 🔖 on any place popup.</div>';
      return;
    }
    data.favorites.forEach((f) => {
      const row = document.createElement('div');
      row.className = 'place-row';
      row.innerHTML =
        '<div class="place-photo">⭐</div>' +
        '<div class="place-body">' +
        `<div class="place-name">${esc(f.name)}</div>` +
        `<div class="place-meta"><span class="place-area">${esc(f.ghana_post_gps || f.note || '')}</span></div>` +
        '</div>' +
        `<button class="fav-del" title="Remove" data-id="${f.id}">✕</button>`;
      row.querySelector('.fav-del').onclick = async (e) => {
        e.stopPropagation();
        await api.del(`/api/favorites/${f.id}`);
        loadFavorites();
      };
      row.onclick = () => window.AM.navToCoords(f.lat, f.lng, f.name);
      list.appendChild(row);
    });
  } catch {
    list.innerHTML = '<div style="padding:10px;font-size:11px;color:var(--muted)">Could not load saved places.</div>';
  }
}

// Called from place popups (🔖 button) — opens save modal, or auth first.
export function savePlace(lat, lng, name) {
  if (!store.user) {
    showAuthModal();
    showInfo('Sign in to save places', 'Create a free account to keep your places', '');
    return;
  }
  store.pendingSave = { lat, lng, name };
  document.getElementById('saveName').value = name || '';
  document.getElementById('saveGps').value = '';
  const noteEl = document.getElementById('saveNote');
  if (noteEl) { noteEl.value = ''; noteEl.style.display = 'none'; }
  document.getElementById('saveError').classList.remove('show');
  setSaveLabel('fav');
  openModal('saveModal');
}

export async function submitSavePlace() {
  const errEl = document.getElementById('saveError');
  errEl.classList.remove('show');
  const name = document.getElementById('saveName').value.trim();
  const gps = document.getElementById('saveGps').value.trim();
  const noteEl = document.getElementById('saveNote');
  const note = noteEl ? noteEl.value.trim() : '';
  if (!store.pendingSave) return closeModal('saveModal');
  try {
    if (_saveLabel === 'home' || _saveLabel === 'work') {
      await api.put(`/api/saved/${_saveLabel}`, {
        name: name || store.pendingSave.name,
        lat: store.pendingSave.lat,
        lng: store.pendingSave.lng,
        place_type: _saveLabel,
        ghana_post_gps: gps || undefined,
      });
      await loadSavedSlots();
      showInfo(`🏠 ${_saveLabel.charAt(0).toUpperCase() + _saveLabel.slice(1)} saved!`, 'Find it in the favourites panel', 'ok');
    } else {
      await api.post('/api/favorites', {
        name: name || store.pendingSave.name,
        lat: store.pendingSave.lat,
        lng: store.pendingSave.lng,
        ghana_post_gps: gps || undefined,
        note: note || undefined,
      });
      await loadFavorites();
      showInfo('⭐ Saved!', 'Added to My Places', 'ok');
    }
    closeModal('saveModal');
    store.pendingSave = null;
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.add('show');
  }
}
