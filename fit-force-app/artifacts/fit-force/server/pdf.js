// Renders a PT plan into a real, text-based PDF (not a screenshot) using
// pdfkit, so plans can be downloaded directly instead of going through the
// browser's print dialog (which is all expo-print can do on web).

const PDFDocument = require('pdfkit');

function renderPlanPdf(plan) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48, size: 'A4' });
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const accent = plan.type === 'fit' ? '#2E7D32' : '#E65100';

    doc.fontSize(10).fillColor(accent)
      .text(plan.type === 'fit' ? 'FIT PLAN' : 'REHABILITATION PLAN', { characterSpacing: 1 });
    doc.moveDown(0.3);
    doc.fontSize(20).fillColor('#1A1A1A').text(plan.title);
    doc.moveDown(0.2);
    doc.fontSize(10).fillColor('#555555')
      .text(`Week ${plan.weekNumber}  •  ${plan.days.length} days  •  Prepared by ${plan.createdByName}`);
    doc.moveDown(0.6);
    doc.fontSize(11).fillColor('#333333').text(plan.description, { lineGap: 3 });
    doc.moveDown(1);

    plan.days.forEach((day, i) => {
      if (i > 0) doc.moveDown(0.8);

      const titleY = doc.y;
      doc.fontSize(13).fillColor('#1A1A1A').text(day.day, { continued: true });
      doc.fontSize(13).fillColor('#777777').text(`  —  ${day.focus}`);
      doc.moveTo(48, doc.y + 2).lineTo(547, doc.y + 2).strokeColor(accent).lineWidth(1.5).stroke();
      doc.moveDown(0.4);

      day.exercises.forEach(ex => {
        doc.fontSize(10.5).fillColor('#1A1A1A').text(ex.name, { continued: true, indent: 8 });
        doc.fontSize(10.5).fillColor(accent).text(`  —  ${ex.target}`);
        if (ex.notes) {
          doc.fontSize(9.5).fillColor('#777777').text(ex.notes, { indent: 8 });
        }
        doc.moveDown(0.25);
      });
    });

    doc.end();
  });
}

module.exports = { renderPlanPdf };
