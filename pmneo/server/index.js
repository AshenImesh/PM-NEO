import app from './app.js';

// Localhost entry point. On Vercel the same app is served
// serverless (see pmneo/client/api/[...all].js) — no listen() there.
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
