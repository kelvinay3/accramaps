export async function sendResetEmail({ to, name, resetUrl }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    // Dev fallback: log the link so you can test without email configured
    console.log(`[AccraMaps] Password reset link for ${to}:\n${resetUrl}`);
    return;
  }
  const from = process.env.EMAIL_FROM || 'AccraMaps <noreply@accramaps.com>';
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      from,
      to,
      subject: 'Reset your AccraMaps password',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 20px">
          <div style="text-align:center;margin-bottom:24px">
            <span style="font-size:32px">🗺️</span>
            <h2 style="color:#006B3F;margin:8px 0 0">AccraMaps</h2>
          </div>
          <p>Hi ${name},</p>
          <p>Click the button below to reset your password. This link expires in <strong>1 hour</strong>.</p>
          <div style="text-align:center;margin:28px 0">
            <a href="${resetUrl}" style="background:#006B3F;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;display:inline-block">
              Reset my password
            </a>
          </div>
          <p style="font-size:12px;color:#888">If the button doesn't work, copy this link:<br>${resetUrl}</p>
          <p style="font-size:12px;color:#888">If you didn't request this, you can safely ignore this email.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
          <p style="font-size:11px;color:#aaa;text-align:center">AccraMaps · Ghana's navigation app</p>
        </div>`,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error('[AccraMaps] Email send failed:', err);
  }
}
