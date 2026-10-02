// Vercel serverless entry point.
// Vercel treats every file in /api as a function. All routes are forwarded here
// by the rewrite rule in vercel.json.
const app = require('../src/server');
const db = require('../src/db');

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
  await ensureSchema();
  return app(req, res);
};