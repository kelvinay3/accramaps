export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

export function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

export function fmtKm(meters) {
  return meters >= 1000 ? (meters / 1000).toFixed(1) : (meters / 1000).toFixed(2);
}

export function fmtDist(meters) {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
}

export function timeAgo(isoUtc) {
  // SQLite datetime('now') is UTC without a zone suffix — normalize.
  const iso = /Z|[+-]\d\d:\d\d$/.test(isoUtc) ? isoUtc : isoUtc.replace(' ', 'T') + 'Z';
  const secs = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return 'just now';
  if (secs < 3600) return `${Math.floor(secs / 60)} min ago`;
  return `${Math.floor(secs / 3600)}h ago`;
}
