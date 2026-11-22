const initialVersionData = require('../../version.json');
const DB_BASE = 'https://tracker-42b47-default-rtdb.asia-southeast1.firebasedatabase.app/codepush_releases';

async function getReleaseData() {
  try {
    const promises = [
      fetch(`${DB_BASE}/android.json`, { signal: AbortSignal.timeout(2500) }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`${DB_BASE}/ios.json`, { signal: AbortSignal.timeout(2500) }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`${DB_BASE}/projects.json`, { signal: AbortSignal.timeout(2500) }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`${DB_BASE}/keys.json`, { signal: AbortSignal.timeout(2500) }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`${DB_BASE}/alerts.json`, { signal: AbortSignal.timeout(2500) }).then(r => r.ok ? r.json() : null).catch(() => null),
    ];
    const [android, ios, projects, keys, alerts] = await Promise.all(promises);
    return {
      ...initialVersionData,
      android: android || initialVersionData.android,
      ios: ios || initialVersionData.ios,
      projects: projects || initialVersionData.projects || {},
      keys: keys || initialVersionData.keys || {},
      alerts: alerts || initialVersionData.alerts || {},
    };
  } catch (err) {
    console.warn('[CodePush Store] Firebase fetch error:', err.message);
    return initialVersionData;
  }
}

async function setReleaseData(data) {
  const { bundles, ...lightweightStore } = data;
  const promises = [];

  if (lightweightStore.android) {
    promises.push(fetch(`${DB_BASE}/android.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lightweightStore.android)
    }));
  }
  if (lightweightStore.ios) {
    promises.push(fetch(`${DB_BASE}/ios.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lightweightStore.ios)
    }));
  }
  if (lightweightStore.projects) {
    promises.push(fetch(`${DB_BASE}/projects.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lightweightStore.projects)
    }));
  }
  if (lightweightStore.keys) {
    promises.push(fetch(`${DB_BASE}/keys.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lightweightStore.keys)
    }));
  }
  if (lightweightStore.alerts) {
    promises.push(fetch(`${DB_BASE}/alerts.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lightweightStore.alerts)
    }));
  }

  if (bundles && Object.keys(bundles).length > 0) {
    promises.push(
      fetch(`${DB_BASE}/bundles.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bundles)
      })
    );
  }

  await Promise.allSettled(promises);
}

module.exports = { getReleaseData, setReleaseData };

