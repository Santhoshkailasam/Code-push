const { getReleaseData, setReleaseData } = require('./store.cjs');
const { extractApiKey, verifyApiKey } = require('./auth.cjs');

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-codepush-api-key, x-api-key',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: JSON.stringify({ message: 'OK' }) };
  }

  const query = event.queryStringParameters || {};
  let parsedBody = {};
  if (event.body) {
    try {
      parsedBody = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } catch (e) {
      parsedBody = {};
    }
  }

  const requestedProjectId = query.projectId || parsedBody.projectId || null;
  const apiKey = extractApiKey(event, parsedBody);
  const auth = await verifyApiKey(apiKey, requestedProjectId);
  if (!auth.valid) {
    return {
      statusCode: auth.statusCode,
      headers,
      body: JSON.stringify({ error: auth.error }),
    };
  }

  const projectId = auth.projectId || requestedProjectId || 'default';

  try {
    const store = await getReleaseData();
    if (!store.remoteConfig) store.remoteConfig = {};
    if (!store.remoteConfig[projectId]) store.remoteConfig[projectId] = [];

    // GET: Retrieve remote config key/value flags
    if (event.httpMethod === 'GET') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          projectId,
          config: store.remoteConfig[projectId],
        }),
      };
    }

    // POST / PUT: Update or save remote config key/values
    if (event.httpMethod === 'POST' || event.httpMethod === 'PUT') {
      let body = {};
      try {
        body = typeof event.body === 'string' ? JSON.parse(event.body) : (event.body || {});
      } catch (e) {
        body = {};
      }

      if (Array.isArray(body.config)) {
        store.remoteConfig[projectId] = body.config;
      } else if (body.key) {
        // Upsert single key
        const existingIdx = store.remoteConfig[projectId].findIndex((item) => item.key === body.key);
        const newEntry = {
          key: String(body.key).trim(),
          value: body.value,
          type: body.type || typeof body.value,
          description: body.description || '',
          updatedAt: new Date().toISOString(),
        };

        if (existingIdx >= 0) {
          store.remoteConfig[projectId][existingIdx] = newEntry;
        } else {
          store.remoteConfig[projectId].push(newEntry);
        }
      }

      await setReleaseData(store);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Remote Config updated successfully',
          config: store.remoteConfig[projectId],
        }),
      };
    }

    // DELETE: Delete a key or clear config
    if (event.httpMethod === 'DELETE') {
      const keyToDelete = query.key;
      if (keyToDelete) {
        store.remoteConfig[projectId] = store.remoteConfig[projectId].filter((item) => item.key !== keyToDelete);
      } else {
        store.remoteConfig[projectId] = [];
      }

      await setReleaseData(store);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: `Key ${keyToDelete || 'all'} deleted`,
          config: store.remoteConfig[projectId],
        }),
      };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal Server Error', details: err.message }),
    };
  }
};
