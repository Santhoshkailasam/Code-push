/**
 * Custom CodePush CLI Bundler
 * Usage: node scripts/bundle-and-push.js --platform=android --version=1.0.1
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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
  console.log(`✨ Ready to upload to Netlify Dashboard!`);

} catch (err) {
  console.error(`❌ Bundling failed:`, err);
  process.exit(1);
}
