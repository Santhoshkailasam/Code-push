const db = require('./db.cjs');
const { extractApiKey, verifyApiKey } = require('./auth.cjs');
const { formatReleaseRow } = require('./store.cjs');

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-codepush-api-key, x-api-key, x-user-id',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: JSON.stringify({ message: 'OK' }) };
  }

  const query = event.queryStringParameters || {};
  let body = {};
  if (event.body) {
    try {
      body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } catch (e) {
      body = {};
    }
  }

  const requestedProjectId = query.projectId || body.projectId || null;
  const apiKey = extractApiKey(event, body);
  const auth = await verifyApiKey(apiKey, requestedProjectId);

  if (!auth.valid) {
    return {
      statusCode: auth.statusCode,
      headers,
      body: JSON.stringify({ error: auth.error }),
    };
  }

  const effectiveProjectId = requestedProjectId || auth.projectId || null;

  // GET: Fetch releases and active platform targets
  if (event.httpMethod === 'GET') {
    try {
      let releasesQuery = `SELECT * FROM codepush_schema.releases`;
      const params = [];

      if (effectiveProjectId) {
        releasesQuery += ` WHERE project_id = $1`;
        params.push(effectiveProjectId);
      }

      releasesQuery += ` ORDER BY created_at DESC LIMIT 200`;

      const res = await db.query(releasesQuery, params);
      const history = (res.rows || []).map(formatReleaseRow);

      const android =
        history.find((r) => r.platform === 'android' && r.track === 'production' && !r.revoked && r.isActive) || null;
      const ios =
        history.find((r) => r.platform === 'ios' && r.track === 'production' && !r.revoked && r.isActive) || null;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          projectId: effectiveProjectId,
          android,
          ios,
          history,
        }),
      };
    } catch (err) {
      console.error('[Releases API Error]:', err);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Internal Database Error', details: err.message }),
      };
    }
  }

  // DELETE: Delete release record
  if (event.httpMethod === 'DELETE') {
    const targetId = query.id || query.releaseId || body.id || body.releaseId;
    if (!targetId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Release ID is required to delete' }),
      };
    }

    try {
      await db.query('DELETE FROM codepush_schema.releases WHERE id = $1', [targetId]);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: `Release ${targetId} deleted from PostgreSQL`, id: targetId }),
      };
    } catch (err) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to delete release', details: err.message }),
      };
    }
  }

  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ error: 'Method Not Allowed' }),
  };
};
