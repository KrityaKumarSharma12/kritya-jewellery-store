const PDFDocument = require('pdfkit');

/**
 * Stream a jewellery invoice PDF into the HTTP response.
 *
 * @param {object} invoice - The invoice record (already serialized to plain JS numbers)
 * @param {object} order   - Optional order record for extra context
 * @param {NodeJS.WritableStream} stream - res (Express response)
 * @param {object} store   - { name, address, phone, email, gstNumber, logoUrl }
 */
function streamInvoicePdf(invoice, order, stream, store = {}) {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });

  doc.pipe(stream);

  const GOLD = '#b48b3f';
  const DARK = '#1f2937';
  const MUTED = '#6b7280';
  const LIGHT = '#f5f5f5';

  const pageWidth = doc.page.width;
  const margin = 50;
  const contentWidth = pageWidth - margin * 2;

  // ---------- HEADER ----------
  doc
    .fontSize(22)
    .fillColor(GOLD)
    .font('Helvetica-Bold')
    .text(store.name || "Kritya's Jewellery", margin, 50);

  doc
    .fontSize(9)
    .fillColor(MUTED)
    .font('Helvetica')
    .text(store.address || 'Lucknow, India', margin, 78)
    .text(store.phone || '', margin, 90)
    .text(store.email || '', margin, 102);

  if (store.gstNumber) {
    doc.text(`GSTIN: ${store.gstNumber}`, margin, 114);
  }

  // Right-aligned "INVOICE"
  doc
    .fontSize(26)
    .fillColor(DARK)
    .font('Helvetica-Bold')
    .text('INVOICE', 0, 50, { align: 'right', width: pageWidth - margin });

  doc
    .fontSize(10)
    .fillColor(MUTED)
    .font('Helvetica')
    .text(`#${invoice.invoiceNumber}`, 0, 86, { align: 'right', width: pageWidth - margin })
    .text(
      `Date: ${new Date(invoice.generatedAt).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric',
      })}`,
      0, 100, { align: 'right', width: pageWidth - margin }
    )
    .text(`Order: #${invoice.orderId?.slice(-8) || ''}`, 0, 114, {
      align: 'right', width: pageWidth - margin,
    });

  // Divider
  doc
    .moveTo(margin, 140)
    .lineTo(pageWidth - margin, 140)
    .strokeColor('#e5e7eb')
    .lineWidth(1)
    .stroke();

  // ---------- BILL TO + SHIP TO ----------
  const billY = 160;

  doc
    .fontSize(9)
    .fillColor(MUTED)
    .font('Helvetica-Bold')
    .text('BILL TO', margin, billY);

  doc
    .fontSize(11)
    .fillColor(DARK)
    .font('Helvetica-Bold')
    .text(invoice.customerName || 'Customer', margin, billY + 14);

  doc
    .fontSize(9)
    .fillColor(MUTED)
    .font('Helvetica')
    .text(invoice.customerEmail || '', margin, billY + 30)
    .text(invoice.customerPhone || '', margin, billY + 43)
    .text(invoice.customerAddress || '', margin, billY + 56, {
      width: contentWidth / 2 - 20,
    });

  // Payment info (right column)
  doc
    .fontSize(9)
    .fillColor(MUTED)
    .font('Helvetica-Bold')
    .text('PAYMENT', margin + contentWidth / 2, billY);

  doc
    .fontSize(10)
    .fillColor(DARK)
    .font('Helvetica')
    .text(`Method: ${invoice.paymentMethod || '—'}`, margin + contentWidth / 2, billY + 14)
    .text(`Status: ${invoice.paymentStatus || '—'}`, margin + contentWidth / 2, billY + 28);

  // ---------- ITEMS TABLE ----------
  let tableY = 260;

  const colX = {
    item: margin,
    qty: margin + contentWidth * 0.62,
    price: margin + contentWidth * 0.74,
    amount: margin + contentWidth * 0.86,
  };

  // header row
  doc.rect(margin, tableY - 6, contentWidth, 24).fill(LIGHT);

  doc
    .fontSize(9)
    .fillColor(DARK)
    .font('Helvetica-Bold')
    .text('ITEM', colX.item + 6, tableY)
    .text('QTY', colX.qty, tableY, { width: 40, align: 'right' })
    .text('PRICE', colX.price, tableY, { width: 60, align: 'right' })
    .text('AMOUNT', colX.amount, tableY, { width: 70, align: 'right' });

  tableY += 26;

  const items = Array.isArray(invoice.items) ? invoice.items : [];

  items.forEach((item) => {
    const rowHeight = 22;

    doc
      .fontSize(10)
      .fillColor(DARK)
      .font('Helvetica')
      .text(item.name || 'Item', colX.item + 6, tableY + 4, {
        width: contentWidth * 0.6 - 12,
        ellipsis: true,
      });

    doc
      .fontSize(10)
      .fillColor(DARK)
      .font('Helvetica')
      .text(String(item.quantity || 0), colX.qty, tableY + 4, { width: 40, align: 'right' })
      .text(
        `₹${Number(item.price || 0).toLocaleString('en-IN')}`,
        colX.price, tableY + 4, { width: 60, align: 'right' }
      )
      .text(
        `₹${(Number(item.price || 0) * Number(item.quantity || 0)).toLocaleString('en-IN')}`,
        colX.amount, tableY + 4, { width: 70, align: 'right' }
      );

    tableY += rowHeight;

    doc
      .moveTo(margin, tableY - 2)
      .lineTo(pageWidth - margin, tableY - 2)
      .strokeColor('#f0f0f0')
      .lineWidth(0.5)
      .stroke();
  });

  // ---------- TOTALS ----------
  tableY += 16;

  const totalsX = margin + contentWidth * 0.6;
  const totalsW = contentWidth * 0.4;

  const line = (label, value, bold = false) => {
    doc
      .font(bold ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(bold ? 11 : 10)
      .fillColor(bold ? DARK : MUTED)
      .text(label, totalsX, tableY, { width: totalsW * 0.5, align: 'left' });

    doc
      .font(bold ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(bold ? 11 : 10)
      .fillColor(bold ? GOLD : DARK)
      .text(value, totalsX + totalsW * 0.5, tableY, {
        width: totalsW * 0.5, align: 'right',
      });

    tableY += bold ? 20 : 16;
  };

  const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  line('Subtotal', fmt(invoice.subtotal));
  if (Number(invoice.discount) > 0) line('Discount', `-${fmt(invoice.discount)}`);
  line('Tax (GST)', fmt(invoice.tax));
  line('Shipping', fmt(invoice.shipping));

  doc
    .moveTo(totalsX, tableY - 2)
    .lineTo(pageWidth - margin, tableY - 2)
    .strokeColor('#e5e7eb')
    .lineWidth(1)
    .stroke();

  tableY += 6;
  line('TOTAL', fmt(invoice.total), true);

  // ---------- FOOTER ----------
  doc
    .fontSize(9)
    .fillColor(MUTED)
    .font('Helvetica')
    .text(
      'Thank you for shopping with us. For any queries, contact us at ' +
        (store.email || 'support@krityas.com'),
      margin,
      doc.page.height - 80,
      { width: contentWidth, align: 'center' }
    );

  doc
    .fontSize(8)
    .fillColor('#9ca3af')
    .text(
      'This is a computer-generated invoice and does not require a signature.',
      margin,
      doc.page.height - 62,
      { width: contentWidth, align: 'center' }
    );

  doc.end();
}

module.exports = { streamInvoicePdf };