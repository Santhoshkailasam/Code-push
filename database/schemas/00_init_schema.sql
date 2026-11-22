-- Enable Required Extensions in public & Initialize codepush_schema
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE SCHEMA IF NOT EXISTS codepush_schema;
SET search_path TO codepush_schema, public;
