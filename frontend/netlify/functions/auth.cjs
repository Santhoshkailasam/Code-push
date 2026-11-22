const db = require('./db.cjs');

// ⚡ Ultra-Fast Memory Cache for API Key verification across warm lambda invocations (60s TTL)
const authCache = new Map();
const AUTH_CACHE_TTL_MS = 60 * 1000;

function invalidateAuthCache() {
  authCache.clear();
}

/**
 * Extracts a CodePush API key from headers, query parameters, or request body.
 */
function extractApiKey(event, body = null) {
  const headers = event.headers || {};
  const query = event.queryStringParameters || {};

  const authHeader = headers['authorization'] || headers['Authorization'] || '';
  const bearerKey = authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : '';

  const headerKey =
    headers['x-codepush-api-key'] ||
    headers['X-CodePush-Api-Key'] ||
    headers['x-api-key'] ||
    headers['X-Api-Key'] ||
    '';

  const queryKey = query.apiKey || '';
  const bodyKey = body && typeof body === 'object' ? body.apiKey || '' : '';

  return String(headerKey || bearerKey || queryKey || bodyKey || '').trim() || null;
}

/**
 * Pure PostgreSQL API key validation against 'projects' table.
 * (Zero external Firebase RTDB dependencies).
 */
async function verifyApiKey(apiKey, requestedProjectId = null) {
  if (!apiKey) {
    return {
      valid: false,
      statusCode: 401,
      error: 'Unauthorized: Missing CodePush API Key. Pass it via Authorization: Bearer <key>, x-codepush-api-key header, or ?apiKey=...',
    };
  }

  const masterKey = process.env.CODEPUSH_API_KEY;
  if (masterKey && apiKey === masterKey) {
    return {
      valid: true,
      isMaster: true,
      apiKey,
      projectId: requestedProjectId || null,
      userId: null,
      project: null,
    };
  }

  // Check In-Memory Cache for 0ms warm response
  const cacheKey = `${apiKey}_${requestedProjectId || 'default'}`;
  const cached = authCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < AUTH_CACHE_TTL_MS) {
    return cached.result;
  }

  // Pure PostgreSQL indexed query on 'projects' table
  try {
    const pgRes = await db.query(
      'SELECT id, user_id, name, platform, api_key FROM projects WHERE api_key = $1 LIMIT 1',
      [apiKey]
    );

    if (pgRes && pgRes.rows && pgRes.rows.length > 0) {
      const matchedProject = pgRes.rows[0];
      if (
        requestedProjectId &&
        requestedProjectId !== 'default' &&
        matchedProject.id !== requestedProjectId
      ) {
        return {
          valid: false,
          statusCode: 403,
          error: 'Forbidden: API Key does not belong to the requested projectId.',
        };
      }

      const authResult = {
        valid: true,
        isMaster: false,
        apiKey,
        projectId: matchedProject.id,
        userId: matchedProject.user_id || null,
        project: matchedProject,
      };
      authCache.set(cacheKey, { timestamp: Date.now(), result: authResult });
      return authResult;
    }
  } catch (pgErr) {
    console.error('[PostgreSQL Auth Error]:', pgErr.message);
    return {
      valid: false,
      statusCode: 500,
      error: 'Authentication database query failed: ' + pgErr.message,
    };
  }

  return {
    valid: false,
    statusCode: 401,
    error: 'Unauthorized: Invalid or unregistered CodePush API Key.',
  };
}

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-codepush-api-key, x-api-key, x-user-id',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

  const userId = query.userId || event.headers?.['x-user-id'] || body.uid || body.userId || null;

  try {
    // GET: Retrieve user profile
    if (event.httpMethod === 'GET') {
      if (!userId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'userId is required' }),
        };
      }

      const res = await db.query(
        `SELECT id, email, name, role, avatar_url AS "avatarUrl", created_at AS "createdAt", updated_at AS "updatedAt"
         FROM codepush_schema.users
         WHERE id = $1 LIMIT 1`,
        [userId]
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          user: res.rows[0] || null,
        }),
      };
    }

    // POST: Upsert user profile to PostgreSQL users table
    if (event.httpMethod === 'POST') {
      const id = userId;
      if (!id) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'User ID is required' }),
        };
      }

      const email = body.email || `${id}@codepush.internal`;
      const name = body.name || body.displayName || email.split('@')[0];
      const avatarUrl = body.avatarUrl || body.photoURL || null;

      const res = await db.query(
        `INSERT INTO codepush_schema.users (id, email, name, avatar_url, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (id) DO UPDATE SET
           email = EXCLUDED.email,
           name = COALESCE(EXCLUDED.name, codepush_schema.users.name),
           avatar_url = COALESCE(EXCLUDED.avatar_url, codepush_schema.users.avatar_url),
           updated_at = NOW()
         RETURNING id, email, name, role, avatar_url AS "avatarUrl", created_at AS "createdAt", updated_at AS "updatedAt"`,
        [id, email, name, avatarUrl]
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          user: res.rows[0],
        }),
      };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  } catch (err) {
    console.error('[Auth API Error]:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal Server Error', details: err.message }),
    };
  }
};

module.exports = {
  extractApiKey,
  verifyApiKey,
  invalidateAuthCache,
  handler: exports.handler,
};
