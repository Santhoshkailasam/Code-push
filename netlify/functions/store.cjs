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
  try {
    await fetch(FIREBASE_DB_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  } catch (err) {
    console.warn('[CodePush Store] Firebase save error:', err.message);
  }
}

module.exports = { getReleaseData, setReleaseData };
