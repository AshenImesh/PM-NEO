import app from '../server-lib/app.js';

// Vercel serverless entry point: the whole Express API runs as one
// function and answers every /api/* route (Vercel passes the full path,
// so the app's /api/... routes match as-is). Storage comes from Upstash
// Redis when its env vars are present, else a local JSON file.
export default app;
