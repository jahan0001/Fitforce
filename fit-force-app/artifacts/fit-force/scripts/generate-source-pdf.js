// Generates a single PDF containing the full frontend + shared-server source
// code, for submission/archival purposes. Run with: node scripts/generate-source-pdf.js

const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const ROOT = path.join(__dirname, '..');
const OUT_PATH = path.join(ROOT, '..', '..', 'FitForce_Frontend_Source_Code.pdf');

const CONFIG_FILES = ['package.json', 'app.json', 'babel.config.js', 'metro.config.js', 'tsconfig.json'];

const SOURCE_DIRS = ['lib', 'hooks', 'context', 'constants', 'components', 'app', 'server'];

function collectFiles(dir, base) {
  const out = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'uploads' || entry.name === 'data-store.json') continue;
    const full = path.join(dir, entry.name);
    const rel = path.relative(base, full).split(path.sep).join('/');
    if (entry.isDirectory()) {
      out.push(...collectFiles(full, base));
    } else if (/\.(tsx|ts|js)$/.test(entry.name)) {
      out.push(rel);
    }
  }
  return out;
}

const files = [
  ...CONFIG_FILES.filter(f => fs.existsSync(path.join(ROOT, f))),
  ...SOURCE_DIRS.flatMap(d => collectFiles(path.join(ROOT, d), ROOT)),
];

const doc = new PDFDocument({ margin: 40, size: 'A4', bufferPages: true });
doc.pipe(fs.createWriteStream(OUT_PATH));

// Cover page
doc.font('Helvetica-Bold').fontSize(26).fillColor('#1B5E3B').text('Fit Force', { align: 'center' });
doc.moveDown(0.3);
doc.font('Helvetica').fontSize(14).fillColor('#333').text('Frontend Source Code', { align: 'center' });
doc.moveDown(0.5);
doc.fontSize(10).fillColor('#666').text(`Generated ${new Date().toISOString().slice(0, 10)}  •  ${files.length} files`, { align: 'center' });

for (const rel of files) {
  const full = path.join(ROOT, rel);
  let content;
  try {
    content = fs.readFileSync(full, 'utf8');
  } catch (e) {
    continue;
  }

  doc.addPage();
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#1B5E3B').text(rel);
  doc.moveTo(doc.x, doc.y + 2).lineTo(555, doc.y + 2).strokeColor('#1B5E3B').lineWidth(1).stroke();
  doc.moveDown(0.6);

  doc.font('Courier').fontSize(7.5).fillColor('#1A1A1A');
  const lines = content.split('\n');
  const numbered = lines.map((line, i) => `${String(i + 1).padStart(4, ' ')}  ${line}`).join('\n');
  doc.text(numbered, { lineGap: 1 });
}

// Page numbers (footer), skipping the cover page.
const range = doc.bufferedPageRange();
for (let i = 1; i < range.count; i++) {
  doc.switchToPage(i);
  doc.font('Helvetica').fontSize(8).fillColor('#999')
    .text(`${i} / ${range.count - 1}`, 40, 810, { width: 515, align: 'center' });
}

doc.end();

console.log(`Wrote ${files.length} files to ${OUT_PATH}`);
