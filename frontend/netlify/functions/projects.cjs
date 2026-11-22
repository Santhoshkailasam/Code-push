const db = require('./db.cjs');

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

  try {
    const query = event.queryStringParameters || {};
    let body = {};
    if (event.body) {
      try {
        body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
      } catch (e) {
        body = {};
      }
    }

    const reqHeaders = event.headers || {};
    const userId = query.userId || reqHeaders['x-user-id'] || body.userId || null;
    const projectId = query.id || query.projectId || body.id || body.projectId || null;

    // GET: Retrieve projects for user or single project
    if (event.httpMethod === 'GET') {
      const sql = `
        SELECT 
          id,
          user_id AS "userId",
          name,
          platform,
          api_key AS "apiKey",
          github_repo AS "githubRepo",
          branch,
          webhook_url AS "webhookUrl",
          slack_webhook_url AS "slackWebhookUrl",
          discord_webhook_url AS "discordWebhookUrl",
          circuit_breaker_enabled AS "circuitBreakerEnabled",
          circuit_breaker_threshold AS "circuitBreakerThreshold",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM codepush_schema.projects
        WHERE ($1::text IS NULL OR user_id = $1 OR user_id IS NULL)
          AND ($2::text IS NULL OR id = $2)
        ORDER BY created_at DESC
      `;
      const res = await db.query(sql, [userId, projectId]);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          projects: res.rows,
        }),
      };
    }

    // POST / PUT: Create or update project
    if (event.httpMethod === 'POST' || event.httpMethod === 'PUT') {
      const id = body.id || projectId;
      if (!id || !body.name) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'id and name are required' }),
        };
      }

      const effectiveUserId = body.userId || userId || null;
      if (effectiveUserId) {
        await db.query(
          `INSERT INTO codepush_schema.users (id, name, email)
           VALUES ($1, $2, $3)
           ON CONFLICT (id) DO NOTHING`,
          [effectiveUserId, effectiveUserId, `${effectiveUserId}@codepush.internal`]
        );
      }

      const apiKey = body.apiKey || `cp_live_${id.slice(0, 6)}_${Date.now().toString(36)}`;
      const platform = body.platform || 'both';
      const githubRepo = body.githubRepo || body.github_repo || null;
      const branch = body.branch || 'main';
      const webhookUrl = body.webhookUrl || body.webhook_url || null;
      const slackWebhookUrl = body.slackWebhookUrl || body.slack_webhook_url || null;
      const discordWebhookUrl = body.discordWebhookUrl || body.discord_webhook_url || null;
      const circuitBreakerEnabled = body.circuitBreakerEnabled !== undefined ? Boolean(body.circuitBreakerEnabled) : true;
      const circuitBreakerThreshold = parseInt(body.circuitBreakerThreshold, 10) || 5;

      const upsertSql = `
        INSERT INTO codepush_schema.projects (
          id, user_id, name, platform, api_key, github_repo, branch,
          webhook_url, slack_webhook_url, discord_webhook_url,
          circuit_breaker_enabled, circuit_breaker_threshold,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          platform = EXCLUDED.platform,
          api_key = EXCLUDED.api_key,
          github_repo = EXCLUDED.github_repo,
          branch = EXCLUDED.branch,
          webhook_url = EXCLUDED.webhook_url,
          slack_webhook_url = EXCLUDED.slack_webhook_url,
          discord_webhook_url = EXCLUDED.discord_webhook_url,
          circuit_breaker_enabled = EXCLUDED.circuit_breaker_enabled,
          circuit_breaker_threshold = EXCLUDED.circuit_breaker_threshold,
          updated_at = NOW()
        RETURNING
          id,
          user_id AS "userId",
          name,
          platform,
          api_key AS "apiKey",
          github_repo AS "githubRepo",
          branch,
          webhook_url AS "webhookUrl",
          slack_webhook_url AS "slackWebhookUrl",
          discord_webhook_url AS "discordWebhookUrl",
          circuit_breaker_enabled AS "circuitBreakerEnabled",
          circuit_breaker_threshold AS "circuitBreakerThreshold",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
      `;

      const res = await db.query(upsertSql, [
        id,
        effectiveUserId,
        body.name,
        platform,
        apiKey,
        githubRepo,
        branch,
        webhookUrl,
        slackWebhookUrl,
        discordWebhookUrl,
        circuitBreakerEnabled,
        circuitBreakerThreshold,
      ]);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          project: res.rows[0],
        }),
      };
    }

    // DELETE: Remove project
    if (event.httpMethod === 'DELETE') {
      const targetId = projectId || body.id;
      if (!targetId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Project ID is required' }),
        };
      }

      await db.query('DELETE FROM codepush_schema.projects WHERE id = $1', [targetId]);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: `Project ${targetId} deleted successfully from PostgreSQL`,
          id: targetId,
        }),
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  } catch (err) {
    console.error('[Projects API Error]:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal Database Error', details: err.message }),
    };
  }
};
