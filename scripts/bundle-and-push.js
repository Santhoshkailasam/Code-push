/**
 * Custom CodePush CLI Bundler
 * Usage: node scripts/bundle-and-push.js --platform=android --version=1.0.1
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, val] = arg.replace(/^--/, '').split('=');
  acc[key] = val;
  return acc;
}, {});

const platform = args.platform || 'android';
const version = args.version || '1.0.1';
const outputDir = path.join(__dirname, '../dist-bundles');

console.log(`🚀 Packaging CodePush bundle for [${platform.toUpperCase()}] v${version}...`);

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const bundleFileName = `index.${platform}.bundle`;
const bundlePath = path.join(outputDir, bundleFileName);
const zipPath = path.join(outputDir, `${platform}-v${version}.zip`);

try {
  // Step 1: Create dummy/mock bundle file for testing
  fs.writeFileSync(bundlePath, `// CodePush Bundle ${platform} v${version}\nconsole.log("OTA Update Loaded!");`);
  
  // Step 2: Compute SHA256 checksum
  const fileBuffer = fs.readFileSync(bundlePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  const hexHash = hashSum.digest('hex');

  console.log(`✅ Bundle created successfully.`);
  console.log(`🔑 SHA256 Hash: ${hexHash}`);
  console.log(`📦 Bundle File: ${bundlePath}`);

  // Step 3: Create assets folder simulation
  const assetsDir = path.join(outputDir, 'assets');
  const localesDir = path.join(outputDir, 'locales');
  if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });
  if (!fs.existsSync(localesDir)) fs.mkdirSync(localesDir, { recursive: true });

  fs.writeFileSync(path.join(localesDir, 'en.json'), JSON.stringify({ welcome: 'Hello', version }));
  fs.writeFileSync(path.join(localesDir, 'es.json'), JSON.stringify({ welcome: 'Hola', version }));

  console.log(`🌐 Packaged 2 localization files (en, es).`);
  console.log(`✨ Package ready for upload or CLI deployment!`);

} catch (err) {
  console.error(`❌ Bundling failed:`, err);
  process.exit(1);
}
