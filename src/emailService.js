const nodemailer = require('nodemailer');

const SMTP_USER = process.env.SMTP_USER || 'vs.backup25@gmail.com';
const SMTP_PASS = (process.env.SMTP_PASS || '').replace(/\s+/g, '');
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = Number(process.env.SMTP_PORT) || 587;
const EMAIL_FROM = process.env.EMAIL_FROM || `Akash Engineering <${SMTP_USER}>`;

function createTransporter() {
  if (!SMTP_PASS) {
    return null;
  }
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    },
    tls: {
      rejectUnauthorized: false
    }
  });
}

/**
 * Send welcome email with login credentials when Employee or Client account is created.
 */
async function sendAccountCredentialsEmail({ name, email, password, role, employeeId, designation }) {
  if (!email) return { success: false, message: 'Recipient email is missing' };

  const isClient = role === 'CLIENT' || role === 'USER';
  const roleLabel = isClient ? 'Client Portal' : 'Employee Staff Portal';
  const subject = `Welcome to Akash Engineering - Your ${roleLabel} Account Credentials`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
        .header { background: linear-gradient(135deg, #1e3a8a, #2563eb); padding: 24px 30px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 20px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
        .header p { margin: 6px 0 0 0; font-size: 12px; opacity: 0.9; }
        .content { padding: 30px; }
        .greeting { font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
        .text { font-size: 13.5px; line-height: 1.6; color: #475569; margin-bottom: 20px; }
        .card { background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 8px; padding: 18px 22px; margin-bottom: 22px; }
        .card-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13.5px; }
        .card-row:last-child { margin-bottom: 0; }
        .card-label { font-weight: 600; color: #64748b; }
        .card-val { font-weight: 700; color: #0f172a; font-family: monospace; font-size: 14px; }
        .btn-wrap { text-align: center; margin: 26px 0 10px 0; }
        .btn { background: #2563eb; color: #ffffff !important; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 700; font-size: 14px; display: inline-block; }
        .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px 30px; font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.5; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>AKASH ENGINEERING</h1>
          <p>Engineers, Contractors & General Order Suppliers</p>
        </div>
        <div class="content">
          <div class="greeting">Hello ${name || 'User'},</div>
          <div class="text">
            Your account has been officially registered on the <strong>Akash Engineering Enterprise Management Portal</strong> as a <strong>${role || 'User'}</strong>.
            You can now log in using the credentials generated below:
          </div>

          <div class="card">
            <div class="card-row">
              <span class="card-label">Assigned Role:</span>
              <span class="card-val" style="color: #2563eb;">${role || 'EMPLOYEE'}</span>
            </div>
            ${employeeId ? `
            <div class="card-row">
              <span class="card-label">Employee ID:</span>
              <span class="card-val">${employeeId}</span>
            </div>
            ` : ''}
            ${designation ? `
            <div class="card-row">
              <span class="card-label">Designation:</span>
              <span class="card-val">${designation}</span>
            </div>
            ` : ''}
            <div class="card-row">
              <span class="card-label">Username (Email):</span>
              <span class="card-val">${email}</span>
            </div>
            <div class="card-row">
              <span class="card-label">Temporary Password:</span>
              <span class="card-val" style="color: #dc2626; background: #fee2e2; padding: 2px 8px; border-radius: 4px;">${password}</span>
            </div>
          </div>

          <div class="text" style="font-size: 12px; color: #64748b;">
            ⚠️ For security purposes, please do not share your login credentials with anyone. We recommend updating your password after logging in for the first time.
          </div>

          <div class="btn-wrap">
            <a href="http://localhost:5173" class="btn" target="_blank">Access Portal Login</a>
          </div>
        </div>
        <div class="footer">
          AKASH ENGINEERING &bull; Kolkata, West Bengal<br/>
          GSTIN: 19AIYPH5363D1ZU &bull; Email: ${SMTP_USER}<br/>
          This is an automated system notification. Please do not reply directly to this email.
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `Welcome to Akash Engineering\n\nHello ${name},\nYour account has been created on the Akash Engineering Enterprise Portal.\n\nRole: ${role}\n${employeeId ? `Employee ID: ${employeeId}\n` : ''}Username (Email): ${email}\nPassword: ${password}\n\nPlease log in at http://localhost:5173`;

  const transporter = createTransporter();
  if (!transporter) {
    console.log(`[Email Service Notice] SMTP_PASS is empty in .env. Simulated credentials notification for ${email} (${name}): Password=${password}`);
    return {
      success: true,
      delivered: false,
      simulated: true,
      message: `Account created. Email delivery configured for ${SMTP_USER} (set SMTP_PASS in .env for live dispatch).`
    };
  }

  try {
    const info = await transporter.sendMail({
      from: EMAIL_FROM,
      to: email,
      subject,
      text: textContent,
      html: htmlContent
    });
    console.log(`[Email Service] Credentials email sent successfully to ${email}. MessageId: ${info.messageId}`);
    return { success: true, delivered: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[Email Service Error] Failed to send credentials email to ${email}:`, err.message);
    return { success: false, delivered: false, error: err.message };
  }
}

/**
 * Send quotation proposal details email to Client when Quotation is created.
 */
async function sendQuotationEmail({
  quotationNumber,
  clientName,
  clientEmail,
  subject,
  kindAttention,
  items,
  totalAmount,
  discount,
  gstAmount,
  grandTotal,
  validUntil,
  preface,
  bankDetails
}) {
  if (!clientEmail) return { success: false, message: 'Client email is missing' };

  const validUntilStr = validUntil ? new Date(validUntil).toISOString().slice(0, 10) : '30 days from issuance';
  const mailSubject = `Quotation #${quotationNumber} from Akash Engineering - ${subject || 'Commercial Proposal'}`;

  let parsedItems = [];
  try {
    parsedItems = Array.isArray(items) ? items : (typeof items === 'string' ? JSON.parse(items) : []);
  } catch (e) {
    parsedItems = [];
  }

  const itemsRows = parsedItems.map((it, idx) => `
    <tr>
      <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #334155;">${idx + 1}</td>
      <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #0f172a;">
        <strong>${it.name || 'Product / Service Item'}</strong>
        ${it.code ? `<span style="font-size: 10px; color: #64748b; margin-left: 4px;">[${it.code}]</span>` : ''}
        ${it.description ? `<div style="font-size: 11px; color: #64748b; margin-top: 3px;">${it.description}</div>` : ''}
      </td>
      <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px; text-align: right; color: #334155;">${it.qty || 1}</td>
      <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px; text-align: right; color: #334155;">₹${Number(it.unitPrice || 0).toLocaleString()}</td>
      <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px; text-align: right; font-weight: 700; color: #0f172a;">₹${Number(it.total || ((it.qty || 1) * (it.unitPrice || 0))).toLocaleString()}</td>
    </tr>
  `).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
        .container { max-width: 680px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
        .header { background: linear-gradient(135deg, #1e3a8a, #2563eb); padding: 24px 30px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 20px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
        .header p { margin: 6px 0 0 0; font-size: 12px; opacity: 0.9; }
        .doc-bar { background: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 12px 30px; display: flex; justify-content: space-between; align-items: center; font-size: 13px; }
        .content { padding: 26px 30px; }
        .subject-box { background: #eff6ff; border-left: 4px solid #2563eb; padding: 10px 14px; border-radius: 4px; margin-bottom: 18px; font-size: 13px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        th { background: #0f172a; color: #ffffff; font-size: 11px; text-transform: uppercase; font-weight: 700; padding: 8px 10px; text-align: left; }
        .totals-table { width: 280px; margin-left: auto; margin-bottom: 20px; }
        .totals-table td { padding: 4px 10px; font-size: 12px; }
        .grand-total { font-size: 14px; font-weight: 800; color: #1e40af; background: #eff6ff; }
        .bank-box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px 18px; margin-bottom: 20px; }
        .bank-title { font-size: 11px; font-weight: 700; color: #1e3a8a; text-transform: uppercase; margin-bottom: 8px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 4px; }
        .bank-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 14px; font-size: 12px; }
        .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px 30px; font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.5; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>AKASH ENGINEERING</h1>
          <p>Engineers, Contractors & General Order Suppliers &bull; Kolkata, WB</p>
        </div>

        <div class="content">
          <div style="display: flex; justify-content: space-between; margin-bottom: 16px; font-size: 12.5px;">
            <div>
              <strong>Quotation Ref No:</strong> <span style="color: #2563eb; font-weight: 700;">${quotationNumber}</span><br/>
              <strong>Date:</strong> ${new Date().toISOString().slice(0, 10)}<br/>
              <strong>Valid Until:</strong> ${validUntilStr}
            </div>
            <div style="text-align: right;">
              <strong>Billed To:</strong><br/>
              <span style="font-weight: 700; color: #0f172a;">${clientName}</span><br/>
              ${kindAttention ? `Attn: ${kindAttention}<br/>` : ''}
              ${clientEmail}
            </div>
          </div>

          <div class="subject-box">
            <strong>Subject:</strong> <span>${subject || 'Commercial Quotation / Proposal'}</span>
          </div>

          ${preface ? `
            <div style="font-size: 12px; color: #475569; margin-bottom: 14px; background: #f8fafc; padding: 8px 12px; border-radius: 4px; line-height: 1.5;">
              ${preface.replace(/\n/g, '<br/>')}
            </div>
          ` : ''}

          <!-- Items Table -->
          <table>
            <thead>
              <tr>
                <th style="width: 30px;">#</th>
                <th>Item / Description</th>
                <th style="text-align: right; width: 50px;">Qty</th>
                <th style="text-align: right; width: 90px;">Rate (₹)</th>
                <th style="text-align: right; width: 95px;">Total (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>

          <!-- Financial Totals -->
          <table class="totals-table">
            <tr>
              <td>Subtotal:</td>
              <td style="text-align: right;">₹${Number(totalAmount || 0).toLocaleString()}</td>
            </tr>
            ${Number(discount) > 0 ? `
            <tr>
              <td>Discount (${discount}%):</td>
              <td style="text-align: right; color: #16a34a;">- ₹${Math.round((Number(totalAmount) || 0) * (Number(discount) / 100)).toLocaleString()}</td>
            </tr>
            ` : ''}
            <tr>
              <td>GST (18%):</td>
              <td style="text-align: right;">₹${Number(gstAmount || 0).toLocaleString()}</td>
            </tr>
            <tr class="grand-total">
              <td style="font-weight: 800;">Grand Total:</td>
              <td style="text-align: right; font-weight: 800;">₹${Number(grandTotal || 0).toLocaleString()}</td>
            </tr>
          </table>

          <!-- Bank Details -->
          ${bankDetails && (bankDetails.bankName || bankDetails.accountNumber) ? `
            <div class="bank-box">
              <div class="bank-title">🏦 Bank Settlement Details</div>
              <div class="bank-grid">
                ${bankDetails.bankName ? `<div><strong>Bank:</strong> ${bankDetails.bankName}</div>` : ''}
                ${bankDetails.accountNumber ? `<div><strong>A/C No:</strong> ${bankDetails.accountNumber}</div>` : ''}
                ${bankDetails.accountHolderName ? `<div><strong>A/C Holder:</strong> ${bankDetails.accountHolderName}</div>` : ''}
                ${bankDetails.bankIdentifierCode ? `<div><strong>IFSC Code:</strong> ${bankDetails.bankIdentifierCode}</div>` : ''}
                ${bankDetails.branchLocation ? `<div><strong>Branch:</strong> ${bankDetails.branchLocation}</div>` : ''}
              </div>
            </div>
          ` : ''}

          <div style="font-size: 12px; color: #64748b; margin-top: 15px; line-height: 1.5;">
            Thank you for considering Akash Engineering. Please let us know if you have any questions or wish to proceed with work order confirmation.
          </div>
        </div>

        <div class="footer">
          AKASH ENGINEERING &bull; Kolkata, West Bengal<br/>
          GSTIN: 19AIYPH5363D1ZU &bull; Email: ${SMTP_USER}<br/>
          Generated from Akash Engineering Quotation System
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `AKASH ENGINEERING - QUOTATION #${quotationNumber}\n\nClient: ${clientName}\nSubject: ${subject}\nValid Until: ${validUntilStr}\nGrand Total: ₹${Number(grandTotal || 0).toLocaleString()}\n\nPlease review your quotation proposal.`;

  const transporter = createTransporter();
  if (!transporter) {
    console.log(`[Email Service Notice] SMTP_PASS is empty in .env. Simulated quotation email for ${clientEmail} (Quotation #${quotationNumber}, Amount ₹${grandTotal})`);
    return {
      success: true,
      delivered: false,
      simulated: true,
      message: `Quotation created. Email dispatch configured for ${SMTP_USER} (set SMTP_PASS in .env for live dispatch).`
    };
  }

  try {
    const info = await transporter.sendMail({
      from: EMAIL_FROM,
      to: clientEmail,
      subject: mailSubject,
      text: textContent,
      html: htmlContent
    });
    console.log(`[Email Service] Quotation email sent successfully to ${clientEmail}. MessageId: ${info.messageId}`);
    return { success: true, delivered: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[Email Service Error] Failed to send quotation email to ${clientEmail}:`, err.message);
    return { success: false, delivered: false, error: err.message };
  }
}

module.exports = {
  sendAccountCredentialsEmail,
  sendQuotationEmail,
  SMTP_USER
};
