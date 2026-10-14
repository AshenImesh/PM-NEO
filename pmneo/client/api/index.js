import app from '../server-lib/app.js';

// Vercel serverless entry point: the whole Express API runs as one
// function. vercel.json rewrites every /api/* request here, and the
// function still sees the original path, so the app's /api/... routes
// match as-is. Storage: Upstash Redis when configured, else local file.
export default app;
