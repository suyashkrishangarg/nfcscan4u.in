// ==========================================
// Card Designer – PDF export (one card per file)
// ==========================================
// Builds one print-ready PDF per card: page 1 = front artwork, page 2 = back
// (each side composited with that card's unique QR where enabled). Pages use
// the ISO/IEC 7810 ID-1 (CR80) card size so printers can output at physical
// size. pdf-lib is pure JS (no native deps) and is loaded lazily, matching the
// repo convention for heavy modules.

const MM_PER_INCH = 25.4;
const PT_PER_INCH = 72;
const CARD_W_MM = 85.6;
const CARD_H_MM = 54;

const PAGE_W = (CARD_W_MM * PT_PER_INCH) / MM_PER_INCH; // 242.65 pt
const PAGE_H = (CARD_H_MM * PT_PER_INCH) / MM_PER_INCH; // 153.07 pt

// pages: ordered [{ buffer, mime }] - front first, back second.
async function buildCardPdf(pages, title) {
  const { PDFDocument } = require('pdf-lib');
  const doc = await PDFDocument.create();
  doc.setCreator('OpenTap Card Designer');
  doc.setProducer('OpenTap Card Designer');
  if (title) doc.setTitle(title);

  for (const p of pages) {
    const bytes = toOwnedU8(p.buffer);
    const img = p.mime === 'image/png'
      ? await doc.embedPng(bytes)
      : await doc.embedJpg(bytes);
    const page = doc.addPage([PAGE_W, PAGE_H]);
    // Artwork is drawn edge-to-edge. The designer keeps the card aspect, so
    // this maps 1:1 onto the composited image files of the image export.
    page.drawImage(img, { x: 0, y: 0, width: PAGE_W, height: PAGE_H });
  }

  return Buffer.from(await doc.save());
}

// pdf-lib reads image data via `new DataView(imageData.buffer)`, ignoring any
// byteOffset. Node Buffers are often views into a shared 64 KB pool, so that
// would make pdf-lib read another allocation's bytes (SOI errors, or worse,
// silently corrupt images depending on pool state). Hand it a standalone
// Uint8Array that owns exactly its own data.
function toOwnedU8(buf) {
  if (buf instanceof Uint8Array &&
      buf.byteOffset === 0 &&
      buf.byteLength === buf.buffer.byteLength) {
    return buf; // already owns its whole backing ArrayBuffer
  }
  return new Uint8Array(buf); // copies just this view's bytes
}

module.exports = { buildCardPdf, PAGE_W, PAGE_H };