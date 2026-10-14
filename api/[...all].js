import app from '../pmneo/server/app.js';

// Vercel serverless entry point: the whole Express API runs as one
// function and answers every /api/* route. Storage comes from
// Vercel KV when configured, otherwise (local `vercel dev`) it would
// fall back to a JSON file — but `vercel dev` isn't our dev setup,
// so treat KV as required in production.
export default app;
