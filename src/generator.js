const QRCode = require('qrcode');
const archiver = require('archiver');
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

module.exports = {
  generateCardId,
  generateQrSvg,
  generateQrPngBuffer,
  generateQrDataUrl,
  createBatchZip
};
