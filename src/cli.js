const fs = require('fs');
const path = require('path');
const config = require('./config');
const db = require('./db');
const generator = require('./generator');

async function runCli() {
  const args = process.argv.slice(2);
  let count = 10;
  let prefix = '';
  let length = 6;
  let baseUrl = config.baseUrl;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--count' || args[i] === '-n') {
      count = parseInt(args[i + 1]) || 10;
      i++;
    } else if (args[i] === '--prefix' || args[i] === '-p') {
      prefix = (args[i + 1] || '').toUpperCase();
      i++;
    } else if (args[i] === '--length' || args[i] === '-l') {
      length = parseInt(args[i + 1]) || 6;
      i++;
    } else if (args[i] === '--url' || args[i] === '-u') {
      baseUrl = args[i + 1];
      i++;
    }
  }

  console.log(`\n======================================================`);
  console.log(`📦 OpenTap Batch Generator CLI`);
  console.log(`======================================================`);
  console.log(`- Quantity:       ${count} cards`);
  console.log(`- Prefix:         ${prefix || '(none)'}`);
  console.log(`- Code Length:    ${length} characters`);
  console.log(`- Base URL:       ${baseUrl}`);
  console.log(`------------------------------------------------------`);

  await db.initDb();

  const outputDir = path.join(__dirname, '../output', `batch_${Date.now()}`);
  const svgDir = path.join(outputDir, 'qr_svg');
  const pngDir = path.join(outputDir, 'qr_png');

  fs.mkdirSync(svgDir, { recursive: true });
  fs.mkdirSync(pngDir, { recursive: true });

  const cards = [];
  let csvContent = 'Card ID,Card URL,NFC Payload,Status\r\n';

  for (let i = 0; i < count; i++) {
    const cardId = generator.generateCardId(length, prefix);
    const cardUrl = `${baseUrl.replace(/\/$/, '')}/c/${cardId}`;

    cards.push({ id: cardId });
    csvContent += `"${cardId}","${cardUrl}","${cardUrl}","unclaimed"\r\n`;

    // Write vector SVG
    const svg = await generator.generateQrSvg(cardUrl);
    fs.writeFileSync(path.join(svgDir, `${cardId}.svg`), svg);

    // Write 300 DPI high-res PNG
    const pngBuffer = await generator.generateQrPngBuffer(cardUrl, 1024);
    fs.writeFileSync(path.join(pngDir, `${cardId}.png`), pngBuffer);

    process.stdout.write(`\rGenerating cards: [${i + 1}/${count}] ${cardId}`);
  }

  // Save to Database
  await db.createBatch(cards);

  // Write CSV
  fs.writeFileSync(path.join(outputDir, 'batch_cards_list.csv'), csvContent);

  // Write Print instructions
  const instructions = `=====================================================
NFC & DYNAMIC QR CARDS - PRINT & ENCODING INSTRUCTIONS
=====================================================

1. PRINTING THE QR CODE:
   - Vector files (for Illustrator/Figma/InDesign): Look inside the 'qr_svg' folder.
   - High-Res PNG files (for Canva/Photoshop): Look inside the 'qr_png' folder.
   - Recommended size: 15mm x 15mm or larger.

2. ENCODING THE NFC CHIP (NTAG213 / 215 / 216):
   - Use 'NFC Tools' mobile app (iOS / Android).
   - Write -> Add Record -> Custom URL / URI.
   - Enter the Card URL from 'batch_cards_list.csv'.

3. ACTIVATION:
   - No PIN required. The first tap/scan opens the claim page where the
     cardholder picks a destination and sets a management password.
`;
  fs.writeFileSync(path.join(outputDir, 'PRINT_INSTRUCTIONS.txt'), instructions);

  console.log(`\n\n✅ Done! Generated ${count} cards successfully!`);
  console.log(`📁 Files saved in: ${outputDir}\n`);
  process.exit(0);
}

runCli().catch(err => {
  console.error('\n❌ CLI Error:', err);
  process.exit(1);
});
