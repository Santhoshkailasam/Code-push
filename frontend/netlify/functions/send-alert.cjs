const db = require('./db.cjs');
const { extractApiKey, verifyApiKey } = require('./auth.cjs');

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-codepush-api-key, x-api-key',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: JSON.stringify({ message: 'CORS Preflight Handled' }) };
  }

  try {
    let parsedBody = {};
    if (event.body) {
      try {
        parsedBody = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
      } catch (e) {
        parsedBody = {};
      }
    }

    const requestedProjectId =
      event.queryStringParameters?.projectId || parsedBody.projectId || null;
    const apiKey = extractApiKey(event, parsedBody);
    const auth = await verifyApiKey(apiKey, requestedProjectId);
    if (!auth.valid) {
      return {
        statusCode: auth.statusCode,
        headers,
        body: JSON.stringify({ error: auth.error }),
      };
    }

    const projectId = requestedProjectId || auth.projectId || null;

    // Handle DELETE: Deactivate alerts in PostgreSQL
    if (event.httpMethod === 'DELETE') {
      if (projectId) {
        await db.query('UPDATE alerts SET active = false WHERE project_id = $1', [projectId]);
      } else {
        await db.query('UPDATE alerts SET active = false');
      }
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Alerts cleared successfully in PostgreSQL' }),
      };
    }

    // Handle GET: Retrieve active alerts from PostgreSQL
    if (event.httpMethod === 'GET') {
      const alertRes = await db.query(
        `SELECT * FROM alerts 
         WHERE (project_id = $1 OR project_id IS NULL) 
           AND active = true 
         ORDER BY created_at DESC 
         LIMIT 10`,
        [projectId]
      );
      const activeAlert = alertRes.rows.length > 0 ? alertRes.rows[0] : null;
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ alert: activeAlert, allAlerts: alertRes.rows }),
      };
    }

    // Handle POST or PUT: Broadcast alert to PostgreSQL
    const { message, title, platform, type, soundTone } = parsedBody;

    if (!message || !message.trim()) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Message is required to broadcast an in-app alert' }),
      };
    }

    const newAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      projectId: projectId || null,
      title: title || 'CodePush Update Alert',
      message: message.trim(),
      type: type || 'info',
      active: true,
      soundTone: soundTone || 'default',
      createdAt: new Date().toISOString(),
    };

    // Insert alert into PostgreSQL 'alerts' table
    await db.query(
      `INSERT INTO alerts (id, project_id, title, message, type, active, sound_tone, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title,
         message = EXCLUDED.message,
         type = EXCLUDED.type,
         active = EXCLUDED.active;`,
      [
        newAlert.id,
        newAlert.projectId,
        newAlert.title,
        newAlert.message,
        newAlert.type,
        true,
        newAlert.soundTone,
        newAlert.createdAt,
      ]
    );

    // Record into PostgreSQL 'telemetry_pings'
    db.query(
      `INSERT INTO telemetry_pings (id, project_id, platform, device_id, action, version)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO NOTHING`,
      [
        `ping_${Date.now()}`,
        projectId,
        platform || 'all',
        'Dashboard Dispatcher',
        `Broadcasted Alert: "${newAlert.title}"`,
        'Broadcast',
      ]
    ).catch(() => {});

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Alert broadcasted successfully in PostgreSQL.',
        alert: newAlert,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to process alert', details: err.message }),
    };
  }
};
