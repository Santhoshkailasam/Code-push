const { getStore } = require('@netlify/blobs');
const initialVersionData = require('../../version.json');

async function getReleaseData() {
  try {
    const store = getStore('codepush_releases');
    const data = await store.get('latest_releases', { type: 'json' });
    if (data) return data;
  } catch (err) {
    console.warn('[CodePush Store] Blob fetch fallback to version.json:', err.message);
  }
  return initialVersionData;
}

async function setReleaseData(data) {
  try {
    const store = getStore('codepush_releases');
    await store.setJSON('latest_releases', data);
  } catch (err) {
    console.warn('[CodePush Store] Blob save fallback:', err.message);
  }
}

module.exports = { getReleaseData, setReleaseData };
