// Minimal analytics client — logs events to /api/analytics
// Session ID is persisted in localStorage for the browser session

function getSessionId() {
  let sid = sessionStorage.getItem('am_sid');
  if (!sid) {
    sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem('am_sid', sid);
  }
  return sid;
}

export function logEvent(event, payload) {
  try {
    fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, payload, session_id: getSessionId() }),
      keepalive: true,
    }).catch(() => {});
  } catch { /* never break the app */ }
}
