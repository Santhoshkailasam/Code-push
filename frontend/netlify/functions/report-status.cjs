const db = require('./db.cjs');
const { resolveCountry } = require('./geoResolver.cjs');

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-codepush-api-key, x-api-key, x-user-id',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: JSON.stringify({ message: 'CORS Preflight' }) };
  }

  const query = event.queryStringParameters || {};
  let payload = {};
  if (typeof event.body === 'string') {
    try {
      payload = JSON.parse(event.body);
    } catch (e) {}
  } else if (typeof event.body === 'object' && event.body !== null) {
    payload = event.body;
  }

  const effectiveProjectId = query.projectId || payload.projectId || null;

  try {
    // GET: Retrieve latest telemetry pings from PostgreSQL
    if (event.httpMethod === 'GET') {
      const res = await db.query(
        `SELECT 
          id,
          project_id AS "projectId",
          platform,
          device,
          country,
          timezone,
          action,
          version,
          created_at AS "createdAt",
          TO_CHAR(created_at, 'HH12:MI:SS AM') AS time,
          TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS date
        FROM codepush_schema.telemetry_pings
        WHERE ($1::text IS NULL OR project_id = $1)
        ORDER BY created_at DESC
        LIMIT 50`,
        [effectiveProjectId]
      );
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(res.rows || []),
      };
    }

    // POST: Record new telemetry ping to PostgreSQL
    const { platform, version, action, device, apiKey } = payload;
    const detectedCountry = resolveCountry(event, query, payload);
    const pingId = `ping_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const plat = platform || 'android';
    const dev = device || (plat === 'ios' ? 'iPhone Mobile Phone' : 'Android Mobile Phone');
    const country = String(detectedCountry || 'US').toUpperCase();
    const ver = version || '1.0.0';
    const act = action || 'Mobile app checked for updates';

    if (effectiveProjectId) {
      await db.query(
        `INSERT INTO codepush_schema.projects (id, name, api_key)
         VALUES ($1, $1, $2)
         ON CONFLICT (id) DO NOTHING`,
        [effectiveProjectId, apiKey || `cp_auto_${effectiveProjectId}`]
      );
    }

    await db.query(
      `INSERT INTO codepush_schema.telemetry_pings (
        id, project_id, platform, device, country, timezone, action, version, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [pingId, effectiveProjectId, plat, dev, country, 'UTC', act, ver]
    );

    const newPing = {
      id: pingId,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      date: new Date().toISOString(),
      platform: plat,
      device: dev,
      country,
      version: ver,
      action: act,
      projectId: effectiveProjectId,
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, ping: newPing }),
    };
  } catch (err) {
    console.error('[Telemetry API Error]:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal Error', details: err.message }),
    };
  }
};
