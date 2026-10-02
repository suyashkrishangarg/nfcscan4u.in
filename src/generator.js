const QRCode = require('qrcode');
const crypto = require('crypto');
const config = require('./config');

// Generate cryptographically secure random alphanumeric code
function generateCardId(length = 6, prefix = '') {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // exclude ambiguous 0/O, 1/I
  let result = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return prefix ? `${prefix}${result}` : result;
}

// Generate QR code SVG string
async function generateQrSvg(url) {
  return QRCode.toString(url, {
    type: 'svg',
    margin: 1,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#000000',
      light: '#ffffff'
    }
  });
}

// Generate QR code PNG buffer (high resolution for print)
async function generateQrPngBuffer(url, width = 1024) {
  return QRCode.toBuffer(url, {
    type: 'png',
    width: width,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#000000',
      light: '#ffffff'
    }
  });
}

// Generate QR data URL for inline HTML display
async function generateQrDataUrl(url) {
  return QRCode.toDataURL(url, {
    width: 250,
    margin: 1,
    errorCorrectionLevel: 'M'
  });
}

// Build a ZIP archive of a batch of cards
async function createBatchZip(cards, baseUrl = config.baseUrl) {
  // Loaded lazily so a problematic archiver can never break a function cold start.
  const archiver = require('archiver');
  const archive = archiver('zip', { zlib: { level: 9 } });

  // Generate CSV content
  let csvContent = 'Card ID,Card URL,NFC Payload,Status\r\n';
  cards.forEach(card => {
    const cardUrl = `${baseUrl.replace(/\/$/, '')}/c/${card.id}`;
    csvContent += `"${card.id}","${cardUrl}","${cardUrl}","unclaimed"\r\n`;
  });

  archive.append(csvContent, { name: 'batch_cards_list.csv' });

  // Add print instructions
  const instructions = `=====================================================
NFC & DYNAMIC QR CARDS - PRINT & ENCODING INSTRUCTIONS
=====================================================

1. PRINTING THE QR CODE:
   - For Vector Software (Adobe Illustrator, InDesign, CorelDraw, Figma):
     Use the SVG files in the 'qr_svg' folder. They are crisp vector graphics with no pixelation.
   - For Raster / Canva / Photoshop:
     Use the PNG files in the 'qr_png' folder (1024x1024 high resolution).
   - Recommended minimum print size: 15mm x 15mm (0.6" x 0.6").
   - Recommended placement: Back of card or bottom corner.

2. ENCODING THE NFC CHIP:
   - Target Chips: NTAG213, NTAG215, or NTAG216.
   - Use any free smartphone app (e.g. 'NFC Tools' on iOS / Android) or a desktop USB NFC writer (ACR122U).
   - Write Record: Type 'URL' / 'URI'.
   - Value: The URL corresponding to each card found in 'batch_cards_list.csv'.
   - Both the QR code and the NFC chip must point to the EXACT same URL!

3. ACTIVATION & CLAIMING:
   - No PIN is required. On the first tap or scan the cardholder simply picks a
     destination link (or digital profile) and sets a management password.
=====================================================
`;
  archive.append(instructions, { name: 'PRINT_AND_NFC_INSTRUCTIONS.txt' });

  // Add SVGs and PNGs to the archive
  for (const card of cards) {
    const cardUrl = `${baseUrl.replace(/\/$/, '')}/c/${card.id}`;
    
    // SVG
    const svgContent = await generateQrSvg(cardUrl);
    archive.append(svgContent, { name: `qr_svg/${card.id}.svg` });

    // PNG
    const pngBuffer = await generateQrPngBuffer(cardUrl, 1024);
    archive.append(pngBuffer, { name: `qr_png/${card.id}.png` });
  }

  return archive;
}

// Build a ZIP of print-ready card artwork from an Admin Card Designer batch.
// Each card on a QR-enabled side gets its own composited image with a unique
// QR baked in; sides without a QR are stored once (common_<side>.<ext>)
// because every card would otherwise carry an identical copy.
//
// This part is cheap (CSV + instructions + validation) and runs BEFORE the
// response is piped; call `appendDesignZipCards` after piping so composited
// images stream out instead of piling up in memory.
function createDesignZip(cards, design, placement, qrSides, baseUrl = config.baseUrl, format = 'images') {
  const archiver = require('archiver'); // lazy: never breaks unrelated cold starts
  const compositor = require('./compositor');
  const archive = archiver('zip', { zlib: { level: 9 } });

  const base = String(baseUrl || '').replace(/\/$/, '');

  // Card list CSV (shared by print + NFC encoding workflows)
  let csvContent = 'Card ID,Card URL,NFC Payload,Status\r\n';
  cards.forEach(card => {
    const cardUrl = `${base}/c/${card.id}`;
    csvContent += `"${card.id}","${cardUrl}","${cardUrl}","unclaimed"\r\n`;
  });
  archive.append(csvContent, { name: 'batch_cards_list.csv' });

  // Fail fast (before headers are sent) if an artwork data URL is invalid.
  const sides = [
    { key: 'front', b64: design.frontB64, qr: Boolean(qrSides.front) },
    { key: 'back', b64: design.backB64, qr: Boolean(qrSides.back) }
  ].filter(s => s.b64);
  for (const s of sides) {
    if (!compositor.decodeDataUrl(s.b64)) throw new Error(`Design ${s.key} image is invalid`);
  }

  // Format-specific ZIP layout: the image export ships one file per QR side
  // (plus shared QR-less sides), the PDF export ships one 2-page PDF per card
  // (page 1 = front, page 2 = back).
  const isPdf = format === 'pdf';
  const contentsBlock = isPdf
    ? `  cards/<CARD-ID>.pdf
      One PDF per card: page 1 = front of the card, page 2 = back. The same
      composited artwork as the image export (unique QR baked in where enabled,
      plain artwork otherwise). Pages are ISO/IEC 7810 ID-1 size (85.6 x 54 mm).`
    : `  cards/<CARD-ID>_front.* / cards/<CARD-ID>_back.*
      Print-ready card artwork with that card's unique QR code composited in
      at the placement you configured in the Card Designer. One file per card,
      for each side that has a QR code enabled.
  common_front.* / common_back.*
      Side WITHOUT a QR code (if any). Identical for every card in the batch -
      print it once for all cards.`;
  const printBlock = isPdf
    ? `1. PRINTING:
   - Pages are ISO/IEC 7810 ID-1 card size (85.6 x 54 mm), artwork edge to
     edge. Print at actual size; add 3mm bleed as required by your printer.
   - The file name carries the CARD ID, so each PDF maps to one physical card.
   - Recommended minimum QR print size: 15mm x 15mm (0.6" x 0.6").`
    : `1. PRINTING:
   - Print at 300 DPI. Standard card size: 3.375" x 2.125" (85.6 x 54 mm),
     add 3mm bleed as required by your printer.
   - Front and back files share the same CARD ID in their file names, so they
     are easy to pair up during imposition.
   - Recommended minimum QR print size: 15mm x 15mm (0.6" x 0.6").`;

  const instructions = `=====================================================
NFC & DYNAMIC QR CARDS - PRINT & NFC ENCODING INSTRUCTIONS
(DESIGN BATCH - ${isPdf ? 'PDF export, one card per file' : 'artwork with QR codes baked in'})
=====================================================

ZIP CONTENTS:
${contentsBlock}
  batch_cards_list.csv
      Card ID + URL for every card in this batch.

${printBlock}

2. ENCODING THE NFC CHIP:
   - Target Chips: NTAG213, NTAG215, or NTAG216.
   - Use any free smartphone app (e.g. 'NFC Tools' on iOS / Android) or a
     desktop USB NFC writer (ACR122U).
   - Write Record: Type 'URL' / 'URI'.
   - Value: The URL for each card from 'batch_cards_list.csv'.
   - The QR code and the NFC chip must point to the EXACT same URL!

3. ACTIVATION & CLAIMING:
   - No PIN is required. On the first tap or scan the cardholder simply picks a
     destination link (or digital profile) and sets a management password.
=====================================================
`;
  archive.append(instructions, { name: 'PRINT_AND_NFC_INSTRUCTIONS.txt' });

  return archive;
}

// Builds the PDF for ONE card: pages in print order (front, then back), using
// the QR-composited artwork for QR-enabled sides and the plain artwork for
// the rest. `commonCache` memoises the shared QR-less sides across a batch.
async function renderDesignCardPdf(card, design, normPlacement, qrSides, baseUrl, commonCache = {}) {
  const compositor = require('./compositor');
  const pdfcard = require('./pdfcard');
  const base = String(baseUrl || '').replace(/\/$/, '');

  const pages = [];
  for (const side of ['front', 'back']) {
    const b64 = side === 'front' ? design.frontB64 : design.backB64;
    if (!b64) continue; // side has no artwork -> no page
    const src = compositor.decodeDataUrl(b64).buffer;
    let out;
    if (qrSides[side]) {
      out = await compositor.renderCardSide({
        imageBuffer: src,
        url: `${base}/c/${card.id}`,
        placement: normPlacement[side]
      });
    } else {
      if (!commonCache[side]) commonCache[side] = await compositor.passthroughSide(src);
      out = commonCache[side];
    }
    pages.push({ buffer: out.buffer, mime: out.mime });
  }

  return pdfcard.buildCardPdf(pages, `${card.id} - OpenTap card`);
}

// Heavy part of the design ZIP: composite each card's QR into the artwork and
// append the images. Call this AFTER the response has been piped so composited
// images stream out instead of accumulating in memory.
async function appendDesignZipCards(archive, cards, design, placement, qrSides, baseUrl = config.baseUrl, format = 'images') {
  const compositor = require('./compositor');
  const base = String(baseUrl || '').replace(/\/$/, '');
  const normPlacement = compositor.normalizePlacement(placement);

  // PDF export: one 2-page PDF per card (page 1 front, page 2 back). The
  // QR-less artwork is composed once and shared across every card.
  if (format === 'pdf') {
    const commonCache = {};
    for (const card of cards) {
      const pdfBuf = await renderDesignCardPdf(card, design, normPlacement, qrSides, base, commonCache);
      archive.append(pdfBuf, { name: `cards/${card.id}.pdf` });
    }
    return;
  }

  const sides = [
    { key: 'front', b64: design.frontB64, qr: Boolean(qrSides.front) },
    { key: 'back', b64: design.backB64, qr: Boolean(qrSides.back) }
  ].filter(s => s.b64);
  const decoded = sides.map(s => ({ ...s, buffer: compositor.decodeDataUrl(s.b64).buffer }));

  // Per-card composited images for the QR-enabled sides
  for (const s of decoded) {
    if (!s.qr) continue;
    for (const card of cards) {
      const url = `${base}/c/${card.id}`;
      const out = await compositor.renderCardSide({
        imageBuffer: s.buffer,
        url,
        placement: normPlacement[s.key]
      });
      archive.append(out.buffer, { name: `cards/${card.id}_${s.key}.${out.ext}` });
    }
  }

  // QR-less sides: one shared copy for the whole batch
  for (const s of decoded) {
    if (s.qr) continue;
    const out = await compositor.passthroughSide(s.buffer);
    archive.append(out.buffer, { name: `common_${s.key}.${out.ext}` });
  }
}

module.exports = {
  generateCardId,
  generateQrSvg,
  generateQrPngBuffer,
  generateQrDataUrl,
  createBatchZip,
  createDesignZip,
  renderDesignCardPdf,
  appendDesignZipCards
};
