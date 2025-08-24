import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

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
export default app;
