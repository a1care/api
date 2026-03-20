import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

let serviceAccount: any;
try {
  // 1. Try to load from Environment Variable (Best for Vercel/Production)
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } 
  // 2. Fallback to physical file (Local development)
  else {
    const rootPath = path.resolve(process.cwd(), 'src/configs/firebaseServiceAccount.json');
    if (fs.existsSync(rootPath)) {
      serviceAccount = JSON.parse(fs.readFileSync(rootPath, 'utf8'));
    } else {
      const distPath = path.resolve(process.cwd(), 'configs/firebaseServiceAccount.json');
      if (fs.existsSync(distPath)) {
        serviceAccount = JSON.parse(fs.readFileSync(distPath, 'utf8'));
      } else {
        serviceAccount = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'firebaseServiceAccount.json'), 'utf8'));
      }
    }
  }
} catch (error) {
  console.error('[Firebase Admin] Failed to load firebaseServiceAccount.json:', error);
}

if (serviceAccount && !admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } catch (err) {
    console.error('[Firebase Admin] Initialization error:', err);
  }
}

export default admin;
