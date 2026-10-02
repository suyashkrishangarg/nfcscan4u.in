require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  baseUrl: process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`,
  dbUrl: process.env.DATABASE_URL || 'file:cards.db',
  dbAuthToken: process.env.DATABASE_AUTH_TOKEN || undefined,
  adminKey: process.env.ADMIN_KEY || 'admin123',
  sessionSecret: process.env.SESSION_SECRET || 'nfc-card-secret-key-change-me'
};
