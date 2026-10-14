// Local-dev re-export: the single source of truth for the API lives in
// pmneo/client/server-lib/app.js so Vercel (root = pmneo/client) can
// deploy it as a serverless function. Localhost behavior is identical.
export { default } from '../client/server-lib/app.js';
