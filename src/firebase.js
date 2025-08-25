import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';

// Firebase web app configuration
const firebaseConfig = {
  apiKey: "AIzaSyDaOW67xk6M373a_mblBfYqzwSg77gPLw4",
  authDomain: "restroom-tracker-c16a4.firebaseapp.com",
  projectId: "restroom-tracker-c16a4",
  storageBucket: "restroom-tracker-c16a4.firebasestorage.app",
  messagingSenderId: "917504164761",
  appId: "1:917504164761:web:8133bcc5c0f4cc17bc0908",
  measurementId: "G-5X47ETGYTF"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// --- Anonymous Auth so Firestore rules can require request.auth != null ---
export const auth = getAuth(app);

// Resolve when an auth user is available
export const authReady = new Promise((resolve) => {
  onAuthStateChanged(auth, (user) => {
    if (user) resolve(user);
  });
});

// Kick off anonymous sign-in
signInAnonymously(auth).catch((e) => {
  console.warn('Anonymous auth failed', e);
});

export default app;

/* Firestore Rules (set in Firebase Console -> Firestore -> Rules):
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Require *some* auth (anonymous is fine)
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
    // Or narrow to your collection only:
    // match /rt_logs/{docId} { allow read, write: if request.auth != null; }
  }
}
*/
