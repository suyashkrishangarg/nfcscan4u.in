const config = require('./config');

// Remote libSQL / Turso databases are served by the pure-JavaScript HTTP client,
// which has no native bindings. This is required on serverless hosts such as
// Vercel, where the native `libsql` binary is unavailable and causes the
// function to fail to load. A local `file:` database keeps using the native
// client so zero-configuration local development still works.
const isRemote = /^(libsql|https?|wss?):/i.test(config.dbUrl || '');

let client = null;
function getClient() {
  if (!client) {
    const { createClient } = isRemote
      ? require('@libsql/client/web')
      : require('@libsql/client');
    client = createClient({ url: config.dbUrl, authToken: config.dbAuthToken });
  }
  return client;
}

// Lazily forwards calls to the real client so merely importing this module never
// opens a connection. Avoids touching the database (and its native bindings) at
// module load time on serverless platforms.
const db = new Proxy({}, {
  get(_target, prop) {
    const c = getClient();
    const value = c[prop];
    return typeof value === 'function' ? value.bind(c) : value;
  }
});

async function initDb() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'unclaimed',
      owner_name TEXT,
      owner_email TEXT,
      password_hash TEXT,
      redirect_type TEXT NOT NULL DEFAULT 'direct',
      target_url TEXT,
      profile_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS scans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      card_id TEXT NOT NULL,
      scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      user_agent TEXT,
      referer TEXT,
      FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
    );
  `);

  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_scans_card_id ON scans(card_id);
  `);

  await dropLegacyPinColumn();

  console.log('✅ Database schema initialized successfully');
}

// Legacy databases created before the activation PIN was removed still have a
// NOT NULL `pin` column. Drop it so a card can be claimed with a single tap.
async function dropLegacyPinColumn() {
  try {
    const info = await db.execute('PRAGMA table_info(cards)');
    const hasPin = info.rows.some(r => r.name === 'pin');
    if (hasPin) {
      await db.execute('ALTER TABLE cards DROP COLUMN pin');
      console.log('ℹ️  Removed legacy activation PIN column');
    }
  } catch (err) {
    console.warn('PIN column migration skipped:', err.message);
  }
}

async function getCard(id) {
  const normalizedId = String(id || '').trim();
  const res = await db.execute({
    sql: 'SELECT * FROM cards WHERE LOWER(id) = LOWER(?) LIMIT 1',
    args: [normalizedId]
  });
  return res.rows[0] || null;
}

async function createCard({ id }) {
  await db.execute({
    sql: 'INSERT INTO cards (id, status) VALUES (?, ?)',
    args: [id, 'unclaimed']
  });
  return getCard(id);
}

async function createBatch(cards) {
  const statements = cards.map(c => ({
    sql: 'INSERT OR IGNORE INTO cards (id, status) VALUES (?, ?)',
    args: [c.id, 'unclaimed']
  }));
  await db.batch(statements);
}

async function activateCard(id, { owner_name, owner_email, password_hash, redirect_type, target_url, profile_json }) {
  await db.execute({
    sql: `
      UPDATE cards 
      SET 
        status = 'active',
        owner_name = ?,
        owner_email = ?,
        password_hash = ?,
        redirect_type = ?,
        target_url = ?,
        profile_json = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE LOWER(id) = LOWER(?)
    `,
    args: [
      owner_name || null,
      owner_email || null,
      password_hash || null,
      redirect_type || 'direct',
      target_url || null,
      profile_json ? JSON.stringify(profile_json) : null,
      id
    ]
  });
  return getCard(id);
}

async function updateCardSettings(id, { redirect_type, target_url, profile_json, owner_name, owner_email }) {
  await db.execute({
    sql: `
      UPDATE cards 
      SET 
        redirect_type = ?,
        target_url = ?,
        profile_json = ?,
        owner_name = COALESCE(?, owner_name),
        owner_email = COALESCE(?, owner_email),
        updated_at = CURRENT_TIMESTAMP
      WHERE LOWER(id) = LOWER(?)
    `,
    args: [
      redirect_type || 'direct',
      target_url || null,
      profile_json ? JSON.stringify(profile_json) : null,
      owner_name || null,
      owner_email || null,
      id
    ]
  });
  return getCard(id);
}

async function updateCardPassword(id, password_hash) {
  await db.execute({
    sql: 'UPDATE cards SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE LOWER(id) = LOWER(?)',
    args: [password_hash, id]
  });
}

async function setCardStatus(id, status) {
  await db.execute({
    sql: 'UPDATE cards SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE LOWER(id) = LOWER(?)',
    args: [status, id]
  });
}

async function resetCard(id) {
  await db.execute({
    sql: `
      UPDATE cards 
      SET 
        status = 'unclaimed',
        owner_name = NULL,
        owner_email = NULL,
        password_hash = NULL,
        redirect_type = 'direct',
        target_url = NULL,
        profile_json = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE LOWER(id) = LOWER(?)
    `,
    args: [id]
  });
}

async function deleteCard(id) {
  await db.execute({
    sql: 'DELETE FROM scans WHERE LOWER(card_id) = LOWER(?)',
    args: [id]
  });
  await db.execute({
    sql: 'DELETE FROM cards WHERE LOWER(id) = LOWER(?)',
    args: [id]
  });
}

async function recordScan(card_id, user_agent, referer) {
  try {
    await db.execute({
      sql: 'INSERT INTO scans (card_id, user_agent, referer) VALUES (?, ?, ?)',
      args: [card_id, (user_agent || '').substring(0, 255), (referer || '').substring(0, 255)]
    });
  } catch (err) {
    console.error('Scan recording error:', err.message);
  }
}

async function getAllCards() {
  const res = await db.execute(`
    SELECT 
      c.*,
      COUNT(s.id) as scan_count,
      MAX(s.scanned_at) as last_scanned_at
    FROM cards c
    LEFT JOIN scans s ON LOWER(c.id) = LOWER(s.card_id)
    GROUP BY c.id
    ORDER BY c.created_at DESC
  `);
  return res.rows;
}

async function getCardStats(id) {
  const countRes = await db.execute({
    sql: 'SELECT COUNT(*) as total_scans FROM scans WHERE LOWER(card_id) = LOWER(?)',
    args: [id]
  });
  const recentRes = await db.execute({
    sql: 'SELECT scanned_at, user_agent, referer FROM scans WHERE LOWER(card_id) = LOWER(?) ORDER BY scanned_at DESC LIMIT 20',
    args: [id]
  });
  return {
    totalScans: countRes.rows[0]?.total_scans || 0,
    recentScans: recentRes.rows
  };
}

module.exports = {
  db,
  initDb,
  getCard,
  createCard,
  createBatch,
  activateCard,
  updateCardSettings,
  updateCardPassword,
  setCardStatus,
  resetCard,
  deleteCard,
  recordScan,
  getAllCards,
  getCardStats
};
