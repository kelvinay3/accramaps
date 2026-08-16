const TOKEN_KEY = 'accramaps_token';

function getToken() { return localStorage.getItem(TOKEN_KEY); }

async function req(path) {
  const token = getToken();
  const res = await fetch(path, {
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

function timeAgo(iso) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (d < 1) return 'just now';
  if (d < 60) return `${d}m ago`;
  if (d < 1440) return `${Math.floor(d / 60)}h ago`;
  return `${Math.floor(d / 1440)}d ago`;
}

function timeLeft(iso) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'expired';
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m}m left`;
  return `${Math.floor(m / 60)}h left`;
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const TYPE_ICONS = {
  go_slow: '🚦', flood: '🌊', accident: '💥', pothole: '🕳️',
  police: '👮', roadblock: '🚧', diversion: '↪️', fire: '🔥',
  breakdown: '🚗', robbery: '⚠️',
};

async function loadDashboard() {
  try {
    const [stats, reps] = await Promise.all([
      req('/api/admin/stats'),
      req('/api/admin/reports'),
    ]);

    document.getElementById('statPlaces').textContent = stats.places ?? '—';
    document.getElementById('statUsers').textContent = stats.users ?? '—';
    document.getElementById('statTrotro').textContent = stats.trotro_routes ?? '—';
    document.getElementById('statActive').textContent = stats.active_reports ?? '—';

    const reports = reps.reports || [];
    document.getElementById('reportCount').textContent = reports.length;
    document.getElementById('lastRefreshed').textContent =
      'Refreshed at ' + new Date().toLocaleTimeString('en-GH', { hour: '2-digit', minute: '2-digit' });

    const tbody = document.getElementById('reportsBody');
    if (!reports.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty-row">No active incidents 🎉</td></tr>';
    } else {
      tbody.innerHTML = reports.map((r) => {
        const icon = TYPE_ICONS[r.type] || '📌';
        const desc = r.description ? `<br><span style="font-size:11px;color:var(--txt2)">${esc(r.description.slice(0, 60))}</span>` : '';
        return `<tr>
          <td><span class="rep-type">${icon} ${esc(r.label || r.type)}</span></td>
          <td><span class="rep-coord">${Number(r.lat).toFixed(4)}, ${Number(r.lng).toFixed(4)}</span>${desc}</td>
          <td><span class="rep-confirms">${r.confirms || 0}</span></td>
          <td><span class="rep-time">${timeAgo(r.created_at)}</span></td>
          <td><span class="rep-time">${r.expires_at ? timeLeft(r.expires_at) : '—'}</span></td>
        </tr>`;
      }).join('');
    }

    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('dashContent').style.display = 'block';
  } catch (err) {
    if (err.status === 403 || err.status === 401) {
      document.getElementById('loadingState').style.display = 'none';
      document.getElementById('deniedState').style.display = 'block';
    } else {
      document.getElementById('loadingState').innerHTML =
        `<div style="padding:40px;text-align:center;color:var(--muted)">
          Failed to load dashboard: ${esc(err.message)}<br>
          <button onclick="location.reload()" style="margin-top:16px;padding:8px 20px;background:var(--gh-green);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600">
            Retry
          </button>
        </div>`;
    }
  }
}

async function init() {
  if (!getToken()) {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('deniedState').style.display = 'block';
    return;
  }

  let user;
  try {
    const me = await req('/api/auth/me');
    user = me.user;
    const initials = (user.name || '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
    document.getElementById('userAvatar').textContent = initials;
    document.getElementById('userName').textContent = user.name;
    document.getElementById('userPill').style.display = 'flex';
  } catch {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('deniedState').style.display = 'block';
    return;
  }

  await loadDashboard();

  document.getElementById('refreshBtn').addEventListener('click', async () => {
    document.getElementById('dashContent').style.display = 'none';
    document.getElementById('loadingState').innerHTML = `
      <div class="admin-heading"><h1>Site Overview</h1><p>Refreshing…</p></div>
      <div class="stat-grid">
        ${[...Array(4)].map(() => `<div class="stat-card">
          <div class="skeleton" style="width:32px;height:22px;margin-bottom:14px;border-radius:6px"></div>
          <div class="skeleton sk-value"></div><div class="skeleton sk-label"></div>
        </div>`).join('')}
      </div>`;
    document.getElementById('loadingState').style.display = 'block';
    await loadDashboard();
  });
}

init();
