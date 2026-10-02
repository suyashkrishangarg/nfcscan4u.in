const express = require('express');
const cookieSession = require('cookie-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const config = require('./config');
const db = require('./db');
const generator = require('./generator');
const views = require('./views');
const designer = require('./designer');
const compositor = require('./compositor');

const app = express();

// Vercel terminates TLS at its edge, so trust the proxy for req.protocol/host.
app.set('trust proxy', true);

// Redirect helper.
// Vercel rewrites *relative* redirects into 307s, which preserve the POST method
// and turn a normal "POST -> GET" flow into "POST -> POST". That breaks the admin
// login (re-POSTs /admin -> "Cannot POST /admin") and causes an infinite redirect
// loop after activation. Always redirecting to an ABSOLUTE url with 303
// (See Other) keeps the browser switching to GET as intended.
function redirect303(req, res, path) {
  const host = req.get('host');
  const proto = req.protocol || 'https';
  return res.redirect(303, `${proto}://${host}${path}`);
}

// Middleware
app.use(express.urlencoded({ extended: true }));
// Design uploads arrive as base64 JSON; the limit is generous for local runs.
// (Vercel itself caps request bodies at ~4.5 MB - the client downscales to fit.)
app.use(express.json({ limit: '8mb' }));

// Dynamic pages must never be cached: otherwise a browser can keep showing a
// stale page after a redirect (e.g. the activation form instead of the
// "activated" confirmation on the manage page).
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');
  next();
});

app.use(express.static(path.join(__dirname, '../public')));

app.use(cookieSession({
  name: 'opentap_session',
  keys: [config.sessionSecret],
  maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
}));

// ==========================================
// 1. HOME & HEALTH
// ==========================================
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OpenTap | Open-Source NFC & Dynamic QR Platform</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/lucide@latest"></script>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>body { font-family: 'Plus Jakarta Sans', sans-serif; }</style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
  <div class="fixed inset-0 -z-10 overflow-hidden">
    <div class="absolute -top-[30%] left-[20%] w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-indigo-600/20 to-purple-600/20 blur-3xl pointer-events-none"></div>
  </div>

  <header class="p-6 max-w-5xl mx-auto w-full flex items-center justify-between">
    <div class="flex items-center gap-2 font-bold text-lg text-white">
      <span class="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
        <i data-lucide="radio" class="w-4 h-4 text-white"></i>
      </span>
      <span>OpenTap</span>
    </div>
    <a href="/admin" class="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 transition">
      Admin Portal
    </a>
  </header>

  <main class="max-w-2xl mx-auto px-6 py-12 text-center flex-1 flex flex-col items-center justify-center">
    <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-6">
      <i data-lucide="sparkles" class="w-3.5 h-3.5"></i>
      <span>Dynamic Physical Smart Cards</span>
    </div>

    <h1 class="text-4xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight mb-4">
      Blank NFC & QR Cards,<br>
      <span class="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">Assigned Anytime.</span>
    </h1>

    <p class="text-base text-slate-400 max-w-lg mb-8 leading-relaxed">
      Print permanent QR codes and write NFC chips once. Assign, reassign, or switch links anytime without reprinting.
    </p>

    <!-- Look up / Manage card input -->
    <form action="/login" method="GET" class="w-full max-w-md bg-slate-900/90 border border-slate-800 p-2 rounded-2xl shadow-xl flex gap-2 mb-6">
      <input type="text" name="cardId" placeholder="Enter Card ID (e.g. A7X9K2)" required
        class="flex-1 px-4 py-2.5 bg-transparent text-white placeholder-slate-500 text-sm focus:outline-none uppercase">
      <button type="submit" class="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition shrink-0">
        Manage Card
      </button>
    </form>

    <div class="flex items-center gap-4 text-xs text-slate-500">
      <span class="inline-flex items-center gap-1.5"><i data-lucide="check" class="w-4 h-4 text-emerald-400"></i> Vector SVG & PNG</span>
      <span class="inline-flex items-center gap-1.5"><i data-lucide="check" class="w-4 h-4 text-emerald-400"></i> Sub-millisecond Redirects</span>
      <span class="inline-flex items-center gap-1.5"><i data-lucide="check" class="w-4 h-4 text-emerald-400"></i> Free Cloud Deploy</span>
    </div>
  </main>

  <footer class="py-6 text-center text-xs text-slate-500 border-t border-slate-900">
    <p>Open-Source Dynamic Card Platform</p>
  </footer>
  <script>lucide.createIcons();</script>
</body>
</html>`);
});

// ==========================================
// 2. PERMANENT CARD ROUTE (/c/:cardId)
// This is the permanent URL encoded in QR & NFC!
// ==========================================
app.get('/c/:cardId', async (req, res) => {
  try {
    const cardId = req.params.cardId;
    const card = await db.getCard(cardId);

    if (!card) {
      return res.status(404).send(views.renderStatusPage(
        'Card Not Registered',
        `The card code "#${cardId}" was not found in the database. Please verify the code or contact the administrator.`,
        'alert-triangle',
        'amber'
      ));
    }

    // If card has not been claimed yet -> route to Activation Wizard
    if (card.status === 'unclaimed') {
      return redirect303(req, res, `/activate/${card.id}`);
    }

    // If card is paused
    if (card.status === 'paused') {
      return res.send(views.renderStatusPage(
        'Card Temporarily Paused',
        'This card has been temporarily deactivated by its owner.',
        'pause-circle',
        'slate'
      ));
    }

    // Active Card: Record scan asynchronously
    const userAgent = req.headers['user-agent'] || '';
    const referer = req.headers['referer'] || '';
    db.recordScan(card.id, userAgent, referer);

    // MODE A: Direct Link Redirect
    if (card.redirect_type === 'direct') {
      let target = (card.target_url || '').trim();
      if (!target) {
        return res.send(views.renderStatusPage(
          'No Destination Set',
          'This card has been activated, but no destination URL is currently configured.',
          'link-2-off',
          'amber'
        ));
      }
      if (!/^https?:\/\//i.test(target)) {
        target = 'https://' + target;
      }
      return res.redirect(302, target);
    }

    // MODE B: Digital Business Card Profile View
    let profile = {};
    try {
      profile = card.profile_json ? JSON.parse(card.profile_json) : {};
    } catch (e) {}

    return res.send(views.renderProfilePage(card, profile));
  } catch (err) {
    console.error('Error handling card tap:', err);
    res.status(500).send('Internal Server Error');
  }
});

// ==========================================
// 3. VCARD DOWNLOAD ENDPOINT (.vcf)
// ==========================================
app.get('/c/:cardId/vcard', async (req, res) => {
  try {
    const card = await db.getCard(req.params.cardId);
    if (!card) return res.status(404).send('Card not found');

    let p = {};
    try {
      p = card.profile_json ? JSON.parse(card.profile_json) : {};
    } catch (e) {}

    const name = p.name || 'Card Contact';
    const vcard = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${name}`,
      `N:${name};;;;`,
      p.company ? `ORG:${p.company}` : '',
      p.title ? `TITLE:${p.title}` : '',
      p.phone ? `TEL;TYPE=CELL,VOICE:${p.phone}` : '',
      p.email ? `EMAIL;TYPE=INTERNET:${p.email}` : '',
      p.website ? `URL:${p.website}` : '',
      p.bio ? `NOTE:${p.bio.replace(/\n/g, ' ')}` : '',
      'END:VCARD'
    ].filter(Boolean).join('\r\n');

    res.setHeader('Content-Type', 'text/vcard; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${name.replace(/[^a-zA-Z0-9]/g, '_')}.vcf"`);
    res.send(vcard);
  } catch (err) {
    console.error('vCard error:', err);
    res.status(500).send('Error generating vCard');
  }
});

// ==========================================
// 4. ACTIVATION FLOW (FIRST SCAN)
// ==========================================
app.get('/activate/:cardId', async (req, res) => {
  try {
    const card = await db.getCard(req.params.cardId);
    if (!card) {
      return res.status(404).send(views.renderStatusPage('Invalid Card', 'Card does not exist.', 'x-circle', 'red'));
    }
    if (card.status !== 'unclaimed') {
      return redirect303(req, res, `/manage/${card.id}`);
    }
    res.send(views.renderActivationPage(card));
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

app.post('/activate/:cardId', async (req, res) => {
  try {
    const cardId = req.params.cardId;
    const card = await db.getCard(cardId);
    if (!card) return res.status(404).send('Card not found');

    if (card.status !== 'unclaimed') {
      req.session.flash = 'already';
      return redirect303(req, res, `/manage/${card.id}`);
    }

    const { redirect_type, target_url, password, name, title, company, phone, whatsapp, bio } = req.body;

    if (!password || password.length < 4) {
      return res.send(views.renderActivationPage(card, 'Password must be at least 4 characters.'));
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const profileData = {
      name: name || '',
      title: title || '',
      company: company || '',
      phone: phone || '',
      whatsapp: whatsapp || '',
      bio: bio || ''
    };

    await db.activateCard(cardId, {
      owner_name: name || 'Card Owner',
      owner_email: '',
      password_hash: passwordHash,
      redirect_type: redirect_type === 'profile' ? 'profile' : 'direct',
      target_url: target_url || '',
      profile_json: profileData
    });

    req.session.cardId = card.id;
    req.session.flash = 'activated';
    redirect303(req, res, `/manage/${card.id}`);
  } catch (err) {
    console.error('Activation error:', err);
    res.status(500).send('Error during activation');
  }
});

// ==========================================
// 5. CARDHOLDER MANAGEMENT PORTAL
// ==========================================
app.get('/login', async (req, res) => {
  const cardId = req.query.cardId || '';
  res.send(views.renderLoginPage(cardId));
});

app.post('/login', async (req, res) => {
  try {
    const { card_id, password } = req.body;
    const card = await db.getCard(card_id);

    if (!card) {
      return res.send(views.renderLoginPage(card_id, 'Card ID not found.'));
    }

    if (card.status === 'unclaimed') {
      return redirect303(req, res, `/activate/${card.id}`);
    }

    const match = await bcrypt.compare(password, card.password_hash || '');
    if (!match) {
      return res.send(views.renderLoginPage(card_id, 'Invalid password.'));
    }

    req.session.cardId = card.id;
    redirect303(req, res, `/manage/${card.id}`);
  } catch (err) {
    res.status(500).send('Login Error');
  }
});

app.get('/logout', (req, res) => {
  req.session.cardId = null;
  redirect303(req, res, '/');
});

app.get('/manage/:cardId', async (req, res) => {
  try {
    const cardId = req.params.cardId;
    const card = await db.getCard(cardId);
    if (!card) return res.status(404).send('Card not found');

    if (req.session.cardId !== card.id && !req.session.isAdmin) {
      return redirect303(req, res, `/login?cardId=${card.id}`);
    }

    const stats = await db.getCardStats(card.id);
    const flash = req.session.flash;
    let message = null;
    if (flash === 'activated') message = '🎉 Your card has been activated successfully!';
    else if (flash === 'updated') message = 'Changes saved successfully!';
    else if (flash === 'password') message = 'Password updated successfully!';
    else if (flash === 'already') message = 'This card is already activated — update your details below.';
    else if (req.query.activated) message = '🎉 Your card has been activated successfully!';
    else if (req.query.updated) message = 'Changes saved successfully!';
    req.session.flash = null;

    res.send(views.renderManagePage(card, stats, message));
  } catch (err) {
    res.status(500).send('Management Error');
  }
});

app.post('/manage/:cardId', async (req, res) => {
  try {
    const cardId = req.params.cardId;
    const card = await db.getCard(cardId);
    if (!card) return res.status(404).send('Card not found');

    if (req.session.cardId !== card.id && !req.session.isAdmin) {
      return res.status(403).send('Unauthorized');
    }

    const { action } = req.body;

    if (action === 'update_settings') {
      const { redirect_type, target_url, name, email, title, company, phone, whatsapp, website, linkedin, instagram, bio } = req.body;

      const profileData = {
        name,
        email,
        title,
        company,
        phone,
        whatsapp,
        website,
        linkedin,
        instagram,
        bio
      };

      await db.updateCardSettings(card.id, {
        redirect_type: redirect_type === 'profile' ? 'profile' : 'direct',
        target_url: target_url || '',
        profile_json: profileData,
        owner_name: name || card.owner_name,
        owner_email: email || card.owner_email
      });

      req.session.flash = 'updated';
      return redirect303(req, res, `/manage/${card.id}`);
    }

    if (action === 'update_password') {
      const { new_password } = req.body;
      if (!new_password || new_password.length < 4) {
        const stats = await db.getCardStats(card.id);
        return res.send(views.renderManagePage(card, stats, null, 'Password must be at least 4 characters.'));
      }
      const hash = await bcrypt.hash(new_password, 10);
      await db.updateCardPassword(card.id, hash);
      req.session.flash = 'password';
      return redirect303(req, res, `/manage/${card.id}`);
    }

    redirect303(req, res, `/manage/${card.id}`);
  } catch (err) {
    res.status(500).send('Update error');
  }
});

// ==========================================
// 6. ADMIN DASHBOARD & BATCH GENERATOR
// ==========================================
app.get('/admin', async (req, res) => {
  if (!req.session.isAdmin) {
    return res.send(views.renderAdminLoginPage());
  }
  const cards = await db.getAllCards();
  const message = req.query.msg || null;
  const error = req.query.err || null;
  res.send(views.renderAdminDashboard(cards, config.baseUrl, message, error));
});

app.post('/admin/login', (req, res) => {
  if (req.body.admin_key === config.adminKey) {
    req.session.isAdmin = true;
    redirect303(req, res, '/admin');
  } else {
    res.send(views.renderAdminLoginPage('Incorrect Admin Key.'));
  }
});

app.get('/admin/logout', (req, res) => {
  req.session.isAdmin = false;
  redirect303(req, res, '/admin');
});

// Generate and instantly download print batch (.zip)
app.post('/admin/generate-batch', async (req, res) => {
  if (!req.session.isAdmin) return res.status(403).send('Unauthorized');

  try {
    const quantity = Math.min(Math.max(parseInt(req.body.quantity) || 10, 1), 500);
    const prefix = (req.body.prefix || '').trim().toUpperCase();
    const length = Math.min(Math.max(parseInt(req.body.length) || 6, 4), 10);

    const newCards = [];
    for (let i = 0; i < quantity; i++) {
      newCards.push({
        id: generator.generateCardId(length, prefix)
      });
    }

    // Save batch to DB
    await db.createBatch(newCards);

    // Create ZIP stream
    const archive = await generator.createBatchZip(newCards, config.baseUrl);
    const filename = `opentap_batch_${quantity}_cards_${Date.now()}.zip`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    archive.pipe(res);
    await archive.finalize();
  } catch (err) {
    console.error('Batch generation error:', err);
    res.status(500).send('Failed to generate batch');
  }
});

// ==========================================
// 6b. CARD DESIGNER (artwork + QR placement -> ZIP)
// ==========================================
app.get('/admin/designer', async (req, res) => {
  if (!req.session.isAdmin) return redirect303(req, res, '/admin');
  try {
    const sampleQr = await generator.generateQrDataUrl(
      `${config.baseUrl.replace(/\/$/, '')}/c/SAMPLE`
    );
    res.send(designer.renderDesignerPage(sampleQr));
  } catch (err) {
    console.error('Designer page error:', err);
    res.status(500).send('Failed to render the Card Designer');
  }
});

// Save a design (artwork + placement recipe). Always creates a fresh id so a
// new upload never overwrites a previously generated batch's artwork.
app.post('/admin/designs', async (req, res) => {
  if (!req.session.isAdmin) return res.status(403).json({ error: 'Unauthorized' });
  try {
    const { name, frontB64, backB64, placement } = req.body || {};
    if (!frontB64 && !backB64) {
      return res.status(400).json({ error: 'Upload at least one card side.' });
    }
    if (frontB64 && !compositor.isValidDataUrl(frontB64)) {
      return res.status(400).json({ error: 'Front image is not a valid PNG/JPG.' });
    }
    if (backB64 && !compositor.isValidDataUrl(backB64)) {
      return res.status(400).json({ error: 'Back image is not a valid PNG/JPG.' });
    }
    const id = generator.generateCardId(8, 'D-');
    await db.saveDesign({
      id,
      name,
      frontB64: frontB64 || null,
      backB64: backB64 || null,
      placement: compositor.normalizePlacement(placement)
    });
    res.json({ id });
  } catch (err) {
    console.error('Save design error:', err);
    res.status(500).json({ error: 'Failed to save design' });
  }
});

// Fetch a saved design (used to restore the editor after a refresh).
app.get('/admin/designs/:id', async (req, res) => {
  if (!req.session.isAdmin) return res.status(403).json({ error: 'Unauthorized' });
  try {
    const design = await db.getDesign(req.params.id);
    if (!design) return res.status(404).json({ error: 'Design not found' });
    res.json(design);
  } catch (err) {
    console.error('Get design error:', err);
    res.status(500).json({ error: 'Failed to load design' });
  }
});

// Generate the batch: fresh card IDs in the DB, QR codes composited into the
// artwork, ZIP streamed back as the download.
app.post('/admin/generate-design', async (req, res) => {
  if (!req.session.isAdmin) return res.status(403).json({ error: 'Unauthorized' });

  try {
    const { designId, quantity, prefix, length, qr, placement, format } = req.body || {};
    const exportFormat = format === 'pdf' ? 'pdf' : 'images';

    const design = await db.getDesign(designId);
    if (!design) {
      return res.status(400).json({ error: 'Design not found - upload your artwork again.' });
    }

    const qty = Math.min(Math.max(parseInt(quantity, 10) || 10, 1), 500);
    const codeLength = Math.min(Math.max(parseInt(length, 10) || 6, 4), 10);
    const codePrefix = String(prefix || '').trim().toUpperCase().slice(0, 20);
    const normPlacement = compositor.normalizePlacement(placement);
    const qrSides = {
      front: Boolean(qr && qr.front) && Boolean(design.frontB64),
      back: Boolean(qr && qr.back) && Boolean(design.backB64)
    };
    if (!qrSides.front && !qrSides.back) {
      return res.status(400).json({ error: 'Enable the QR code on at least one side that has artwork.' });
    }

    const newCards = [];
    for (let i = 0; i < qty; i++) {
      newCards.push({ id: generator.generateCardId(codeLength, codePrefix) });
    }
    await db.createBatch(newCards);

    // Preflight: build the first card's PDF (or render one side image) BEFORE
    // sending ZIP headers so broken artwork or PDF assembly fails as clean
    // JSON instead of a corrupt download.
    if (exportFormat === 'pdf') {
      await generator.renderDesignCardPdf(newCards[0], design, normPlacement, qrSides, config.baseUrl, {});
    } else {
      const side = qrSides.front ? 'front' : 'back';
      const art = qrSides.front ? design.frontB64 : design.backB64;
      await compositor.renderCardSide({
        imageBuffer: compositor.decodeDataUrl(art).buffer,
        url: `${config.baseUrl.replace(/\/$/, '')}/c/${newCards[0].id}`,
        placement: normPlacement[side]
      });
    }

    const archive = generator.createDesignZip(newCards, design, normPlacement, qrSides, config.baseUrl, exportFormat);
    const filename = `opentap_design_batch_${qty}_cards_${Date.now()}.zip`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    archive.on('error', (err) => {
      console.error('Archive error:', err);
      if (res.headersSent) res.destroy(err);
      else res.status(500).json({ error: 'Failed to build the ZIP' });
    });
    // Pipe FIRST, then append composited images so they stream out instead of
    // piling up in memory for large batches.
    archive.pipe(res);
    await generator.appendDesignZipCards(archive, newCards, design, normPlacement, qrSides, config.baseUrl, exportFormat);
    await archive.finalize();
  } catch (err) {
    console.error('Design batch generation error:', err);
    if (res.headersSent) return res.end();
    res.status(500).json({ error: 'Failed to generate batch' });
  }
});

app.post('/admin/card/:id/reset', async (req, res) => {
  if (!req.session.isAdmin) return res.status(403).send('Unauthorized');
  await db.resetCard(req.params.id);
  redirect303(req, res, '/admin?msg=Card+reset+to+unclaimed');
});

app.post('/admin/card/:id/delete', async (req, res) => {
  if (!req.session.isAdmin) return res.status(403).send('Unauthorized');
  await db.deleteCard(req.params.id);
  redirect303(req, res, '/admin?msg=Card+deleted+successfully');
});

// Bulk wipe: clears every card (and its scan history) in two queries instead of
// clicking delete once per card. The UI gates this behind a typed confirmation.
app.post('/admin/cards/delete-all', async (req, res) => {
  if (!req.session.isAdmin) return res.status(403).send('Unauthorized');
  try {
    const { cards, scans } = await db.deleteAllCards();
    const plural = n => (n === 1 ? '' : 's');
    const msg = `Deleted all ${cards} card${plural(cards)} and ${scans} scan record${plural(scans)}`;
    redirect303(req, res, `/admin?msg=${encodeURIComponent(msg)}`);
  } catch (err) {
    console.error('Delete-all cards error:', err);
    redirect303(req, res, `/admin?err=${encodeURIComponent('Failed to delete cards: ' + err.message)}`);
  }
});

// Start Server helper
async function startServer() {
  await db.initDb();
  app.listen(config.port, () => {
    console.log(`\n🚀 OpenTap Platform is running!`);
    console.log(`🌐 Base URL:        ${config.baseUrl}`);
    console.log(`🛡️  Admin Portal:   ${config.baseUrl}/admin (Admin Key: ${config.adminKey})`);
    console.log(`📱 Sample Card:     ${config.baseUrl}/c/DEMO01\n`);
  });
}

// Support Vercel serverless export & direct node execution
if (require.main === module) {
  startServer();
}

module.exports = app;
