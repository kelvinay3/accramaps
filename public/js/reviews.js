import { api } from './api.js';
import { store } from './state.js';
import { esc } from './util.js';
import { openModal, showInfo } from './ui.js';

let _placeId = null;

function starsHtml(rating) {
  const r = Math.round(rating || 0);
  return [1, 2, 3, 4, 5].map((i) =>
    `<span style="color:${i <= r ? '#F59E0B' : 'var(--s4)'}">★</span>`
  ).join('');
}

function timeAgo(iso) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d < 1) return 'today';
  if (d === 1) return 'yesterday';
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-GH', { month: 'short', year: 'numeric' });
}

export async function openReviewModal(placeId, placeName) {
  _placeId = placeId;
  document.getElementById('rvPlaceName').textContent = placeName;
  document.getElementById('rvAvg').innerHTML = '';
  document.getElementById('rvList').innerHTML =
    '<div class="loading-row"><div class="spinner"></div>Loading reviews…</div>';
  document.getElementById('rvForm').style.display = store.user ? 'block' : 'none';
  document.getElementById('rvSignIn').style.display = store.user ? 'none' : 'block';
  resetForm();
  openModal('reviewModal');
  await refresh(placeId);
}

async function refresh(placeId) {
  try {
    const data = await api.get(`/api/reviews?place_id=${placeId}`);
    renderAvg(data.avg);
    renderList(data.reviews || []);
  } catch {
    document.getElementById('rvList').innerHTML =
      '<div style="padding:10px 0;font-size:11px;color:var(--muted)">Could not load reviews.</div>';
  }
}

function renderAvg(avg) {
  const el = document.getElementById('rvAvg');
  if (avg?.avg) {
    el.innerHTML =
      `<span class="rv-big-score">${avg.avg}</span>` +
      `<span class="rv-big-stars">${starsHtml(avg.avg)}</span>` +
      `<span class="rv-count">${avg.count} review${avg.count === 1 ? '' : 's'}</span>`;
  } else {
    el.innerHTML = '<span class="rv-count">No reviews yet — be the first!</span>';
  }
}

function renderList(reviews) {
  const el = document.getElementById('rvList');
  if (!reviews.length) {
    el.innerHTML = '<div class="rv-empty">No reviews yet.</div>';
    return;
  }
  el.innerHTML = '';
  reviews.forEach((r) => {
    const d = document.createElement('div');
    d.className = 'review-row';
    d.innerHTML =
      `<div class="rv-header">` +
      `<span class="rv-name">${esc(r.users?.name || r.user_name || 'Anonymous')}</span>` +
      `<span class="rv-stars">${starsHtml(r.rating)}</span>` +
      `<span class="rv-date">${timeAgo(r.created_at)}</span>` +
      `</div>` +
      (r.body ? `<div class="rv-body">${esc(r.body)}</div>` : '');
    el.appendChild(d);
  });
}

export function pickStar(n) {
  document.getElementById('rvRating').value = n;
  document.querySelectorAll('.star-pick').forEach((s) => {
    s.classList.toggle('on', Number(s.dataset.v) <= n);
  });
}

export async function submitReview() {
  const rating = parseInt(document.getElementById('rvRating').value);
  const body = document.getElementById('rvText').value.trim();
  const errEl = document.getElementById('rvError');
  errEl.classList.remove('show');
  if (!rating) {
    errEl.textContent = 'Tap a star to rate';
    errEl.classList.add('show');
    return;
  }
  try {
    await api.post('/api/reviews', { place_id: _placeId, rating, body: body || undefined });
    showInfo('⭐ Review submitted!', 'Thanks for helping the AccraMaps community', 'ok');
    resetForm();
    await refresh(_placeId);
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.add('show');
  }
}

function resetForm() {
  document.getElementById('rvRating').value = '0';
  document.getElementById('rvText').value = '';
  document.getElementById('rvError').classList.remove('show');
  document.querySelectorAll('.star-pick').forEach((s) => s.classList.remove('on'));
}
