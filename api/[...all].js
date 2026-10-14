import app from '../pmneo/server/app.js';

// Vercel serverless entry point (used when the project root is the repo
// root): the whole Express API runs as one function and answers every
// /api/* route. Storage comes from Upstash Redis when its env vars are
// present, else a local JSON file.
export default app;
