const db = require('./db.cjs');
const { extractApiKey, verifyApiKey } = require('./auth.cjs');

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-codepush-api-key, x-api-key, x-user-id',
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
    // Ensure project stub exists to satisfy FK
    await db.query(
      `INSERT INTO codepush_schema.projects (id, name, api_key)
       VALUES ($1, $1, $2)
       ON CONFLICT (id) DO NOTHING`,
      [projectId, apiKey || `cp_auto_${projectId}`]
    );

    // GET: Retrieve remote config key/value flags from PostgreSQL
    if (event.httpMethod === 'GET') {
      const res = await db.query(
        `SELECT key, value, type, description, updated_at AS "updatedAt"
         FROM codepush_schema.remote_configs
         WHERE project_id = $1
         ORDER BY key ASC`,
        [projectId]
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          projectId,
          config: res.rows || [],
        }),
      };
    }

    // POST / PUT: Update or save remote config key/values to PostgreSQL
    if (event.httpMethod === 'POST' || event.httpMethod === 'PUT') {
      if (Array.isArray(parsedBody.config)) {
        for (const item of parsedBody.config) {
          if (!item.key) continue;
          await db.query(
            `INSERT INTO codepush_schema.remote_configs (project_id, key, value, type, description, updated_at)
             VALUES ($1, $2, $3, $4, $5, NOW())
             ON CONFLICT (project_id, key) DO UPDATE SET
               value = EXCLUDED.value,
               type = EXCLUDED.type,
               description = EXCLUDED.description,
               updated_at = NOW()`,
            [
              projectId,
              String(item.key).trim(),
              JSON.stringify(item.value !== undefined ? item.value : ''),
              item.type || typeof item.value || 'string',
              item.description || '',
            ]
          );
        }
      } else if (parsedBody.key) {
        await db.query(
          `INSERT INTO codepush_schema.remote_configs (project_id, key, value, type, description, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW())
           ON CONFLICT (project_id, key) DO UPDATE SET
             value = EXCLUDED.value,
             type = EXCLUDED.type,
             description = EXCLUDED.description,
             updated_at = NOW()`,
          [
            projectId,
            String(parsedBody.key).trim(),
            JSON.stringify(parsedBody.value !== undefined ? parsedBody.value : ''),
            parsedBody.type || typeof parsedBody.value || 'string',
            parsedBody.description || '',
          ]
        );
      }

      const freshRes = await db.query(
        `SELECT key, value, type, description, updated_at AS "updatedAt"
         FROM codepush_schema.remote_configs
         WHERE project_id = $1
         ORDER BY key ASC`,
        [projectId]
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Remote Config updated successfully in PostgreSQL',
          config: freshRes.rows || [],
        }),
      };
    }

    // DELETE: Delete a key or clear config
    if (event.httpMethod === 'DELETE') {
      const keyToDelete = query.key || parsedBody.key || null;
      if (keyToDelete) {
        await db.query(
          `DELETE FROM codepush_schema.remote_configs WHERE project_id = $1 AND key = $2`,
          [projectId, keyToDelete]
        );
      } else {
        await db.query(
          `DELETE FROM codepush_schema.remote_configs WHERE project_id = $1`,
          [projectId]
        );
      }

      const freshRes = await db.query(
        `SELECT key, value, type, description, updated_at AS "updatedAt"
         FROM codepush_schema.remote_configs
         WHERE project_id = $1
         ORDER BY key ASC`,
        [projectId]
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: `Key ${keyToDelete || 'all'} deleted from PostgreSQL`,
          config: freshRes.rows || [],
        }),
      };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  } catch (err) {
    console.error('[Remote Config API Error]:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal Server Error', details: err.message }),
    };
  }
};
