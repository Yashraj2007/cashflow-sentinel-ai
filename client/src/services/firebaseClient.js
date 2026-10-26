// ============================================================
// Firebase Web SDK Initialisation
// All Firebase services used by the client are exported here.
// ============================================================

import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// Firebase Auth
export const auth = getAuth(app);

// Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

// Firestore (for client-side writes if needed)
export const db = getFirestore(app);

// Helper: sign in with Google popup
export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

// Helper: sign out
export async function signOutFirebase() {
  await firebaseSignOut(auth);
}

// Helper: get current Firebase user
export function getCurrentFirebaseUser() {
  return auth.currentUser;
}

// Helper: listen to auth state changes
export function onFirebaseAuthStateChanged(callback) {
  return onAuthStateChanged(auth, callback);
}

export default app;
