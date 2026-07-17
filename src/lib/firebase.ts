import { initializeApp } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Support both custom user project configuration and AI Studio default sandbox project
const metaEnv = (import.meta as any).env || {};
let hasCustomConfig = true; // Default to true as we are now using your custom my-taxi-app-b76f0 project!

let firebaseConfig = {
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || "my-taxi-app-b76f0",
  appId: metaEnv.VITE_FIREBASE_APP_ID || "1:1009592037554:web:89e484fc435b0171bdd9ab",
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || "AIzaSyC0frin5v_6TcBEceQGlqyW36A05Rs7S-0",
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || "my-taxi-app-b76f0.firebaseapp.com",
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || "my-taxi-app-b76f0.firebasestorage.app",
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || "1009592037554"
};

// Check for runtime custom config in localStorage
try {
  const localConfigStr = typeof window !== 'undefined' ? window.localStorage.getItem('CUSTOM_FIREBASE_CONFIG') : null;
  if (localConfigStr) {
    const localConfig = JSON.parse(localConfigStr);
    if (localConfig && localConfig.apiKey && localConfig.projectId) {
      firebaseConfig = {
        projectId: localConfig.projectId,
        appId: localConfig.appId || '',
        apiKey: localConfig.apiKey,
        authDomain: localConfig.authDomain || `${localConfig.projectId}.firebaseapp.com`,
        storageBucket: localConfig.storageBucket || `${localConfig.projectId}.firebasestorage.app`,
        messagingSenderId: localConfig.messagingSenderId || ''
      };
      hasCustomConfig = true;
    }
  }
} catch (e) {
  console.warn('[Firebase] Error reading/parsing custom localStorage config:', e);
}

const app = initializeApp(firebaseConfig);

// Set the correct Firestore database ID for the AI Studio premium sandbox
const dbId = "ai-studio-max-8c2c2304-5251-4eae-b3b7-9bbf375467a5";

// Initialize Firestore with custom settings to enforce long polling, bypassing iframe WebSocket limits
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
}, dbId);

const auth = getAuth(app);

export { app, db, auth };



