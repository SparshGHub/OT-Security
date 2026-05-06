import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRoutes from './api/routes';
import { initializeDatabase } from './db/init';

// Load environment variables from .env if present (local dev).
// In Docker, variables come from the container environment, so this is harmless.
dotenv.config();

const app = express();

// Prefer explicit origin to avoid wildcard CORS in production.
// FRONTEND_ORIGIN can be set to "http://localhost:3000" or any UI origin.
const allowedOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';

app.use(
  cors({
    origin: allowedOrigin,
    credentials: true,
  })
);

app.use(express.json());

// API Routes, mounted under /api
app.use('/api', apiRoutes);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).send('OK');
});

const startServer = async () => {
  try {
    // Database is initialized by docker-entrypoint scripts;
    // we still perform a check/log here.
    await initializeDatabase();

    const port = Number(process.env.BACKEND_PORT || process.env.PORT || 4000);
    app.listen(port, '0.0.0.0', () => {
      console.log(`Backend server is running on http://0.0.0.0:${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

