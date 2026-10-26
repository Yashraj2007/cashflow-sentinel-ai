/**
 * AuthContext.jsx — Real Firebase Authentication
 *
 * Uses Firebase Google Sign-In. On authentication change:
 *  1. Calls POST /api/auth/login with the Firebase ID token
 *  2. Backend creates/fetches the user + business in Firestore
 *  3. Returns businessId which is stored in context
 */

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  auth,
  signInWithGoogle,
  signOutFirebase,
  onFirebaseAuthStateChanged,
} from "../services/firebaseClient.js";
import { authApi } from "../services/apiClient.js";

const AuthContext = createContext(null);

const ONBOARD_KEY = "cashflow-sentinel-onboarded-v1";
const PROFILE_KEY = "cashflow-sentinel-profile-v2";

function loadOnboarded() {
  try { return localStorage.getItem(ONBOARD_KEY) === "true"; }
  catch { return false; }
}

function saveOnboarded(val) {
  try { localStorage.setItem(ONBOARD_KEY, val ? "true" : "false"); }
  catch { /* ignore */ }
}

function saveProfile(profile) {
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); }
  catch { /* ignore */ }
}

function loadProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null); // Firebase User object
  const [profile, setProfile] = useState(() => loadProfile()); // { uid, email, name, businessId }
  const [onboarded, setOnboarded] = useState(false);
  const [loading, setLoading] = useState(true); // true while Firebase initialises

  // ── Listen to Firebase auth state ──────────────────────────────────────────
  useEffect(() => {
    const unsub = onFirebaseAuthStateChanged(async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        // User is signed in — try to fetch/create backend profile
        try {
          const idToken = await fbUser.getIdToken();
          const backendProfile = await authApi.login(idToken, fbUser.displayName);
          const merged = {
            uid: backendProfile.uid || fbUser.uid,
            email: backendProfile.email || fbUser.email,
            name: backendProfile.name || fbUser.displayName,
            photoURL: fbUser.photoURL,
            businessId: backendProfile.businessId,
            avatarInitials: (backendProfile.name || fbUser.displayName || "U")
              .split(" ")
              .map((w) => w[0])
              .slice(0, 2)
              .join("")
              .toUpperCase(),
          };
          setProfile(merged);
          saveProfile(merged);
          // Mark as onboarded if we already have a businessId from the backend
          if (merged.businessId) {
            setOnboarded(loadOnboarded() || true);
            saveOnboarded(true);
          } else {
            setOnboarded(loadOnboarded());
          }
        } catch (err) {
          console.warn("Backend login sync failed (offline?):", err.message);
          // Fall back to cached profile or basic Firebase info
          const cached = loadProfile();
          if (cached && cached.uid === fbUser.uid) {
            setProfile(cached);
            setOnboarded(loadOnboarded());
          } else {
            setProfile({
              uid: fbUser.uid,
              email: fbUser.email,
              name: fbUser.displayName || fbUser.email,
              photoURL: fbUser.photoURL,
              businessId: null,
              avatarInitials: (fbUser.displayName || fbUser.email || "U")
                .split(" ")
                .map((w) => w[0])
                .slice(0, 2)
                .join("")
                .toUpperCase(),
            });
            setOnboarded(false);
          }
        }
      } else {
        // User signed out
        setProfile(null);
        setOnboarded(false);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  // ── Sign in with Google ────────────────────────────────────────────────────
  const signIn = useCallback(async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      // Auth state change is handled by onFirebaseAuthStateChanged above
    } catch (err) {
      setLoading(false);
      throw err;
    }
  }, []);

  // ── Sign out ───────────────────────────────────────────────────────────────
  const signOut = useCallback(async () => {
    try {
      await signOutFirebase();
    } catch { /* ignore */ }
    setProfile(null);
    setFirebaseUser(null);
    setOnboarded(false);
    saveOnboarded(false);
    try { localStorage.removeItem(PROFILE_KEY); } catch { /* ignore */ }
  }, []);

  // ── Complete onboarding (called after wizard finishes) ────────────────────
  const completeOnboarding = useCallback((profilePatch = {}) => {
    setProfile((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...profilePatch };
      saveProfile(updated);
      return updated;
    });
    setOnboarded(true);
    saveOnboarded(true);
  }, []);

  // ── Reset onboarding ──────────────────────────────────────────────────────
  const resetOnboarding = useCallback(() => {
    setOnboarded(false);
    saveOnboarded(false);
  }, []);

  // ── Update businessId in profile (called after onboarding creates business) ─
  const setBusinessId = useCallback((businessId) => {
    setProfile((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, businessId };
      saveProfile(updated);
      return updated;
    });
  }, []);

  // ── Enter Demo mode instantly ─────────────────────────────────────────────
  const enterDemo = useCallback(() => {
    const demoProfile = {
      uid: "usr_demo",
      email: "accounts@navkartraders.in",
      name: "Ramesh Navkar",
      photoURL: null,
      businessId: "navkar",
      avatarInitials: "RN",
    };
    setProfile(demoProfile);
    saveProfile(demoProfile);
    setOnboarded(true);
    saveOnboarded(true);
  }, []);

  const value = {
    user: profile,          // { uid, email, name, photoURL, businessId, avatarInitials }
    firebaseUser,           // Raw Firebase User object (has .getIdToken())
    loading,
    isAuthenticated: !!profile,
    onboarded,
    signIn,
    signOut,
    enterDemo,
    completeOnboarding,
    resetOnboarding,
    setBusinessId,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
