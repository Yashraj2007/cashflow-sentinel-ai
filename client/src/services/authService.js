/**
 * authService.js
 * Demo authentication abstraction for CashFlow Sentinel AI.
 *
 * IMPORTANT: This is DEMO mode only. No real Google OAuth, Firebase, or Auth0
 * is connected. Sign-in stores a synthetic user locally for testing purposes.
 * For production, replace signInDemo() with a real OAuth flow and never expose
 * OAuth secrets in frontend code.
 *
 * Required environment variables for real Google OAuth (not used in demo):
 *   VITE_GOOGLE_CLIENT_ID — your Google OAuth 2.0 client ID
 *   Authorised redirect URI — must be registered in Google Cloud Console
 */

const AUTH_KEY = "cashflow-sentinel-auth-v1";

/**
 * The shape of a stored auth user.
 * @typedef {{ name: string, email: string, avatarInitials: string, demoMode: true, signedInAt: string }} AuthUser
 */

/**
 * Returns the currently stored auth user, or null if not signed in.
 * @returns {AuthUser|null}
 */
export function getUser() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Returns true if a demo user is currently signed in.
 * @returns {boolean}
 */
export function isAuthenticated() {
  return getUser() !== null;
}

/**
 * Signs in a demo user. Does NOT contact Google or any external service.
 * The returned user is clearly flagged as demoMode: true.
 *
 * @param {{ name?: string, email?: string }} [overrides] — optional name/email to display
 * @returns {AuthUser}
 */
export function signInDemo(overrides = {}) {
  const name = overrides.name || "Demo Owner";
  const email = overrides.email || "demo@cashflow-sentinel.local";
  const user = {
    name,
    email,
    avatarInitials: name
      .split(" ")
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase(),
    demoMode: true,
    signedInAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(AUTH_KEY, JSON.stringify(user));
  } catch {
    /* storage unavailable — auth stays in memory */
  }
  return user;
}

/**
 * Signs out the current user and clears the stored auth record.
 */
export function signOut() {
  try {
    localStorage.removeItem(AUTH_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Updates the stored user's name/email after onboarding.
 * @param {{ name?: string, email?: string }} patch
 * @returns {AuthUser|null}
 */
export function updateUser(patch) {
  const current = getUser();
  if (!current) return null;
  const updated = { ...current, ...patch };
  updated.avatarInitials = updated.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  try {
    localStorage.setItem(AUTH_KEY, JSON.stringify(updated));
  } catch {
    /* ignore */
  }
  return updated;
}
