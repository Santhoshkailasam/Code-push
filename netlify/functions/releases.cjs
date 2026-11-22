const { getReleaseData } = require('./store.cjs');
const { extractApiKey, verifyApiKey } = require('./auth.cjs');

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-codepush-api-key, x-api-key',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: JSON.stringify({ message: 'OK' }) };
  }

  const method = event.httpMethod;

  if (method === 'GET') {
    const requestedProjectId = event.queryStringParameters?.projectId || null;
    const apiKey = extractApiKey(event);
    const auth = await verifyApiKey(apiKey, requestedProjectId);
    if (!auth.valid) {
      return {
        statusCode: auth.statusCode,
        headers,
        body: JSON.stringify({ error: auth.error }),
      };
    }

    const store = await getReleaseData();
    const effectiveProjectId = requestedProjectId || auth.projectId;

    if (auth.isMaster && !effectiveProjectId) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(store),
      };
    }

    const scopedStore = {
      projectId: effectiveProjectId,
      android:
        (store.keys?.[apiKey]?.android) ||
        (effectiveProjectId && store.projects?.[effectiveProjectId]?.android) ||
        null,
      ios:
        (store.keys?.[apiKey]?.ios) ||
        (effectiveProjectId && store.projects?.[effectiveProjectId]?.ios) ||
        null,
      history: Array.isArray(store.history)
        ? store.history.filter(
            (item) =>
              (apiKey && item.apiKey === apiKey) ||
              (effectiveProjectId && item.projectId === effectiveProjectId)
          )
        : [],
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(scopedStore),
    };
  }

  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ error: 'Method Not Allowed' }),
  };
};
