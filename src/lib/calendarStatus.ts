// Caches the doctor's Google Calendar connection status for a few minutes so
// navigating between doctor pages doesn't re-trigger a live Google API check
// (calendar-status validates the OAuth token against Google on every call,
// which is the slowest request on these pages).

const CACHE_KEY = "telepsych:calendarStatus";
const TTL_MS = 3 * 60 * 1000; // 3 minutes

type CachedStatus = { connected: boolean; cachedAt: number };

function readCache(): CachedStatus | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedStatus;
    if (typeof parsed.connected !== "boolean" || typeof parsed.cachedAt !== "number") return null;
    if (Date.now() - parsed.cachedAt > TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(connected: boolean) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ connected, cachedAt: Date.now() }));
  } catch {
    // ignore (private mode, storage disabled, etc.)
  }
}

export function invalidateCalendarStatusCache() {
  try {
    sessionStorage.removeItem(CACHE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Returns the doctor's Google Calendar connection status, using a short-lived
 * cache to avoid repeated live Google API checks across page loads.
 */
export async function getCalendarStatus(): Promise<boolean> {
  const cached = readCache();
  if (cached) return cached.connected;

  try {
    const res = await fetch("/api/auth/calendar-status", { credentials: "include" });
    if (!res.ok) {
      return false;
    }
    const data = await res.json();
    const connected = data.connected === true;
    writeCache(connected);
    return connected;
  } catch {
    return false;
  }
}
