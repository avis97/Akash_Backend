const PDFDocument = require('pdfkit');

function formatTermsList(configInput) {
  if (!configInput) return [];
  let config = configInput;
  if (typeof configInput === 'string') {
    try {
      config = JSON.parse(configInput);
    } catch (e) {
      return [configInput];
    }
  }
  if (!config || typeof config !== 'object') return [];

  const list = [];
  if (config.validity) {
    list.push(`Quotation is valid for ${config.validity} only.`);
  }
  if (config.gstRate) {
    list.push(`GST ${config.gstRate}.`);
  }
  if (config.additionalCharges !== false) {
    list.push(`Additional charges will be applicable for all other materials and works except that mentioned therein in the above quotation.`);
  }
  if (config.jobAccess !== false) {
    list.push(`All necessary job accesses and permission should be arranged and ensured from client end.`);
  }
  if (config.shutdownRequired !== false) {
    list.push(`Shut down of the system must be required for the job and that should be arranged from client end.`);
  }
  if (config.officeHoursOnly !== false) {
    list.push(`The job will be carried out at office hours/ day hours only.`);
  }
  if (config.electricalPower !== false) {
    list.push(`Necessary electrical power should be provided from the client end.`);
  }
  if (config.storageSpace !== false) {
    list.push(`A space should be arranged to stay/ keep tools and materials from client end.`);
  }
  if (config.tankFilled) {
    list.push(`The tank/ reservoir should be filled up from end as required for the job.`);
  }
  if (config.localHazard !== false) {
    list.push(`Local hazard (if any) should be handled/ settled by the client.`);
  }
  if (config.actualQuantityOption === 'actual_delivered_only') {
    list.push(`Invoice will be raised against actual delivered quantity.`);
  } else if (config.actualQuantityOption !== 'none') {
    list.push(`Invoice will be raised against actual delivered quantity and work executed therewith.`);
  }
  if (config.completionTime) {
    const timeText = config.completionTime === 'custom' ? (config.completionTimeCustom || 'As agreed') : config.completionTime;
    list.push(`Job completion time: ${timeText}.`);
  }
  if (config.paymentTerms === 'option_b') {
    list.push(`Payment should be made 50% as advance along with work order and the balance amount should be released in full within seven days of job completion.`);
  } else if (config.paymentTerms !== 'none') {
    list.push(`Payment should be made 40% as advance along with work order. More 30% should be released on delivery of materials at site. The balance amount should be released in full within seven days of job completion.`);
  }
  if (config.customTermsText && config.customTermsText.trim()) {
    config.customTermsText.split('\n').forEach(t => {
      if (t.trim()) list.push(t.trim());
    });
  }

  return list;
}

/**
 * Generates an executive, professional PDF buffer for Akash Engineering Quotations.
 */
function generateQuotationPdfBuffer(quotation) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 40,
        size: 'A4',
        bufferPages: true
      });

      const buffers = [];
      doc.on('data', chunk => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', err => reject(err));

      const pageWidth = 595.28;
      const margin = 40;
      const contentWidth = pageWidth - (margin * 2); // 515.28

      // 1. Header / Letterhead
      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(20).text('AKASH ENGINEERING', { align: 'center' });
      doc.fillColor('#334155').font('Helvetica-Bold').fontSize(8.5).text('ENGINEERS, CONTRACTORS & GENERAL ORDER SUPPLIERS', { align: 'center', characterSpacing: 0.5 });
      doc.moveDown(0.2);
      doc.fillColor('#64748b').font('Helvetica').fontSize(8).text('Regd. Office: Kolkata, West Bengal | GSTIN: 19AIYPH5363D1ZU | Email: vs.backup25@gmail.com', { align: 'center' });
      doc.moveDown(0.5);

      // Divider Line
      doc.strokeColor('#1e3a8a').lineWidth(1.5).moveTo(margin, doc.y).lineTo(pageWidth - margin, doc.y).stroke();
      doc.moveDown(0.6);

      // 2. Title & Ref Bar
      const startTitleY = doc.y;
      doc.fillColor('#1e3a8a').font('Helvetica-Bold').fontSize(14).text(quotation.documentHead || 'QUOTATION / PROPOSAL', margin, startTitleY);
      
      const refText = `Ref: ${quotation.quotationNumber || 'AKASH/QTN/25-26'}`;
      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(10).text(refText, margin, startTitleY, { align: 'right', width: contentWidth });
      doc.moveDown(0.8);

      // 3. Two-Column Metadata Box (Billed To vs Quotation Info)
      const boxY = doc.y;
      const colWidth = (contentWidth - 15) / 2;

      // Left Box: Billed To
      doc.rect(margin, boxY, colWidth, 90).fillAndStroke('#f8fafc', '#e2e8f0');
      doc.fillColor('#64748b').font('Helvetica-Bold').fontSize(7.5).text('BILLED TO / CLIENT DETAILS', margin + 8, boxY + 8);
      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(10.5).text(quotation.clientName || 'Valued Client', margin + 8, boxY + 20, { width: colWidth - 16 });
      
      let clientSubText = '';
      if (quotation.kindAttention) clientSubText += `Attn: ${quotation.kindAttention}\n`;
      if (quotation.clientEmail) clientSubText += `Email: ${quotation.clientEmail}\n`;
      if (quotation.clientPhone) clientSubText += `Phone: ${quotation.clientPhone}\n`;
      if (quotation.clientAddress) clientSubText += `Address: ${quotation.clientAddress.slice(0, 45)}\n`;
      if (quotation.clientGst) clientSubText += `GSTIN: ${quotation.clientGst}`;
      doc.fillColor('#475569').font('Helvetica').fontSize(8).text(clientSubText.trim(), margin + 8, boxY + 34, { width: colWidth - 16, lineGap: 1.5 });

      // Right Box: Quotation Details
      const rightColX = margin + colWidth + 15;
      doc.rect(rightColX, boxY, colWidth, 90).fillAndStroke('#f8fafc', '#e2e8f0');
      doc.fillColor('#64748b').font('Helvetica-Bold').fontSize(7.5).text('DOCUMENT DETAILS', rightColX + 8, boxY + 8);
      
      const createdDateStr = quotation.createdAt ? new Date(quotation.createdAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
      const validUntilStr = quotation.validUntil ? new Date(quotation.validUntil).toISOString().slice(0, 10) : '30 days from issuance';
      
      const detailsList = [
        `Quotation Date: ${createdDateStr}`,
        `Valid Until: ${validUntilStr}`,
        `Payment Currency: INR (Rs.)`,
        `Commercial Status: Confirmed Proposal`
      ].join('\n');
      doc.fillColor('#0f172a').font('Helvetica').fontSize(8.5).text(detailsList, rightColX + 8, boxY + 24, { width: colWidth - 16, lineGap: 3.5 });

      doc.y = boxY + 98;

      // 4. Subject Box (if present)
      if (quotation.subject) {
        const subjY = doc.y;
        doc.rect(margin, subjY, contentWidth, 24).fillAndStroke('#eff6ff', '#bfdbfe');
        doc.fillColor('#1e40af').font('Helvetica-Bold').fontSize(8.5).text(`Subject: ${quotation.subject}`, margin + 8, subjY + 7, { width: contentWidth - 16 });
        doc.y = subjY + 28;
      }

      // 5. Preface Note (if present)
      if (quotation.preface) {
        doc.fillColor('#475569').font('Helvetica-Oblique').fontSize(8).text(quotation.preface, margin, doc.y, { width: contentWidth, lineGap: 1.5 });
        doc.moveDown(0.5);
      }

      // 6. Items Table
      let parsedItems = [];
      try {
        parsedItems = Array.isArray(quotation.items) ? quotation.items : (typeof quotation.items === 'string' ? JSON.parse(quotation.items) : (quotation.itemsJson ? JSON.parse(quotation.itemsJson) : []));
      } catch (e) {
        parsedItems = [];
      }
      if (!parsedItems.length) {
        parsedItems = [{ name: 'Equipment Supply & Technical Service', qty: 1, unitPrice: quotation.totalAmount || quotation.grandTotal || 0, total: quotation.totalAmount || quotation.grandTotal || 0 }];
      }

      // Column widths: # (30), Name (235), Qty (45), Unit Price (100), Total (105) = 515
      const colW = { sl: 28, desc: 237, qty: 45, rate: 100, total: 105 };
      const tableX = margin;
      let currentY = doc.y;

      // Table Header Row
      doc.rect(tableX, currentY, contentWidth, 20).fill('#0f172a');
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8);
      doc.text('#', tableX + 5, currentY + 6, { width: colW.sl, align: 'center' });
      doc.text('ITEM DESCRIPTION & SPECIFICATION', tableX + colW.sl + 8, currentY + 6, { width: colW.desc - 8, align: 'left' });
      doc.text('QTY', tableX + colW.sl + colW.desc, currentY + 6, { width: colW.qty, align: 'center' });
      doc.text('UNIT RATE (Rs.)', tableX + colW.sl + colW.desc + colW.qty, currentY + 6, { width: colW.rate - 5, align: 'right' });
      doc.text('TOTAL (Rs.)', tableX + colW.sl + colW.desc + colW.qty + colW.rate, currentY + 6, { width: colW.total - 8, align: 'right' });
      currentY += 20;

      // Table Data Rows
      parsedItems.forEach((it, idx) => {
        const rowBg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
        const hasDesc = Boolean(it.description || it.code);
        const rowHeight = hasDesc ? 28 : 20;

        // Check if page overflow
        if (currentY + rowHeight > 730) {
          doc.addPage();
          currentY = 40;
        }

        doc.rect(tableX, currentY, contentWidth, rowHeight).fillAndStroke(rowBg, '#e2e8f0');

        doc.fillColor('#475569').font('Helvetica').fontSize(8);
        doc.text(String(idx + 1), tableX + 5, currentY + 6, { width: colW.sl, align: 'center' });

        doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(8.5);
        let itemTitle = it.name || 'Equipment Supply / Service Item';
        if (it.code) itemTitle += ` [${it.code}]`;
        doc.text(itemTitle, tableX + colW.sl + 8, currentY + 5, { width: colW.desc - 10, ellipsis: true });

        if (it.description) {
          doc.fillColor('#64748b').font('Helvetica').fontSize(7.5).text(it.description, tableX + colW.sl + 8, currentY + 16, { width: colW.desc - 10, ellipsis: true });
        }

        doc.fillColor('#334155').font('Helvetica').fontSize(8);
        doc.text(String(it.qty || it.quantity || 1), tableX + colW.sl + colW.desc, currentY + 6, { width: colW.qty, align: 'center' });

        const rateNum = Number(it.unitPrice || 0);
        doc.text(rateNum.toLocaleString('en-IN', { minimumFractionDigits: 2 }), tableX + colW.sl + colW.desc + colW.qty, currentY + 6, { width: colW.rate - 5, align: 'right' });

        const totalNum = Number(it.total || (rateNum * (it.qty || 1)));
        doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(8.5);
        doc.text(totalNum.toLocaleString('en-IN', { minimumFractionDigits: 2 }), tableX + colW.sl + colW.desc + colW.qty + colW.rate, currentY + 6, { width: colW.total - 8, align: 'right' });

        currentY += rowHeight;
      });

      doc.y = currentY + 6;

      // 7. Financial Summary Box (Right-Aligned)
      const subtotalVal = Number(quotation.totalAmount) || 0;
      const discountPercent = Number(quotation.discount) || 0;
      const discountAmt = discountPercent > 0 ? Math.round(subtotalVal * (discountPercent / 100)) : 0;
      const gstVal = Number(quotation.gstAmount) || 0;
      const grandTotalVal = Number(quotation.grandTotal) || (subtotalVal - discountAmt + gstVal);

      const totalsBoxWidth = 240;
      const totalsBoxX = pageWidth - margin - totalsBoxWidth;
      let totY = doc.y;

      const renderTotalRow = (label, valueStr, isBold = false, isHighlight = false, color = '#0f172a') => {
        if (isHighlight) {
          doc.rect(totalsBoxX, totY, totalsBoxWidth, 20).fillAndStroke('#eff6ff', '#bfdbfe');
        }
        doc.fillColor(color).font(isBold ? 'Helvetica-Bold' : 'Helvetica').fontSize(isHighlight ? 10 : 8.5);
        doc.text(label, totalsBoxX + 8, totY + (isHighlight ? 5 : 2), { width: 120, align: 'left' });
        doc.text(valueStr, totalsBoxX + 130, totY + (isHighlight ? 5 : 2), { width: 102, align: 'right' });
        totY += isHighlight ? 22 : 16;
      };

      renderTotalRow('Subtotal:', `Rs. ${subtotalVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
      if (discountPercent > 0) {
        renderTotalRow(`Discount (${discountPercent}%):`, `- Rs. ${discountAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, false, false, '#16a34a');
      }
      renderTotalRow('GST (18%):', `Rs. ${gstVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
      renderTotalRow('Grand Total:', `Rs. ${grandTotalVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, true, true, '#1e40af');

      doc.y = totY + 8;

      // 8. Bank Settlement Details Box
      const bName = 'HDFC Bank Ltd';
      const bAcc = '50200106616314';
      const bHolder = 'Akash Engineering';
      const bIfsc = 'HDFC0000022';
      const bBranch = 'Golpark';

      const bankBoxY = doc.y;
      if (bankBoxY + 50 > 750) doc.addPage();
      
      doc.rect(margin, doc.y, contentWidth, 42).fillAndStroke('#f8fafc', '#cbd5e1');
      doc.fillColor('#1e3a8a').font('Helvetica-Bold').fontSize(8).text('BANK SETTLEMENT DETAILS (FOR RTGS / NEFT / IMPS)', margin + 8, doc.y + 6);
      
      const bankLine1 = `Bank: ${bName}  |  A/C Number: ${bAcc}  |  IFSC Code: ${bIfsc}`;
      const bankLine2 = `Beneficiary: ${bHolder}  |  Branch: ${bBranch}`;
      doc.fillColor('#334155').font('Helvetica').fontSize(7.5).text(bankLine1, margin + 8, doc.y + 18);
      doc.fillColor('#334155').font('Helvetica').fontSize(7.5).text(bankLine2, margin + 8, doc.y + 29);
      doc.y = doc.y + 48;

      // 9. Terms and Conditions
      const termsList = formatTermsList(quotation.termsAndConditions);
      if (termsList.length > 0) {
        if (doc.y + 70 > 750) doc.addPage();
        doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(8.5).text('TERMS & CONDITIONS:', margin, doc.y);
        doc.moveDown(0.2);
        termsList.forEach((term, tIdx) => {
          if (doc.y + 14 > 760) doc.addPage();
          doc.fillColor('#475569').font('Helvetica').fontSize(7.5).text(`${tIdx + 1}. ${term}`, margin + 6, doc.y, { width: contentWidth - 12, lineGap: 1.5 });
          doc.moveDown(0.15);
        });
      }

      // 10. Signature Box
      if (doc.y + 55 > 760) doc.addPage();
      doc.moveDown(1);
      const sigY = doc.y;
      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(8.5).text('For AKASH ENGINEERING', pageWidth - margin - 160, sigY, { width: 160, align: 'center' });
      doc.moveDown(2);
      doc.strokeColor('#94a3b8').lineWidth(1).moveTo(pageWidth - margin - 150, doc.y).lineTo(pageWidth - margin - 10, doc.y).stroke();
      doc.fillColor('#64748b').font('Helvetica').fontSize(7.5).text('Authorized Signatory', pageWidth - margin - 160, doc.y + 4, { width: 160, align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  generateQuotationPdfBuffer,
  formatTermsList
};
