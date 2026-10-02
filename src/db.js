const config = require('./config');

// Remote libSQL / Turso databases are served by the pure-JavaScript HTTP client,
// which has no native bindings. This is required on serverless hosts such as
// Vercel, where the native `libsql` binary is unavailable and causes the
// function to fail to load. A local `file:` database keeps using the native
// client so zero-configuration local development still works.
const isRemote = /^(libsql|https?|wss?):/i.test(config.dbUrl || '');
// Vercel (and Lambda-style) runtimes cannot load the native `libsql` binary.
const onServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

let client = null;
function getClient() {
  if (!client) {
    // Locally a `file:` database uses the native client (zero-config dev).
    // Everywhere else the pure-JS HTTP client is used.
    const { createClient } = (onServerless || isRemote)
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

  // Saved card designs used by the Admin Card Designer (front/back artwork
  // with a QR placement recipe baked in).
  await db.execute(`
    CREATE TABLE IF NOT EXISTS designs (
      id TEXT PRIMARY KEY,
      name TEXT,
      front_b64 TEXT,
      back_b64 TEXT,
      placement_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
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

// Wipe the entire card inventory in one shot ("Delete All Cards" in the admin
// portal). Scan history is cleared first so nothing is orphaned, then the cards
// themselves. Both statements are single queries so this stays fast even for
// thousands of rows.
async function deleteAllCards() {
  const scans = await db.execute('DELETE FROM scans');
  const cards = await db.execute('DELETE FROM cards');
  return {
    cards: Number(cards.rowsAffected || 0),
    scans: Number(scans.rowsAffected || 0)
  };
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

// ==========================================
// Saved card designs (Admin Card Designer)
// ==========================================
// Images are stored as data URLs (base64). The client downscales uploads so a
// design stays well under serverless request-body limits.
async function saveDesign({ id, name, frontB64, backB64, placement }) {
  await db.execute({
    sql: `INSERT INTO designs (id, name, front_b64, back_b64, placement_json)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            front_b64 = excluded.front_b64,
            back_b64 = excluded.back_b64,
            placement_json = excluded.placement_json`,
    args: [id, name || 'Untitled design', frontB64 || null, backB64 || null, JSON.stringify(placement || {})]
  });
  return getDesign(id);
}

async function getDesign(id) {
  const res = await db.execute({
    sql: 'SELECT * FROM designs WHERE id = ? LIMIT 1',
    args: [String(id || '')]
  });
  const row = res.rows[0] || null;
  if (!row) return null;
  let placement = {};
  try { placement = row.placement_json ? JSON.parse(row.placement_json) : {}; } catch (e) {}
  return {
    id: row.id,
    name: row.name,
    frontB64: row.front_b64,
    backB64: row.back_b64,
    placement,
    createdAt: row.created_at
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
  deleteAllCards,
  recordScan,
  getAllCards,
  getCardStats,
  saveDesign,
  getDesign
};
