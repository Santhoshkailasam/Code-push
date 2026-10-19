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
  const { bundles, ...lightweightStore } = data;
  const promises = [
    fetch(FIREBASE_DB_URL, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lightweightStore)
    })
  ];

  if (bundles && Object.keys(bundles).length > 0) {
    const BUNDLES_DB_URL = 'https://tracker-42b47-default-rtdb.asia-southeast1.firebasedatabase.app/codepush_releases/bundles.json';
    promises.push(
      fetch(BUNDLES_DB_URL, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bundles)
      })
    );
  }

  const results = await Promise.all(promises);
  for (const res of results) {
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Firebase RTDB write failed (HTTP ${res.status}): ${errorText}`);
    }
  }
}

module.exports = { getReleaseData, setReleaseData };
