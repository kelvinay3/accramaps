const TOKEN_KEY = 'accramaps_token';

function getToken() { return localStorage.getItem(TOKEN_KEY); }
function setToken(t) { localStorage.setItem(TOKEN_KEY, t); }

async function req(path, opts = {}) {
  const token = getToken();
  const res = await fetch(path, {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...opts,
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
  breakdown: '🚗', robbery: '⚠️', closure: '🚧', fuel_queue: '⛽',
};

function renderAnalytics(a) {
  const rate = a.onboardViews > 0 ? Math.round((a.onboardDone / a.onboardViews) * 100) : 0;
  document.getElementById('analyticsSection').innerHTML = `
    <div class="adm-sec" style="margin-top:32px">
      <div class="adm-sec-title">📊 Analytics — Last 7 Days</div>
      <span class="adm-count">live</span>
    </div>
    <div class="stat-grid analytics-grid">
      <div class="stat-card">
        <div class="stat-icon">👁</div>
        <div class="stat-value" style="color:var(--gh-green)">${a.pageViews ?? 0}</div>
        <div class="stat-label">Page Views (7d)</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🌐</div>
        <div class="stat-value" style="color:var(--gh-gold)">${a.uniqueSessions ?? 0}</div>
        <div class="stat-label">Sessions Today</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🎉</div>
        <div class="stat-value" style="color:var(--gh-red)">${a.signups ?? 0}</div>
        <div class="stat-label">New Signups (7d)</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🧭</div>
        <div class="stat-value" style="color:var(--txt)">${a.logins ?? 0}</div>
        <div class="stat-label">Logins (7d)</div>
      </div>
    </div>
    <div class="adm-sec" style="margin-top:24px">
      <div class="adm-sec-title">🎯 Onboarding Funnel</div>
      <span class="adm-count">${rate}% completion</span>
    </div>
    <div style="background:var(--surf);border:1.5px solid var(--s3);border-radius:14px;padding:20px;margin-bottom:28px;box-shadow:var(--shadow)">
      <div style="display:flex;gap:20px;align-items:center;flex-wrap:wrap">
        <div style="text-align:center;min-width:80px">
          <div style="font-family:'JetBrains Mono',monospace;font-size:28px;font-weight:700;color:var(--txt)">${a.onboardViews ?? 0}</div>
          <div style="font-size:10px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.8px;margin-top:3px">Popup Shown</div>
        </div>
        <div style="font-size:20px;color:var(--s4)">→</div>
        <div style="text-align:center;min-width:80px">
          <div style="font-family:'JetBrains Mono',monospace;font-size:28px;font-weight:700;color:var(--gh-green)">${a.onboardDone ?? 0}</div>
          <div style="font-size:10px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.8px;margin-top:3px">Completed</div>
        </div>
        <div style="flex:1;min-width:120px">
          <div style="height:8px;background:var(--s3);border-radius:100px;overflow:hidden">
            <div style="height:100%;width:${rate}%;background:linear-gradient(90deg,var(--gh-green),var(--gh-gold));border-radius:100px;transition:width .8s ease"></div>
          </div>
          <div style="font-size:10px;color:var(--muted);margin-top:4px">${rate}% of users who see the popup complete it</div>
        </div>
      </div>
    </div>
    ${(a.topSearches?.length > 0) ? `
    <div class="adm-sec">
      <div class="adm-sec-title">🔍 Top Searches (7d)</div>
      <span class="adm-count">${a.topSearches.length}</span>
    </div>
    <div class="reports-wrap" style="margin-bottom:28px">
      <table class="reports-table">
        <thead><tr><th>#</th><th>Search Query</th><th>Times</th></tr></thead>
        <tbody>
          ${a.topSearches.map((s, i) => `<tr>
            <td style="color:var(--muted);font-family:'JetBrains Mono',monospace">${i + 1}</td>
            <td style="font-weight:600;color:var(--txt)">${esc(s.q)}</td>
            <td><span class="rep-confirms">${s.n}</span></td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>` : '<p style="color:var(--muted);font-size:12px;margin-bottom:24px">No search data yet — analytics start collecting from today.</p>'}
  `;
}

async function loadDashboard() {
  try {
    const [stats, reps, analytics] = await Promise.all([
      req('/api/admin/stats'),
      req('/api/admin/reports'),
      req('/api/admin/analytics').catch(() => null),
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

    if (analytics) renderAnalytics(analytics);

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

async function doAdminLogin() {
  const email = document.getElementById('adminEmail').value.trim();
  const password = document.getElementById('adminPassword').value;
  const errEl = document.getElementById('adminLoginErr');
  errEl.style.display = 'none';
  if (!email || !password) { errEl.textContent = 'Email and password required'; errEl.style.display = 'block'; return; }
  try {
    const data = await req('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setToken(data.token);
    document.getElementById('deniedState').style.display = 'none';
    document.getElementById('loadingState').style.display = 'block';
    await init();
  } catch (err) {
    errEl.textContent = err.message || 'Login failed';
    errEl.style.display = 'block';
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

// Wire up inline login form in denied state
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('adminLoginBtn');
  if (btn) btn.addEventListener('click', doAdminLogin);
  const pw = document.getElementById('adminPassword');
  if (pw) pw.addEventListener('keydown', (e) => { if (e.key === 'Enter') doAdminLogin(); });
});

init();
