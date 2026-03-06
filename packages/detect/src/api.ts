/**
 * Analytics event reporter and API key validator.
 * Fire-and-forget — analytics must never throw or block.
 */

const API_BASE = 'https://api.ioswebble.com';

export function reportEvent(apiKey: string, event: string, data?: Record<string, unknown>): void {
  if (!apiKey) return;
  try {
    fetch(`${API_BASE}/v1/events?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        events: [{
          event,
          data: { origin: location.hostname, ua: navigator.userAgent, ...data },
          timestamp: Date.now(),
        }],
      }),
      keepalive: true,
    }).catch(() => {});
  } catch { /* analytics must never throw */ }
}

export async function validateApiKey(
  apiKey: string,
): Promise<{ operatorId: string; appName: string | null; plan: string } | null> {
  try {
    const res = await fetch(`${API_BASE}/v1/config?key=${encodeURIComponent(apiKey)}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
