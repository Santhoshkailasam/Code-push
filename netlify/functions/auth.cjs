const PROJECTS_RTDB_URL =
  'https://tracker-42b47-default-rtdb.asia-southeast1.firebasedatabase.app/codepush_user_projects.json';
const API_KEYS_RTDB_BASE =
  'https://tracker-42b47-default-rtdb.asia-southeast1.firebasedatabase.app/codepush_api_keys';

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
 * Validates an API key against:
 * 1. Server master key (process.env.CODEPUSH_API_KEY)
 * 2. Registered projects in Firebase RTDB (codepush_user_projects)
 * 3. Registered standalone keys in Firebase RTDB (codepush_api_keys)
 *
 * When valid, resolves the owning projectId automatically so callers can
 * authenticate with ONLY an API key.
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

  // Look up registered projects in Firebase RTDB
  try {
    const res = await fetch(PROJECTS_RTDB_URL, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const projectsMap = await res.json();
      if (projectsMap && typeof projectsMap === 'object') {
        const matchedProject = Object.values(projectsMap).find(
          (p) => p && typeof p === 'object' && p.apiKey === apiKey
        );

        if (matchedProject) {
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

          return {
            valid: true,
            isMaster: false,
            apiKey,
            projectId: matchedProject.id,
            userId: matchedProject.userId || null,
            project: matchedProject,
          };
        }
      }
    }
  } catch (err) {
    console.warn('[CodePush Auth] Project lookup error:', err.message);
  }

  // Fallback: check standalone registered API keys in Firebase RTDB
  try {
    const safeKey = encodeURIComponent(apiKey);
    const res = await fetch(`${API_KEYS_RTDB_BASE}/${safeKey}.json`, {
      signal: AbortSignal.timeout(2500),
    });
    if (res.ok) {
      const keyRecord = await res.json();
      if (keyRecord && keyRecord.active !== false) {
        if (
          requestedProjectId &&
          requestedProjectId !== 'default' &&
          keyRecord.projectId &&
          keyRecord.projectId !== requestedProjectId
        ) {
          return {
            valid: false,
            statusCode: 403,
            error: 'Forbidden: API Key does not belong to the requested projectId.',
          };
        }

        return {
          valid: true,
          isMaster: false,
          apiKey,
          projectId: requestedProjectId || keyRecord.projectId || null,
          userId: keyRecord.userId || null,
          project: null,
        };
      }
    }
  } catch (err) {
    console.warn('[CodePush Auth] Standalone key lookup error:', err.message);
  }

  return {
    valid: false,
    statusCode: 401,
    error: 'Unauthorized: Invalid or unregistered CodePush API Key.',
  };
}

module.exports = {
  extractApiKey,
  verifyApiKey,
};

