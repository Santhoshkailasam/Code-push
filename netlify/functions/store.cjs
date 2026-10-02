const initialVersionData = require('../../version.json');

let memoryStore = {
  android: initialVersionData.android,
  ios: initialVersionData.ios,
  history: initialVersionData.history || []
};

async function getReleaseData() {
  try {
    const { getStore } = require('@netlify/blobs');
    const store = getStore('codepush_releases');
    const data = await store.get('latest_releases', { type: 'json' });
    if (data) {
      memoryStore = data;
      return data;
    }
  } catch (err) {
    // Memory store fallback
  }
  return memoryStore;
}

async function setReleaseData(data) {
  memoryStore = data;
  try {
    const { getStore } = require('@netlify/blobs');
    const store = getStore('codepush_releases');
    await store.setJSON('latest_releases', data);
  } catch (err) {
    // Memory store fallback
  }
}

module.exports = { getReleaseData, setReleaseData };
