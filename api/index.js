// Vercel serverless entry point.
// Vercel treats every file in /api as a function, so we simply re-export the
// Express app defined in src/server.js. All routes are forwarded here by the
// rewrite rule in vercel.json.
module.exports = require('../src/server');