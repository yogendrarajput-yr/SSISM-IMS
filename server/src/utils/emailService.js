/**
 * Email Service Utility for SSISM Asset & Inventory Management System
 * 
 * Configured with Nodemailer for automated institutional email notifications.
 * Enforces role-based delivery rules:
 * - Emails are sent ONLY to Faculty / Employees / Staff upon laptop issue and return.
 * - Emails are explicitly SKIPPED for STUDENT role with diagnostic log.
 * - Handles SMTP errors gracefully without crashing the server or blocking HTTP responses.
 */

import nodemailer from 'nodemailer';

/**
 * Helper to check if a user role belongs to Faculty or Employee / Staff
 */
export const isFacultyOrEmployee = (role) => {
  const norm = String(role || '').toUpperCase().trim();
  return (
    norm === 'FACULTY' ||
    norm === 'EMPLOYEE' ||
    norm === 'STAFF' ||
    norm === 'HIGHER_MANAGEMENT' ||
    norm === 'SUPER_ADMIN'
  );
};

/**
 * Configure Nodemailer transporter with trimmed environment credentials
 */
const getTransporter = () => {
  const host = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = (process.env.SMTP_USER || 'computerlab@ssism.org').trim();
  const pass = (process.env.SMTP_PASS || 'hlnzytggnvwdyp').replace(/\s+/g, '').trim();

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
};

/**
 * Generate professional HTML template for Laptop Issued notification
 */
const generateIssuedEmailHtml = ({ userName, laptopModel, serialNumber, assetTag, issueDate, dueDate, notes }) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #ffffff; padding: 24px 20px; text-align: center; border-bottom: 3px solid #F26522; }
    .header h1 { margin: 0; font-size: 17px; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 800; }
    .header p { margin: 4px 0 0; font-size: 11px; color: #cbd5e1; text-transform: uppercase; letter-spacing: 1.2px; }
    .content { padding: 24px 20px; }
    .greeting { font-size: 14px; line-height: 1.6; margin-bottom: 18px; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; margin-bottom: 16px; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .data-table td { padding: 6px 4px; vertical-align: top; }
    .data-table td.label { width: 38%; color: #64748b; font-weight: 600; }
    .data-table td.value { width: 62%; color: #0f172a; font-weight: 700; }
    .highlight-tag { background: #fff7ed; color: #ea580c; border: 1px solid #fdba74; padding: 2px 8px; border-radius: 6px; font-family: monospace; font-size: 12.5px; font-weight: 800; }
    .footer { background: #f1f5f9; padding: 16px 20px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>SHRI SHIVAJI INSTITUTE OF SCIENCE & MANAGEMENT</h1>
      <p>SSISM IT Asset Management • Laptop Handover Acknowledgment</p>
    </div>
    <div class="content">
      <div class="greeting">
        Dear <strong>${userName}</strong>,<br>
        This official notification confirms the institutional allocation of a campus IT laptop asset to your custody.
      </div>

      <div class="card">
        <table class="data-table">
          ${assetTag ? `
          <tr>
            <td class="label">Asset Tag:</td>
            <td class="value"><span class="highlight-tag">${assetTag}</span></td>
          </tr>` : ''}
          <tr>
            <td class="label">Laptop Model:</td>
            <td class="value">${laptopModel || 'Campus Notebook'}</td>
          </tr>
          <tr>
            <td class="label">Serial Number:</td>
            <td class="value" style="font-family: monospace;">${serialNumber || 'N/A'}</td>
          </tr>
          <tr>
            <td class="label">Issue Date:</td>
            <td class="value">${issueDate || new Date().toLocaleDateString('en-IN')}</td>
          </tr>
          ${dueDate ? `
          <tr>
            <td class="label">Scheduled Return Due:</td>
            <td class="value" style="color: #ea580c;">${dueDate}</td>
          </tr>` : ''}
          ${notes ? `
          <tr>
            <td class="label">Handover Remarks:</td>
            <td class="value" style="font-style: italic; font-weight: 500;">${notes}</td>
          </tr>` : ''}
        </table>
      </div>

      <p style="font-size: 12px; color: #475569; line-height: 1.5;">
        Please ensure the device is safely maintained under your institutional custody. If you notice any technical defects or require maintenance, please contact the SSISM Computer Lab.
      </p>
    </div>
    <div class="footer">
      Automated Institutional Notification • SSISM Computer Lab & IT Asset Management<br>
      From: computerlab@ssism.org
    </div>
  </div>
</body>
</html>
  `.trim();
};

/**
 * Generate professional HTML template for Laptop Returned notification
 */
const generateReturnedEmailHtml = ({ userName, laptopModel, serialNumber, assetTag, returnDate, returnCondition, notes }) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: linear-gradient(135deg, #064e3b 0%, #0f172a 100%); color: #ffffff; padding: 24px 20px; text-align: center; border-bottom: 3px solid #10b981; }
    .header h1 { margin: 0; font-size: 17px; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 800; }
    .header p { margin: 4px 0 0; font-size: 11px; color: #a7f3d0; text-transform: uppercase; letter-spacing: 1.2px; }
    .content { padding: 24px 20px; }
    .greeting { font-size: 14px; line-height: 1.6; margin-bottom: 18px; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; margin-bottom: 16px; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .data-table td { padding: 6px 4px; vertical-align: top; }
    .data-table td.label { width: 38%; color: #64748b; font-weight: 600; }
    .data-table td.value { width: 62%; color: #0f172a; font-weight: 700; }
    .highlight-tag { background: #f0fdf4; color: #15803d; border: 1px solid #86efac; padding: 2px 8px; border-radius: 6px; font-family: monospace; font-size: 12.5px; font-weight: 800; }
    .badge-clear { display: inline-block; background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; padding: 10px 14px; border-radius: 8px; font-size: 12px; font-weight: 700; width: 95%; text-align: center; margin-top: 10px; }
    .footer { background: #f1f5f9; padding: 16px 20px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>SHRI SHIVAJI INSTITUTE OF SCIENCE & MANAGEMENT</h1>
      <p>SSISM IT Asset Management • Return & Custody Clearance</p>
    </div>
    <div class="content">
      <div class="greeting">
        Dear <strong>${userName}</strong>,<br>
        This official clearance confirms that the campus IT laptop asset assigned to your custody has been physically inspected and accepted back into SSISM inventory.
      </div>

      <div class="card">
        <table class="data-table">
          ${assetTag ? `
          <tr>
            <td class="label">Asset Tag:</td>
            <td class="value"><span class="highlight-tag">${assetTag}</span></td>
          </tr>` : ''}
          <tr>
            <td class="label">Laptop Model:</td>
            <td class="value">${laptopModel || 'Campus Notebook'}</td>
          </tr>
          <tr>
            <td class="label">Serial Number:</td>
            <td class="value" style="font-family: monospace;">${serialNumber || 'N/A'}</td>
          </tr>
          <tr>
            <td class="label">Return Date:</td>
            <td class="value">${returnDate || new Date().toLocaleDateString('en-IN')}</td>
          </tr>
          ${returnCondition ? `
          <tr>
            <td class="label">Inspection Condition:</td>
            <td class="value">${returnCondition}</td>
          </tr>` : ''}
          ${notes ? `
          <tr>
            <td class="label">Return Notes:</td>
            <td class="value" style="font-style: italic; font-weight: 500;">${notes}</td>
          </tr>` : ''}
        </table>
      </div>

      <div class="badge-clear">
        ✓ CUSTODY CLEARED: The asset has been successfully surrendered in the system.
      </div>
    </div>
    <div class="footer">
      Automated Institutional Clearance • SSISM Computer Lab & IT Asset Management<br>
      From: computerlab@ssism.org
    </div>
  </div>
</body>
</html>
  `.trim();
};

/**
 * Asynchronous function: Send Laptop Issued Email
 * Only sends to Faculty / Employees / Staff. Skips for Student role.
 * 
 * @param {Object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.userName - Recipient name
 * @param {string} options.laptopModel - Laptop brand/model
 * @param {string} options.serialNumber - Device serial number
 * @param {string} [options.assetTag] - Asset tag
 * @param {string} [options.issueDate] - Date of issue
 * @param {string} [options.dueDate] - Scheduled due date
 * @param {string} [options.userRole] - Recipient role
 * @param {string} [options.notes] - Handover remarks
 */
export const sendLaptopIssuedEmail = async ({
  to,
  userName,
  laptopModel,
  serialNumber,
  assetTag,
  issueDate,
  dueDate,
  userRole,
  notes,
}) => {
  // Step 3 Filter: Check user role
  if (userRole && !isFacultyOrEmployee(userRole)) {
    console.log(`Email skipped for STUDENT role: ${to || userName || 'Unknown Student'}`);
    return { sent: false, skipped: true, reason: 'STUDENT_ROLE_SKIPPED' };
  }

  if (!to) {
    console.warn(`[emailService] Cannot send issue email: No recipient email address provided for ${userName}`);
    return { sent: false, error: 'NO_RECIPIENT_EMAIL' };
  }

  try {
    const transporter = getTransporter();
    const fromAddress = process.env.SMTP_FROM || `"SSISM IT Asset Management" <${process.env.SMTP_USER || 'computerlab@ssism.org'}>`;

    const html = generateIssuedEmailHtml({
      userName: userName || 'Faculty / Staff Member',
      laptopModel: laptopModel || 'Campus Laptop',
      serialNumber: serialNumber || 'N/A',
      assetTag: assetTag || '',
      issueDate: issueDate || new Date().toLocaleDateString('en-IN'),
      dueDate,
      notes,
    });

    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject: `SSISM Asset Management - Laptop Allocation [${assetTag || laptopModel || 'Device'}]`,
      html,
    });

    console.log("Email notification sent to Faculty:", to);
    return { sent: true, messageId: info.messageId, recipient: to };
  } catch (err) {
    console.error("Failed to send email to Faculty:", to, err.message);
    // Graceful return without crashing or throwing
    return { sent: false, error: err.message, recipient: to };
  }
};

/**
 * Asynchronous function: Send Laptop Returned Email
 * Only sends to Faculty / Employees / Staff. Skips for Student role.
 * 
 * @param {Object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.userName - Recipient name
 * @param {string} options.laptopModel - Laptop brand/model
 * @param {string} options.serialNumber - Device serial number
 * @param {string} [options.assetTag] - Asset tag
 * @param {string} [options.returnDate] - Date of return
 * @param {string} [options.returnCondition] - Hardware condition
 * @param {string} [options.userRole] - Recipient role
 * @param {string} [options.notes] - Return remarks
 */
export const sendLaptopReturnedEmail = async ({
  to,
  userName,
  laptopModel,
  serialNumber,
  assetTag,
  returnDate,
  returnCondition,
  userRole,
  notes,
}) => {
  // Step 3 Filter: Check user role
  if (userRole && !isFacultyOrEmployee(userRole)) {
    console.log(`Email skipped for STUDENT role: ${to || userName || 'Unknown Student'}`);
    return { sent: false, skipped: true, reason: 'STUDENT_ROLE_SKIPPED' };
  }

  if (!to) {
    console.warn(`[emailService] Cannot send return email: No recipient email address provided for ${userName}`);
    return { sent: false, error: 'NO_RECIPIENT_EMAIL' };
  }

  try {
    const transporter = getTransporter();
    const fromAddress = process.env.SMTP_FROM || `"SSISM IT Asset Management" <${process.env.SMTP_USER || 'computerlab@ssism.org'}>`;

    const html = generateReturnedEmailHtml({
      userName: userName || 'Faculty / Staff Member',
      laptopModel: laptopModel || 'Campus Laptop',
      serialNumber: serialNumber || 'N/A',
      assetTag: assetTag || '',
      returnDate: returnDate || new Date().toLocaleDateString('en-IN'),
      returnCondition,
      notes,
    });

    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject: `SSISM Asset Management - Laptop Surrender Clearance [${assetTag || laptopModel || 'Device'}]`,
      html,
    });

    console.log("Email notification sent to Faculty:", to);
    return { sent: true, messageId: info.messageId, recipient: to };
  } catch (err) {
    console.error("Failed to send email to Faculty:", to, err.message);
    // Graceful return without crashing or throwing
    return { sent: false, error: err.message, recipient: to };
  }
};
