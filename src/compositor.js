// ==========================================
// Card Designer – server-side image compositing
// ==========================================
// Renders a card artwork with a QR code baked in at a saved placement.
// Placement model (mirrored exactly by the browser editor):
//   x, y     – QR CENTER as a fraction of the card width / height (0..1)
//   size     – QR side length (the QR is square) as a fraction of card WIDTH
//   rotation – degrees, -180..180
//
// `sharp` is loaded lazily (like `archiver`) so a problematic native module can
// never break a function cold start for unrelated routes.

const QRCode = require('qrcode');

const DATA_URL_RE = /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=\s]+$/;

function clamp(v, min, max) {
  v = Number(v);
  if (!Number.isFinite(v)) v = min;
  return Math.min(Math.max(v, min), max);
}

// Validate/repair a placement object coming from the client.
function normalizePlacement(raw) {
  const out = {};
  for (const side of ['front', 'back']) {
    const s = (raw && typeof raw === 'object' && raw[side]) || {};
    out[side] = {
      x: clamp(s.x, 0, 1),
      y: clamp(s.y, 0, 1),
      size: clamp(s.size, 0.03, 0.6),
      rotation: clamp(s.rotation, -180, 180)
    };
  }
  return out;
}

function isValidDataUrl(dataUrl) {
  return typeof dataUrl === 'string' && dataUrl.length > 0 && DATA_URL_RE.test(dataUrl);
}

function decodeDataUrl(dataUrl) {
  if (!isValidDataUrl(dataUrl)) return null;
  const comma = dataUrl.indexOf(',');
  const mime = dataUrl.slice(5, dataUrl.indexOf(';'));
  return {
    buffer: Buffer.from(dataUrl.slice(comma + 1), 'base64'),
    mime
  };
}

// A rotated square's bounding box grows by (|cos| + |sin|) times its side.
// Capping the QR size by this factor guarantees it always fits on the card,
// which lets us clamp the center into valid bounds (never a negative offset).
function rotationFactor(degrees) {
  const rad = (degrees * Math.PI) / 180;
  return Math.abs(Math.cos(rad)) + Math.abs(Math.sin(rad));
}

// Compose one printed side: artwork buffer + unique QR url -> image buffer.
// Returns { buffer, ext, mime }.
async function renderCardSide({ imageBuffer, url, placement }) {
  const sharp = require('sharp');

  const meta = await sharp(imageBuffer).metadata();
  const cardW = meta.width || 1;
  const cardH = meta.height || 1;
  const hasAlpha = Boolean(meta.hasAlpha) && meta.format !== 'jpeg';

  const p = normalizePlacement({ front: placement }).front;
  const factor = rotationFactor(p.rotation);
  // QR side in pixels: fraction of card width, shrunk if rotation demands it.
  const maxSize = Math.floor(Math.min(cardW, cardH) / factor);
  const sizePx = Math.max(32, Math.min(Math.round(p.size * cardW), maxSize));

  // Render the QR directly at final size so modules land on whole pixels
  // (crisp at print size). The quiet zone matches the editor's preview.
  const qrBuf = await QRCode.toBuffer(url, {
    type: 'png',
    width: sizePx,
    margin: 4,
    errorCorrectionLevel: 'M',
    color: { dark: '#000000', light: '#ffffff' }
  });

  let overlay = qrBuf;
  let bw = sizePx;
  let bh = sizePx;
  if (Math.round(((p.rotation % 360) + 360) % 360) !== 0) {
    overlay = await sharp(qrBuf)
      .rotate(((p.rotation % 360) + 360) % 360, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    const om = await sharp(overlay).metadata();
    bw = om.width || sizePx;
    bh = om.height || sizePx;
  }

  // Clamp the rotated bounding box fully inside the card (same rule the
  // editor uses while dragging), then compute the top-left offset.
  const cx = bw >= cardW ? cardW / 2 : clamp(p.x * cardW, bw / 2, cardW - bw / 2);
  const cy = bh >= cardH ? cardH / 2 : clamp(p.y * cardH, bh / 2, cardH - bh / 2);
  const left = Math.max(0, Math.round(cx - bw / 2));
  const top = Math.max(0, Math.round(cy - bh / 2));

  const pipeline = sharp(imageBuffer).composite([{ input: overlay, left, top }]);

  if (hasAlpha) {
    return { buffer: await pipeline.png().toBuffer(), ext: 'png', mime: 'image/png' };
  }
  return {
    buffer: await pipeline.jpeg({ quality: 92, chromaSubsampling: '4:4:4' }).toBuffer(),
    ext: 'jpg',
    mime: 'image/jpeg'
  };
}

// Re-encode an artwork unchanged (used for the shared, QR-less side so the ZIP
// carries one copy instead of N identical files).
async function passthroughSide(imageBuffer) {
  const sharp = require('sharp');
  const meta = await sharp(imageBuffer).metadata();
  if (meta.format === 'png' && meta.hasAlpha) return { buffer: imageBuffer, ext: 'png', mime: 'image/png' };
  if (meta.format === 'jpeg' || meta.format === 'jpg') return { buffer: imageBuffer, ext: 'jpg', mime: 'image/jpeg' };
  // Anything else (webp, gif, …) gets normalised to JPEG.
  return {
    buffer: await sharp(imageBuffer).jpeg({ quality: 92 }).toBuffer(),
    ext: 'jpg',
    mime: 'image/jpeg'
  };
}

module.exports = {
  clamp,
  normalizePlacement,
  isValidDataUrl,
  decodeDataUrl,
  rotationFactor,
  renderCardSide,
  passthroughSide
};