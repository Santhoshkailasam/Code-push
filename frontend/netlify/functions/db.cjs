const { Pool } = require('pg');
const path = require('path');

// Load database environment variables from codepush/.env or frontend/.env
try {
  require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
} catch {}
try {
  require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
} catch {}
try {
  require('dotenv').config({ path: path.resolve(process.cwd(), 'frontend/.env') });
} catch {}
try {
  require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });
} catch {}

const dbUser = process.env.DB_USER || 'mxmw';
const dbPassword = process.env.DB_PASSWORD ? encodeURIComponent(process.env.DB_PASSWORD) : '';
const dbHost = process.env.DB_HOST || '187.127.162.246';
const dbPort = process.env.DB_PORT || '5434';
const dbName = process.env.DB_NAME || 'codepush';

const connectionString =
  process.env.DATABASE_URL ||
  (dbPassword
    ? `postgres://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}?options=-csearch_path%3Dcodepush_schema,public`
    : `postgres://${dbUser}@${dbHost}:${dbPort}/${dbName}?options=-csearch_path%3Dcodepush_schema,public`);

let poolInstance = null;

function getPool() {
  if (!poolInstance) {
    poolInstance = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    // search_path is set via options in connectionString
    poolInstance.on('error', (err) => {
      console.error('[PostgreSQL Pool] Unexpected error:', err.message);
    });
  }
  return poolInstance;
}

module.exports = {
  query: (text, params) => getPool().query(text, params),
  getPool,
};
