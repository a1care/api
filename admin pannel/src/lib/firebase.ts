/**
 * firebase.ts
 *
 * Firebase is initialized with hardcoded credentials (the source of truth
 * that matches data/app-config.json on the backend).
 *
 * The admin panel can update those credentials via:
 *   GET  /admin/firebase-config  → read current credentials
 *   PUT  /admin/firebase-config  → update credentials (saved to data/app-config.json)
 *
 * Changes saved from the admin panel take effect on the NEXT app restart,
 * since firebase is initialized once at module load.
 */

import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

// ── Hardcoded defaults (always-valid fallback) ────────────────────────────────
const firebaseConfig = {
    apiKey: "AIzaSyC4OkQrUi2FGx0hIV0fjDyD0Hwv7tQoo8w",
    authDomain: "a1carewebsite.firebaseapp.com",
    projectId: "a1carewebsite",
    storageBucket: "a1carewebsite.firebasestorage.app",
    messagingSenderId: "742774308338",
    appId: "1:742774308338:web:a4b403b3ded90987d57f6b",
    measurementId: "G-ZSZKQTXE94",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export { app, analytics, firebaseConfig };
