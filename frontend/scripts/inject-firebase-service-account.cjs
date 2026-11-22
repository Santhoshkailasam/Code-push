const fs = require('fs');
const path = require('path');

try {
  const envVal = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (envVal && envVal.trim()) {
    const raw = envVal.trim();
    const parsed = raw.startsWith('{')
      ? JSON.parse(raw)
      : JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));

    const targetDir = path.resolve(__dirname, '../netlify/functions');
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    const targetFile = path.join(targetDir, 'firebase-service-account.json');
    fs.writeFileSync(targetFile, JSON.stringify(parsed), 'utf8');
    console.log('✅ [Build Pre-step] Injected firebase-service-account.json into netlify/functions for serverless bundling.');
  }
} catch (e) {
  console.warn('⚠️ [Build Pre-step] Could not parse/write FIREBASE_SERVICE_ACCOUNT:', e.message);
}
