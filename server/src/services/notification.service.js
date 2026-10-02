/**
 * Notification & Email Automation Service for SSISM IMS
 * 
 * Provides automated email receipts with full laptop and user details for:
 * - SEND_LAPTOP_ISSUED_EMAIL: Triggered when an asset is allocated / issued
 * - SEND_LAPTOP_RETURNED_EMAIL: Triggered when an asset is returned / submitted
 * 
 * Scalable Architecture:
 * - Uses Nodemailer for production SMTP delivery (Gmail, Outlook, Amazon SES, or custom college mail server).
 * - Reads config from environment variables (ENABLE_EMAIL_NOTIFICATIONS, SMTP_HOST, SMTP_USER, etc.).
 * - If SMTP credentials are not yet configured or ENABLE_EMAIL_NOTIFICATIONS=false,
 *   it safely logs the complete formatted email receipt to the server console and audit trail.
 */

import nodemailer from 'nodemailer';
import { isFacultyOrEmployee } from '../utils/emailService.js';

/**
 * Check if real email delivery is enabled and SMTP is configured
 */
const isEmailEnabled = () => {
  return process.env.ENABLE_EMAIL_NOTIFICATIONS === 'true';
};

/**
 * Format date for user-friendly display in receipts
 */
const formatDate = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

/**
 * Format datetime for clearance certificates
 */
const formatDateTime = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Create or reuse nodemailer transporter
 */
let cachedTransporter = null;
const getTransporter = () => {
  if (cachedTransporter) return cachedTransporter;

  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT) || 587;
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    return null;
  }

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  });

  return cachedTransporter;
};

/**
 * Generate rich, modern HTML email template for Laptop Allocation Receipt
 */
export const generateIssueReceiptHtml = (data) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SSISM IT Hardware Allocation Receipt</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
    .container { max-width: 650px; margin: 0 auto; background: #ffffff; border-radius: 14px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #ffffff; padding: 28px 24px; text-align: center; border-bottom: 3px solid #F26522; }
    .header h1 { margin: 0; font-size: 18px; text-transform: uppercase; letter-spacing: 1px; font-weight: 800; }
    .header p { margin: 5px 0 0; font-size: 12px; color: #cbd5e1; text-transform: uppercase; letter-spacing: 1.5px; }
    .receipt-badge { display: inline-block; margin-top: 14px; background: rgba(242, 101, 34, 0.15); border: 1px solid #F26522; color: #F26522; font-size: 12px; font-weight: 700; padding: 4px 14px; rounded: 20px; border-radius: 20px; font-family: monospace; }
    .content { padding: 24px; }
    .greeting { font-size: 14px; line-height: 1.6; margin-bottom: 20px; }
    .section-title { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; color: #64748b; margin: 20px 0 10px; border-bottom: 1px solid #f1f5f9; padding-bottom: 5px; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; margin-bottom: 16px; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .data-table td { padding: 7px 4px; vertical-align: top; }
    .data-table td.label { width: 35%; color: #64748b; font-weight: 600; }
    .data-table td.value { width: 65%; color: #0f172a; font-weight: 700; }
    .highlight-tag { background: #fff7ed; color: #ea580c; border: 1px solid #fdba74; padding: 2px 8px; border-radius: 6px; font-family: monospace; font-size: 13px; font-weight: 800; display: inline-block; }
    .terms-box { background: #fffbeb; border: 1px solid #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 12px 14px; font-size: 11.5px; color: #92400e; line-height: 1.6; margin-top: 20px; }
    .footer { background: #f1f5f9; padding: 18px 24px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; }
    .footer a { color: #F26522; text-decoration: none; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>SHRI SHIVAJI INSTITUTE OF SCIENCE & MANAGEMENT</h1>
      <p>Institutional IT Hardware Custody & Allocation Record</p>
      <div class="receipt-badge">RECEIPT #${data.receiptRef || `REC-ALLOC-${String(data.allocationId).padStart(5, '0')}`}</div>
    </div>

    <div class="content">
      <div class="greeting">
        Dear <strong>${data.recipientName}</strong>,<br>
        This official notification confirms the institutional allocation of an SSISM IT hardware laptop asset to your custody. Details of the assigned equipment and handover undertaking are recorded below:
      </div>

      <div class="section-title">1. Recipient Information</div>
      <div class="card">
        <table class="data-table">
          <tr>
            <td class="label">Full Name:</td>
            <td class="value">${data.recipientName}</td>
          </tr>
          <tr>
            <td class="label">Roll / Employee ID:</td>
            <td class="value"><span style="font-family: monospace;">${data.rollNumberOrEmpId}</span> (${data.recipientRole})</td>
          </tr>
          <tr>
            <td class="label">Academic Dept:</td>
            <td class="value">${data.departmentName || 'General Campus'}</td>
          </tr>
          <tr>
            <td class="label">Registered Email:</td>
            <td class="value">${data.recipientEmail || 'N/A'}</td>
          </tr>
          <tr>
            <td class="label">Contact Mobile:</td>
            <td class="value">${data.recipientPhone || 'N/A'}</td>
          </tr>
        </table>
      </div>

      <div class="section-title">2. Hardware Asset Specifications</div>
      <div class="card">
        <table class="data-table">
          <tr>
            <td class="label">Asset Tag:</td>
            <td class="value"><span class="highlight-tag">${data.assetTag}</span></td>
          </tr>
          <tr>
            <td class="label">Device Make & Model:</td>
            <td class="value">${data.makeModel}</td>
          </tr>
          <tr>
            <td class="label">Hardware Serial No:</td>
            <td class="value" style="font-family: monospace;">${data.serialNumber}</td>
          </tr>
          <tr>
            <td class="label">Specs (CPU/RAM/SSD):</td>
            <td class="value">${data.processorRamStorage}</td>
          </tr>
          <tr>
            <td class="label">Charger Serial / OEM:</td>
            <td class="value">${data.chargerSerial}</td>
          </tr>
          <tr>
            <td class="label">Issued Accessories:</td>
            <td class="value">${data.accessories}</td>
          </tr>
          <tr>
            <td class="label">Handover Condition:</td>
            <td class="value"><span style="color: #16a34a; font-weight: 800;">${data.issueCondition} (Tested & Working)</span></td>
          </tr>
        </table>
      </div>

      <div class="section-title">3. Custody & Handover Timeline</div>
      <div class="card">
        <table class="data-table">
          <tr>
            <td class="label">Issue / Handover Date:</td>
            <td class="value">${data.issuedAt}</td>
          </tr>
          <tr>
            <td class="label">Scheduled Return Due:</td>
            <td class="value" style="color: #ea580c;">${data.dueDate}</td>
          </tr>
          <tr>
            <td class="label">Authorized By:</td>
            <td class="value">${data.issuedByName}</td>
          </tr>
          ${data.notes ? `
          <tr>
            <td class="label">Handover Remarks:</td>
            <td class="value" style="font-weight: 500; font-style: italic;">${data.notes}</td>
          </tr>` : ''}
        </table>
      </div>

      <div class="terms-box">
        <strong>Institutional Undertaking & Custody Terms:</strong><br>
        1. This laptop is property of Shri Shivaji Institute of Science & Management (SSISM) assigned exclusively for academic and institutional research use.<br>
        2. The recipient is responsible for safe custody and reasonable care. Any hardware damage, cracked display, missing charger, or loss must be reported immediately to the IT Desk.<br>
        3. The asset must be presented for mandatory physical audits and surrendered upon semester completion, graduation, or administrative recall.
      </div>
    </div>

    <div class="footer">
      This is an automated institutional receipt generated by <strong>SSISM Asset & Inventory Management Portal</strong>.<br>
      For technical support or inquiries, visit the Campus IT Hardware Department.
    </div>
  </div>
</body>
</html>
  `.trim();
};

/**
 * Generate rich HTML email template for Laptop Return Clearance Certificate
 */
export const generateReturnClearanceHtml = (data) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SSISM IT Asset Return Clearance Certificate</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
    .container { max-width: 650px; margin: 0 auto; background: #ffffff; border-radius: 14px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: linear-gradient(135deg, #064e3b 0%, #0f172a 100%); color: #ffffff; padding: 28px 24px; text-align: center; border-bottom: 3px solid #10b981; }
    .header h1 { margin: 0; font-size: 18px; text-transform: uppercase; letter-spacing: 1px; font-weight: 800; }
    .header p { margin: 5px 0 0; font-size: 12px; color: #a7f3d0; text-transform: uppercase; letter-spacing: 1.5px; }
    .clearance-badge { display: inline-block; margin-top: 14px; background: rgba(16, 185, 129, 0.2); border: 1px solid #10b981; color: #a7f3d0; font-size: 12px; font-weight: 800; padding: 4px 16px; border-radius: 20px; font-family: monospace; }
    .content { padding: 24px; }
    .greeting { font-size: 14px; line-height: 1.6; margin-bottom: 20px; }
    .section-title { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; color: #64748b; margin: 20px 0 10px; border-bottom: 1px solid #f1f5f9; padding-bottom: 5px; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; margin-bottom: 16px; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .data-table td { padding: 7px 4px; vertical-align: top; }
    .data-table td.label { width: 35%; color: #64748b; font-weight: 600; }
    .data-table td.value { width: 65%; color: #0f172a; font-weight: 700; }
    .highlight-tag { background: #f0fdf4; color: #15803d; border: 1px solid #86efac; padding: 2px 8px; border-radius: 6px; font-family: monospace; font-size: 13px; font-weight: 800; display: inline-block; }
    .success-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-left: 4px solid #10b981; border-radius: 8px; padding: 14px; font-size: 12px; color: #166534; line-height: 1.6; margin-top: 20px; }
    .fine-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px; margin-top: 10px; font-size: 12px; color: #991b1b; }
    .footer { background: #f1f5f9; padding: 18px 24px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>SHRI SHIVAJI INSTITUTE OF SCIENCE & MANAGEMENT</h1>
      <p>IT Hardware Asset Return & Clearance Certificate</p>
      <div class="clearance-badge">CERTIFICATE #${data.clearanceRef || `REC-CLEAR-${String(data.allocationId).padStart(5, '0')}`}</div>
    </div>

    <div class="content">
      <div class="greeting">
        Dear <strong>${data.recipientName}</strong>,<br>
        This official clearance acknowledges that the assigned laptop asset has been physically inspected and returned to the SSISM IT Hardware Department. Custody has been successfully discharged.
      </div>

      <div class="section-title">1. Surrendered Hardware Details</div>
      <div class="card">
        <table class="data-table">
          <tr>
            <td class="label">Asset Tag:</td>
            <td class="value"><span class="highlight-tag">${data.assetTag}</span></td>
          </tr>
          <tr>
            <td class="label">Device Make & Model:</td>
            <td class="value">${data.makeModel}</td>
          </tr>
          <tr>
            <td class="label">Hardware Serial No:</td>
            <td class="value" style="font-family: monospace;">${data.serialNumber}</td>
          </tr>
        </table>
      </div>

      <div class="section-title">2. Physical Inspection & Clearance</div>
      <div class="card">
        <table class="data-table">
          <tr>
            <td class="label">Return Physical Condition:</td>
            <td class="value">
              <span style="color: ${data.returnCondition === 'DAMAGED' ? '#dc2626' : '#16a34a'}; font-weight: 800;">
                ${data.returnCondition}
              </span>
            </td>
          </tr>
          <tr>
            <td class="label">Penalty / Defect Assessment:</td>
            <td class="value">${data.fineAmount} (${data.finePaid})</td>
          </tr>
          ${data.fineReason && data.fineReason !== 'None' ? `
          <tr>
            <td class="label">Assessment Reason:</td>
            <td class="value" style="color: #b91c1c;">${data.fineReason}</td>
          </tr>` : ''}
          <tr>
            <td class="label">Surrender Accepted At:</td>
            <td class="value">${data.returnedAt}</td>
          </tr>
          <tr>
            <td class="label">Inspected & Verified By:</td>
            <td class="value">${data.acceptedByName}</td>
          </tr>
          ${data.notes ? `
          <tr>
            <td class="label">Inspection Remarks:</td>
            <td class="value" style="font-weight: 500; font-style: italic;">${data.notes}</td>
          </tr>` : ''}
        </table>
      </div>

      <div class="success-box">
        <strong>✓ OFFICIAL CUSTODY CLEARANCE GRANTED:</strong><br>
        The laptop hardware record has been closed in the SSISM central database. Your student/employee inventory profile is clear with respect to this asset. Please retain this email as proof of surrender for no-dues / clearance formalities.
      </div>
    </div>

    <div class="footer">
      Official IT Hardware Surrender Receipt • Shri Shivaji Institute of Science & Management (SSISM)<br>
      System generated record with digital audit log verification.
    </div>
  </div>
</body>
</html>
  `.trim();
};

/**
 * Helper: Notification for Laptop Issuance
 */
export const sendLaptopIssuedEmail = async ({ allocation, recipient, asset, issuedBy }) => {
  const allocationId = allocation?.id || 'N/A';
  const receiptRef = `REC-ALLOC-${String(allocationId).padStart(5, '0')}`;

  const payload = {
    allocationId,
    receiptRef,
    recipientEmail: recipient?.email,
    recipientPhone: recipient?.phone,
    recipientName: recipient?.name || 'Student / Employee',
    recipientRole: recipient?.role || 'STUDENT',
    rollNumberOrEmpId: recipient?.rollNumberOrEmpId || 'N/A',
    departmentName: recipient?.department?.name || allocation?.recipient?.department?.name || 'General Campus',
    assetTag: asset?.assetTag || 'N/A',
    serialNumber: asset?.serialNumber || 'N/A',
    makeModel: `${asset?.make || ''} ${asset?.model || ''}`.trim() || 'Institutional Laptop',
    processorRamStorage: `${asset?.processor || 'Standard'} | ${asset?.ram || '8GB'} | ${asset?.storage || '256GB SSD'}`,
    chargerSerial: asset?.chargerSerial || 'Original OEM Charger',
    accessories: [
      asset?.hasBag ? 'Official Laptop Bag (✓)' : null,
      asset?.hasMouse ? 'Optical Mouse (✓)' : null,
    ].filter(Boolean).join(', ') || 'Standard Power Cable & Adapter',
    issueCondition: allocation?.issueCondition || 'GOOD',
    issuedAt: formatDate(allocation?.issuedAt || new Date()),
    dueDate: formatDate(allocation?.dueDate),
    issuedByName: issuedBy?.name || 'Authorized IT Administrator',
    notes: allocation?.notes || '',
  };

  const htmlContent = generateIssueReceiptHtml(payload);
  const subject = `SSISM IT Hardware Allocation Receipt - ${payload.assetTag} (${payload.receiptRef})`;

  // Role filter check: Emails ONLY sent to Faculty/Employees
  const userRole = recipient?.role || allocation?.recipient?.role;
  if (userRole && !isFacultyOrEmployee(userRole)) {
    console.log(`Email skipped for STUDENT role: ${payload.recipientEmail || payload.recipientName || 'Unknown Student'}`);
    return { sent: false, skipped: true, reason: 'STUDENT_ROLE_SKIPPED' };
  }

  // If email notifications are active AND SMTP transporter is available, send via SMTP
  if (isEmailEnabled()) {
    const transporter = getTransporter();
    if (transporter && payload.recipientEmail) {
      try {
        const fromAddress = process.env.SMTP_FROM || `"SSISM IT Asset Management" <${process.env.SMTP_USER}>`;
        const info = await transporter.sendMail({
          from: fromAddress,
          to: payload.recipientEmail,
          subject,
          html: htmlContent,
        });

        console.log("Email notification sent to Faculty:", payload.recipientEmail);
        return {
          sent: true,
          status: 'SENT',
          messageId: info.messageId,
          recipientEmail: payload.recipientEmail,
          receiptRef,
          timestamp: new Date().toISOString(),
        };
      } catch (sendErr) {
        console.error("Failed to send email to Faculty:", payload.recipientEmail, sendErr.message);
        // Fall back to structured console log
      }
    }
  }

  // Graceful Local / Simulated Delivery Mode
  console.log('\n======================================================');
  console.log('📨 [AUTOMATED_EMAIL_RECEIPT] SEND_LAPTOP_ISSUED_EMAIL');
  console.log('======================================================');
  console.log(`Receipt Ref: ${payload.receiptRef}`);
  console.log(`Recipient:   ${payload.recipientName} <${payload.recipientEmail}> [Phone: ${payload.recipientPhone || 'N/A'}]`);
  console.log(`ID & Role:   ${payload.rollNumberOrEmpId} • ${payload.recipientRole} (${payload.departmentName})`);
  console.log(`Subject:     ${subject}`);
  console.log(`Asset:       ${payload.makeModel} [Tag: ${payload.assetTag}, S/N: ${payload.serialNumber}]`);
  console.log(`Specs:       ${payload.processorRamStorage}`);
  console.log(`Handover:    Condition: ${payload.issueCondition} | Due: ${payload.dueDate}`);
  console.log(`Authorized:  ${payload.issuedByName}`);
  console.log(`Status:      ${isEmailEnabled() ? 'SMTP_UNCONFIGURED_FALLBACK' : 'MOCKED / DEFERRED (Local Mode)'}`);
  console.log('------------------------------------------------------\n');

  return {
    sent: false,
    status: isEmailEnabled() ? 'SMTP_UNCONFIGURED' : 'MOCKED_DEFERRED',
    receiptRef,
    recipientEmail: payload.recipientEmail,
    recipientName: payload.recipientName,
    assetTag: payload.assetTag,
    timestamp: new Date().toISOString(),
    payload,
  };
};

/**
 * Helper: Notification for Laptop Surrender / Return
 */
export const sendLaptopReturnedEmail = async ({ allocation, recipient, asset, returnedBy }) => {
  const allocationId = allocation?.id || 'N/A';
  const clearanceRef = `REC-CLEAR-${String(allocationId).padStart(5, '0')}`;

  const payload = {
    allocationId,
    clearanceRef,
    recipientEmail: recipient?.email,
    recipientPhone: recipient?.phone,
    recipientName: recipient?.name || 'Student / Employee',
    recipientRole: recipient?.role || 'STUDENT',
    rollNumberOrEmpId: recipient?.rollNumberOrEmpId || 'N/A',
    departmentName: recipient?.department?.name || allocation?.recipient?.department?.name || 'General Campus',
    assetTag: asset?.assetTag || 'N/A',
    serialNumber: asset?.serialNumber || 'N/A',
    makeModel: `${asset?.make || ''} ${asset?.model || ''}`.trim() || 'Institutional Laptop',
    returnCondition: allocation?.returnCondition || 'GOOD',
    returnedAt: formatDateTime(allocation?.returnedAt || new Date()),
    fineAmount: allocation?.fineAmount ? `₹${Number(allocation.fineAmount).toFixed(2)}` : '₹0.00',
    fineReason: allocation?.fineReason || 'None',
    finePaid: allocation?.finePaid ? `PAID via ${allocation?.finePaymentMode || 'Cash'}` : (allocation?.fineAmount > 0 ? 'PENDING' : 'N/A (No Dues)'),
    acceptedByName: returnedBy?.name || 'SSISM Inventory Officer',
    notes: allocation?.notes || '',
  };

  const htmlContent = generateReturnClearanceHtml(payload);
  const subject = `SSISM IT Hardware Asset Return Clearance - ${payload.assetTag} (${payload.clearanceRef})`;

  // Role filter check: Emails ONLY sent to Faculty/Employees
  const userRole = recipient?.role || allocation?.recipient?.role;
  if (userRole && !isFacultyOrEmployee(userRole)) {
    console.log(`Email skipped for STUDENT role: ${payload.recipientEmail || payload.recipientName || 'Unknown Student'}`);
    return { sent: false, skipped: true, reason: 'STUDENT_ROLE_SKIPPED' };
  }

  // If email notifications are active AND SMTP transporter is available, send via SMTP
  if (isEmailEnabled()) {
    const transporter = getTransporter();
    if (transporter && payload.recipientEmail) {
      try {
        const fromAddress = process.env.SMTP_FROM || `"SSISM IT Asset Management" <${process.env.SMTP_USER}>`;
        const info = await transporter.sendMail({
          from: fromAddress,
          to: payload.recipientEmail,
          subject,
          html: htmlContent,
        });

        console.log("Email notification sent to Faculty:", payload.recipientEmail);
        return {
          sent: true,
          status: 'SENT',
          messageId: info.messageId,
          recipientEmail: payload.recipientEmail,
          clearanceRef,
          timestamp: new Date().toISOString(),
        };
      } catch (sendErr) {
        console.error("Failed to send email to Faculty:", payload.recipientEmail, sendErr.message);
      }
    }
  }

  // Graceful Local / Simulated Delivery Mode
  console.log('\n======================================================');
  console.log('📨 [AUTOMATED_EMAIL_CLEARANCE] SEND_LAPTOP_RETURNED_EMAIL');
  console.log('======================================================');
  console.log(`Clearance:   ${payload.clearanceRef}`);
  console.log(`Recipient:   ${payload.recipientName} <${payload.recipientEmail}> [Phone: ${payload.recipientPhone || 'N/A'}]`);
  console.log(`ID & Role:   ${payload.rollNumberOrEmpId} • ${payload.recipientRole} (${payload.departmentName})`);
  console.log(`Subject:     ${subject}`);
  console.log(`Asset:       ${payload.makeModel} [Tag: ${payload.assetTag}]`);
  console.log(`Inspection:  Condition: ${payload.returnCondition} | Penalty: ${payload.fineAmount} (${payload.finePaid})`);
  console.log(`Accepted By: ${payload.acceptedByName}`);
  console.log(`Status:      ${isEmailEnabled() ? 'SMTP_UNCONFIGURED_FALLBACK' : 'MOCKED / DEFERRED (Local Mode)'}`);
  console.log('------------------------------------------------------\n');

  return {
    sent: false,
    status: isEmailEnabled() ? 'SMTP_UNCONFIGURED' : 'MOCKED_DEFERRED',
    clearanceRef,
    recipientEmail: payload.recipientEmail,
    recipientName: payload.recipientName,
    assetTag: payload.assetTag,
    timestamp: new Date().toISOString(),
    payload,
  };
};

// Aliases matching exact user specification names
export const SEND_LAPTOP_ISSUED_EMAIL = sendLaptopIssuedEmail;
export const SEND_LAPTOP_RETURNED_EMAIL = sendLaptopReturnedEmail;
