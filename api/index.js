// Vercel serverless entry point.
// Vercel treats every file in /api as a function. All routes are forwarded here
// by the rewrite rule in vercel.json.
const app = require('../src/server');
const db = require('../src/db');
const config = require('../src/config');

// Serverless invocations never call startServer(), so make sure the database
// schema exists once per cold start. Failures are logged and retried on the
// next request rather than crashing every invocation.
let schemaReady = null;
function ensureSchema() {
  if (!schemaReady) {
    schemaReady = db.initDb().catch(err => {
      console.error('Schema init failed:', err.message);
      schemaReady = null;
    });
  }
  return schemaReady;
}

module.exports = async (req, res) => {
  // Lightweight, dependency-free diagnostics. Never touches the database so it
  // keeps working even when the database configuration is broken.
  if ((req.url || '').split('?')[0] === '/diag') {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      onServerless: Boolean(process.env.VERCEL),
      node: process.version,
      dbUrlScheme: String(config.dbUrl || '').split(':')[0],
      hasDbToken: Boolean(config.dbAuthToken),
      baseUrl: config.baseUrl
    }));
    return;
  }

  await ensureSchema();
  return app(req, res);
};