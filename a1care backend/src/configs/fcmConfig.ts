/**
 * fcmConfig.ts
 * Initializes Firebase Admin SDK using the service-account JSON credentials
 * stored in data/firebase-service-account.json  OR  individual env-vars.
 *
 * The admin panel writes firebase credentials to data/app-config.json (JS SDK
 * / mobile keys).  The SERVER-SIDE service-account key is different — it must
 * be downloaded from Firebase Console → Project Settings → Service Accounts.
 * Store it at:  a1care backend/data/firebase-service-account.json
 */

import admin from "firebase-admin";
import { promises as fs } from "fs";
import path from "path";

const SERVICE_ACCOUNT_PATH = path.join(
    process.cwd(),
    "data",
    "firebase-service-account.json"
);

let fcmApp: admin.app.App | null = null;

export const initFCM = async (): Promise<void> => {
    // Already initialized
    if (admin.apps.length > 0) {
        fcmApp = admin.apps[0]!;
        return;
    }

    // NEW: Check dynamic system store (app-config.json) first
    try {
        const { readConfigStore } = await import("../modules/Admin/admin.controller.js");
        const store = await readConfigStore();
        if (store.system?.projectId && store.system?.firebase?.clientEmail && store.system?.firebase?.privateKey) {
            fcmApp = admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: store.system.projectId,
                    clientEmail: store.system.firebase.clientEmail,
                    privateKey: store.system.firebase.privateKey.replace(/\\n/g, "\n"),
                }),
            });
            console.log("[FCM] Initialized from dynamic system configuration.");
            return;
        }
    } catch (err) {
        // Fall through to other methods
    }

    // Option A: JSON file on disk (preferred for production)
    try {
        await fs.access(SERVICE_ACCOUNT_PATH);
        const raw = await fs.readFile(SERVICE_ACCOUNT_PATH, "utf-8");
        const serviceAccount = JSON.parse(raw);
        fcmApp = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
        console.log("[FCM] Initialized from service-account JSON.");
        return;
    } catch {
        // file not found — fall through to env-vars
    }

    // Option B: individual env-vars (CI/CD / hosting without file access)
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (projectId && clientEmail && privateKey) {
        fcmApp = admin.initializeApp({
            credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
        });
        console.log("[FCM] Initialized from environment variables.");
        return;
    }

    console.warn(
        "[FCM] WARNING: Firebase Admin not initialized. " +
        "Please provide credentials in System Settings (Admin Panel) or place firebase-service-account.json in /data."
    );
};

export const getMessaging = (): admin.messaging.Messaging | null => {
    if (!fcmApp) return null;
    try {
        return admin.messaging(fcmApp);
    } catch {
        return null;
    }
};
