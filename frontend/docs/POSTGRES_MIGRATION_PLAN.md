# 🐘 Firebase to PostgreSQL Migration Plan

> **Target Database:** `codepush`  
> **Target Schema:** `codepush_schema`  
> **Host:** `187.127.162.246:5434`  
> **User:** `mxmw`  
> **Connection URL:** `postgres://mxmw:mx%402025%21%23monakin@187.127.162.246:5434/codepush?options=-csearch_path%3Dcodepush_schema,public`

---

## 📑 Table of Contents
1. [Executive Summary & Why Postgres](#1-executive-summary--why-postgres)
2. [Component Mapping (Firebase ➔ Postgres)](#2-component-mapping-firebase--postgres)
3. [Database Architecture & Schema DDL](#3-database-architecture--schema-ddl)
4. [Step-by-Step Execution Plan](#4-step-by-step-execution-plan)
5. [Automated Data Migration Script](#5-automated-data-migration-script)
6. [Updating Netlify Serverless Edge Functions](#6-updating-netlify-serverless-edge-functions)
7. [Testing, Verification & Cutover](#7-testing-verification--cutover)

---

## 1. Executive Summary & Why Postgres

Moving CodePush from Firebase to PostgreSQL provides substantial architectural advantages:

| Metric / Feature | Firebase (Current) | PostgreSQL (`codepush`) |
| :--- | :--- | :--- |
| **Active Release Lookups** | Parses large multi-megabyte JSON trees | Indexed B-Tree search in **< 1.5ms** |
| **Data Integrity** | Loose JSON keys, prone to partial writes | ACID transactions & Foreign Key safety |
| **Targeting & Canary Rules** | Filtered manually in Node.js runtime memory | Native PostgreSQL **`JSONB`** queries |
| **Multi-Tenancy & RBAC** | Basic rules | Relational team roles & scoped permissions |
| **Cost at High Volume** | High per-read/write billing | Predictable, zero query fees |

---

## 2. Component Mapping (Firebase ➔ Postgres)

```
┌──────────────────────────────────────┐          ┌──────────────────────────────────────┐
│           Firebase Service           │          │         PostgreSQL Database          │
├──────────────────────────────────────┤          ├──────────────────────────────────────┤
│ 1. Firebase Auth                     │  ──────► │ • Table: 'users' (JWT Auth)          │
│ 2. RTDB /codepush_user_projects.json │  ──────► │ • Table: 'projects'                  │
│ 3. RTDB /codepush_releases/          │  ──────► │ • Table: 'releases'                  │
│ 4. Firestore /active_releases        │  ──────► │ • View / Flag: releases.is_active    │
│ 5. RTDB /codepush_releases/alerts    │  ──────► │ • Table: 'alerts'                    │
│ 6. RTDB /telemetry                   │  ──────► │ • Table: 'telemetry_pings'           │
│ 7. RTDB /bundles.json (Blobs)        │  ──────► │ • S3 / Cloudflare R2 + CDN URLs      │
└──────────────────────────────────────┘          └──────────────────────────────────────┘
```

---

## 3. Database Architecture & Modular Schemas

The database schemas have been organized into individual, modular SQL files inside [`database/schemas/`](file:///k:/Projects/codepush%20project/codepush/database/schemas/):

| File | Entity / Purpose | Description |
| :--- | :--- | :--- |
| **`00_init_schema.sql`** | Schema & Extensions | Enables `uuid-ossp`, `pgcrypto` & creates `codepush_schema` |
| **`01_users.sql`** | `codepush_schema.users` | Developer accounts, roles (`admin`, `developer`), auth |
| **`02_projects.sql`** | `codepush_schema.projects` | Mobile apps, unique API keys, GitHub & Webhooks |
| **`03_releases.sql`** | `codepush_schema.releases` | OTA updates, canary schedules, targeting rules, delta diffs |
| **`04_remote_configs.sql`** | `codepush_schema.remote_configs` | Dynamic runtime feature flags per project |
| **`05_crash_reports.sql`** | `codepush_schema.crash_reports` | Crash logs, symbolicated stack traces & circuit breakers |
| **`06_telemetry_pings.sql`** | `codepush_schema.telemetry_pings` | Device check-in pings & geographic fleet distribution |
| **`07_alerts.sql`** | `codepush_schema.alerts` | In-app modal test alert broadcasts |
| **`index.sql`** | Master Runner | Runs all schemas in sequence |

---

## 4. Step-by-Step Execution Plan

### Step 1: Install PostgreSQL Client Libraries
Run the following command in your project:
```bash
npm install pg dotenv
npm install --save-dev @types/pg
```

### Step 2: Initialize Database Tables
You can initialize all schemas automatically using Node or psql:
```bash
# Option A: Run the automated Node schema applier
node database/apply_all_schemas.cjs

# Option B: Using psql CLI:
psql -h 187.127.162.246 -p 5434 -U mxmw -d codepush -f database/schemas/index.sql
```

### Step 3: Configure Environment Variables
Your database credentials are saved in [`.env`](file:///k:/Projects/codepush%20project/codepush/.env) and [`frontend/.env`](file:///k:/Projects/codepush%20project/codepush/frontend/.env):
```env
DB_NAME=codepush
RBAC_DB_NAME=postgres
DB_USER=mxmw
DB_PASSWORD="mx@2025!#monakin"
DB_HOST=187.127.162.246
DB_PORT=5434
DATABASE_URL="postgres://mxmw:mx%402025%21%23monakin@187.127.162.246:5434/codepush"
```

Add `DATABASE_URL` to your production deployment environment (e.g., Netlify dashboard under **Site Settings > Environment Variables**).

---

## 5. Automated Data Migration Script

To transfer your live data from Firebase Realtime Database into PostgreSQL, run the automated migration script:

```bash
node backend/migrate-firebase-to-postgres.cjs
```

This script:
1. Connects to `postgres://mxmw:...@187.127.162.246:5434/codepush`.
2. Fetches all registered mobile projects from Firebase and inserts them into `projects`.
3. Fetches all OTA release history and inserts them into `releases`.
4. Wraps all inserts inside an ACID SQL transaction (`BEGIN ... COMMIT`).

---

## 6. Updating Netlify Serverless Edge Functions

### 1. Database Connection Helper ([`backend/db.cjs`](file:///k:/Projects/codepush%20project/codepush/backend/db.cjs))
```javascript
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
});
module.exports = { query: (text, params) => pool.query(text, params) };
```

### 2. Fast API Key Verification (`auth.cjs`)
Replace the HTTP RTDB lookup with an indexed SQL query:
```javascript
const db = require('./db.cjs');

async function verifyApiKey(apiKey, requestedProjectId = null) {
  const result = await db.query(
    'SELECT id, user_id, name FROM projects WHERE api_key = $1 LIMIT 1',
    [apiKey]
  );
  if (result.rows.length === 0) {
    return { valid: false, statusCode: 401, error: 'Invalid API Key' };
  }
  const project = result.rows[0];
  return { valid: true, projectId: project.id, userId: project.user_id };
}
```

### 3. Check Update Handler (`check-update.cjs`)
Fetch active releases in **< 2ms**:
```javascript
const result = await db.query(
  `SELECT * FROM releases 
   WHERE project_id = $1 AND platform = $2 AND track = $3 AND is_active = true 
   ORDER BY created_at DESC LIMIT 1`,
  [projectId, platform, track]
);
const targetRelease = result.rows[0];
```

---

## 7. Testing, Verification & Cutover

1. **Verify Connection:**
   Run `node backend/migrate-firebase-to-postgres.cjs` to confirm successful table creation and connection to `187.127.162.246:5434`.
2. **Verify Check-Update API:**
   Test with curl:
   ```bash
   curl "https://your-domain.netlify.app/.netlify/functions/check-update?platform=android&apiKey=cp_live_xxx"
   ```
3. **Decommission Firebase:**
   Once verified, remove `@react-native-firebase/database` and Firebase config imports from client and backend functions.
