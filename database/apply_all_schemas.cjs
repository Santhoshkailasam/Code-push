/**
 * Database Schema Runner
 * 1. Automatically ensures database 'codepush' exists (creates it via maintenance connection if needed)
 * 2. Connects to 'codepush' database
 * 3. Executes all individual schema files in database/schemas/ in numeric order inside 'codepush_schema'
 */
const fs = require('fs');
const path = require('path');

let pg;
try {
  pg = require('pg');
} catch {
  pg = require('../frontend/node_modules/pg');
}
const { Client, Pool } = pg;

let dotenv;
try {
  dotenv = require('dotenv');
} catch {
  dotenv = require('../frontend/node_modules/dotenv');
}

try {
  dotenv.config({ path: path.resolve(__dirname, '../frontend/.env') });
} catch {}
try {
  dotenv.config({ path: path.resolve(process.cwd(), 'frontend/.env') });
} catch {}
try {
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });
} catch {}

const dbName = process.env.DB_NAME || 'codepush';
const dbUser = process.env.DB_USER || 'mxmw';
const dbPassword = process.env.DB_PASSWORD || '';
const dbHost = process.env.DB_HOST || '187.127.162.246';
const dbPort = process.env.DB_PORT || '5434';
const maintenanceDb = process.env.RBAC_DB_NAME || 'postgres';

async function ensureDatabaseExists() {
  const maintenanceUrl = `postgres://${dbUser}:${encodeURIComponent(dbPassword)}@${dbHost}:${dbPort}/${maintenanceDb}`;
  const client = new Client({ connectionString: maintenanceUrl });

  try {
    await client.connect();
    console.log(`🔌 Connected to maintenance database '${maintenanceDb}' at ${dbHost}:${dbPort}...`);
    const checkRes = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
    
    if (checkRes.rows.length === 0) {
      console.log(`📦 Database '${dbName}' does not exist yet. Creating it now...`);
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log(`✅ Database '${dbName}' created successfully!`);
    } else {
      console.log(`✅ Database '${dbName}' already exists.`);
    }
  } catch (err) {
    console.warn(`⚠️ Could not auto-create database via '${maintenanceDb}': ${err.message}`);
  } finally {
    try {
      await client.end();
    } catch {}
  }
}

async function applySchemas() {
  // Step 1: Ensure database exists
  await ensureDatabaseExists();

  // Step 2: Connect to target database 'codepush'
  const codepushUrl = `postgres://${dbUser}:${encodeURIComponent(dbPassword)}@${dbHost}:${dbPort}/${dbName}?options=-csearch_path%3Dcodepush_schema,public`;
  const pool = new Pool({
    connectionString: codepushUrl,
    max: 5,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 5000,
  });

  const client = await pool.connect();
  console.log(`🚀 Connected to target database '${dbName}'!`);

  try {
    const schemasDir = path.resolve(__dirname, 'schemas');
    const files = fs
      .readdirSync(schemasDir)
      .filter((f) => f.endsWith('.sql') && f !== 'index.sql')
      .sort();

    console.log(`📁 Found ${files.length} schema files in database/schemas/`);

    for (const file of files) {
      const filePath = path.join(schemasDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      console.log(`⏳ Applying schema: ${file}...`);
      await client.query(sql);
      console.log(`  ✓ ${file} applied successfully.`);
    }

    console.log('\n🎉 SUCCESS: All tables created inside schema: codepush_schema');
    
    // Verify created tables in codepush_schema
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'codepush_schema' 
      ORDER BY table_name;
    `);

    console.log('\n📋 Verified Tables in codepush_schema:');
    tablesRes.rows.forEach((r, idx) => {
      console.log(`  ${idx + 1}. codepush_schema.${r.table_name}`);
    });

  } catch (err) {
    console.error('❌ Failed to apply schemas:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

applySchemas();
