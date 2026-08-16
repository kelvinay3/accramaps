import { api } from './api.js';

const LEVEL_COLORS = { heavy: '#DC2626', moderate: '#D97706', light: '#16A34A' };

export async function updateWeather() {
  try {
    const w = await api.get('/api/city/weather');
    document.getElementById('wIco').textContent = w.icon;
    document.getElementById('wTemp').textContent = `${w.temp_c}°C`;
    document.getElementById('wDesc').textContent = `${w.description} · Accra`;
    document.getElementById('wExtra').textContent = w.extra;
  } catch { /* leave last values */ }
}

export async function updateTraffic() {
  try {
    const t = await api.get('/api/city/traffic');
    document.getElementById('tDot').style.background = LEVEL_COLORS[t.level] || '#16A34A';
    document.getElementById('tLbl').textContent = t.label;
    document.getElementById('tDetail').textContent = t.active_reports > 0
      ? `${t.detail} · ${t.active_reports} live report${t.active_reports === 1 ? '' : 's'}`
      : t.detail;
  } catch { /* leave last values */ }
}

export async function updateVibe() {
  try {
    const v = await api.get('/api/city/vibe');
    document.getElementById('vibeScore').textContent = v.score.toFixed(1);
    document.getElementById('vibeFill').style.width = `${(v.score / 10) * 100}%`;
    document.getElementById('vibeSub').textContent =
      `${v.label} · ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    if (v.detty_december) document.getElementById('dettyBanner').classList.add('on');
  } catch { /* leave last values */ }
}

export function startWidgetTimers() {
  updateWeather();
  updateTraffic();
  updateVibe();
  setInterval(updateWeather, 10 * 60_000);
  setInterval(updateTraffic, 60_000);
  setInterval(updateVibe, 5 * 60_000);
}
