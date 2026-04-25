import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load .env for local development; in Docker, envs are injected at runtime.
dotenv.config();

const config = {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  // ssl: { rejectUnauthorized: false }, // enable if needed for cloud DBs
};

const pool = new Pool(config);

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export default pool;

