const initialVersionData = require('../../version.json');
const FIREBASE_DB_URL = 'https://tracker-42b47-default-rtdb.asia-southeast1.firebasedatabase.app/codepush_releases.json';

async function getReleaseData() {
  try {
    const res = await fetch(FIREBASE_DB_URL);
    if (res.ok) {
      const data = await res.json();
      if (data && data.android) return data;
    }
  } catch (err) {
    console.warn('[CodePush Store] Firebase fetch error:', err.message);
  }
  return initialVersionData;
}

async function setReleaseData(data) {
  // Exclude large binary bundles from metadata update so Netlify serverless saves in <100ms without timing out
  const { bundles, ...lightweightStore } = data;
  const res = await fetch(FIREBASE_DB_URL, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(lightweightStore)
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Firebase RTDB write failed (HTTP ${res.status}): ${errorText}`);
  }
}

module.exports = { getReleaseData, setReleaseData };
