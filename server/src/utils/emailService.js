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
const generateIssuedEmailHtml = ({
  userName,
  employeeId,
  department,
  laptopModel,
  serialNumber,
  assetTag,
  condition,
  chargerSerial,
  issueDate,
  dueDate,
  notes,
}) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SSISM IT Asset Allocation</title>
</head>
<body style="margin: 0; padding: 24px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 620px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08); border: 1px solid #e2e8f0;">
    <!-- Top Accent Bar -->
    <tr>
      <td style="height: 6px; background: linear-gradient(90deg, #F26522 0%, #ea580c 50%, #f97316 100%);"></td>
    </tr>
    <!-- Header -->
    <tr>
      <td style="background-color: #0f172a; padding: 28px 24px; text-align: center;">
        <div style="font-size: 11px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: #F26522; margin-bottom: 6px;">
          Institutional IT Infrastructure
        </div>
        <h1 style="margin: 0; font-size: 19px; font-weight: 800; color: #ffffff; letter-spacing: 0.5px; text-transform: uppercase;">
          Shri Shivaji Institute of Science & Management
        </h1>
        <p style="margin: 6px 0 0; font-size: 12px; color: #94a3b8; font-weight: 500;">
          Campus Asset & Inventory Management System (SSISM-IMS)
        </p>
      </td>
    </tr>
    <!-- Status / Notice Banner -->
    <tr>
      <td style="background-color: #fff7ed; padding: 14px 24px; border-bottom: 1px solid #fed7aa; text-align: center;">
        <span style="display: inline-block; background-color: #ea580c; color: #ffffff; font-size: 11px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; padding: 4px 12px; border-radius: 9999px;">
          ✓ LAPTOP ALLOCATED & HANDED OVER
        </span>
        <div style="margin-top: 6px; font-size: 13px; font-weight: 700; color: #9a3412;">
          Official Hardware Custody Confirmation Notice
        </div>
      </td>
    </tr>
    <!-- Content Body -->
    <tr>
      <td style="padding: 28px 24px;">
        <p style="margin: 0 0 18px; font-size: 14px; line-height: 1.6; color: #334155;">
          Dear <strong>${userName}</strong>${employeeId ? ` (Emp ID: <span style="font-family: monospace; font-weight: 700; color: #0f172a;">${employeeId}</span>)` : ''},
        </p>
        <p style="margin: 0 0 20px; font-size: 13.5px; line-height: 1.6; color: #475569;">
          This official notification confirms the institutional allocation of a campus IT laptop computer and associated hardware to your custody for academic and professional duties.
        </p>

        <!-- Device Specs Card -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 22px; overflow: hidden;">
          <tr>
            <td colspan="2" style="background-color: #f1f5f9; padding: 10px 16px; border-bottom: 1px solid #e2e8f0; font-size: 11.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; color: #475569;">
              Hardware & Allocation Specifications
            </td>
          </tr>
          ${assetTag ? `
          <tr>
            <td style="padding: 10px 16px; width: 40%; font-size: 12.5px; color: #64748b; font-weight: 600; border-bottom: 1px solid #f1f5f9;">Asset Tag Number:</td>
            <td style="padding: 10px 16px; width: 60%; font-size: 13px; color: #ea580c; font-weight: 800; font-family: monospace; border-bottom: 1px solid #f1f5f9;">
              <span style="background-color: #fff7ed; border: 1px solid #fdba74; padding: 2px 8px; border-radius: 6px;">${assetTag}</span>
            </td>
          </tr>` : ''}
          <tr>
            <td style="padding: 10px 16px; font-size: 12.5px; color: #64748b; font-weight: 600; border-bottom: 1px solid #f1f5f9;">Device Make & Model:</td>
            <td style="padding: 10px 16px; font-size: 13px; color: #0f172a; font-weight: 700; border-bottom: 1px solid #f1f5f9;">${laptopModel || 'Campus Notebook'}</td>
          </tr>
          <tr>
            <td style="padding: 10px 16px; font-size: 12.5px; color: #64748b; font-weight: 600; border-bottom: 1px solid #f1f5f9;">Hardware Serial (S/N):</td>
            <td style="padding: 10px 16px; font-size: 12.5px; color: #0f172a; font-family: monospace; font-weight: 700; border-bottom: 1px solid #f1f5f9;">${serialNumber || 'N/A'}</td>
          </tr>
          ${chargerSerial ? `
          <tr>
            <td style="padding: 10px 16px; font-size: 12.5px; color: #64748b; font-weight: 600; border-bottom: 1px solid #f1f5f9;">Charger / Adapter Serial:</td>
            <td style="padding: 10px 16px; font-size: 12.5px; color: #0f172a; font-family: monospace; font-weight: 600; border-bottom: 1px solid #f1f5f9;">${chargerSerial}</td>
          </tr>` : ''}
          <tr>
            <td style="padding: 10px 16px; font-size: 12.5px; color: #64748b; font-weight: 600; border-bottom: 1px solid #f1f5f9;">Handover Condition:</td>
            <td style="padding: 10px 16px; font-size: 13px; color: #15803d; font-weight: 700; border-bottom: 1px solid #f1f5f9;">${condition || 'Good / Fully Functional'}</td>
          </tr>
          <tr>
            <td style="padding: 10px 16px; font-size: 12.5px; color: #64748b; font-weight: 600; border-bottom: 1px solid #f1f5f9;">Date of Allocation:</td>
            <td style="padding: 10px 16px; font-size: 13px; color: #0f172a; font-weight: 700; border-bottom: 1px solid #f1f5f9;">${issueDate || new Date().toLocaleDateString('en-IN')}</td>
          </tr>
          ${dueDate ? `
          <tr>
            <td style="padding: 10px 16px; font-size: 12.5px; color: #64748b; font-weight: 600; border-bottom: 1px solid #f1f5f9;">Scheduled Audit / Return Due:</td>
            <td style="padding: 10px 16px; font-size: 13px; color: #c2410c; font-weight: 800; border-bottom: 1px solid #f1f5f9;">${dueDate}</td>
          </tr>` : ''}
          ${department ? `
          <tr>
            <td style="padding: 10px 16px; font-size: 12.5px; color: #64748b; font-weight: 600; border-bottom: 1px solid #f1f5f9;">Assigned Department:</td>
            <td style="padding: 10px 16px; font-size: 13px; color: #0f172a; font-weight: 600; border-bottom: 1px solid #f1f5f9;">${department}</td>
          </tr>` : ''}
          ${notes ? `
          <tr>
            <td style="padding: 10px 16px; font-size: 12.5px; color: #64748b; font-weight: 600;">Handover Remarks:</td>
            <td style="padding: 10px 16px; font-size: 12.5px; color: #475569; font-style: italic;">${notes}</td>
          </tr>` : ''}
        </table>

        <!-- Custody Guidelines Box -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-left: 4px solid #F26522; padding: 14px 16px; margin-bottom: 22px; border-radius: 0 8px 8px 0;">
          <tr>
            <td>
              <div style="font-size: 12px; font-weight: 800; color: #9a3412; text-transform: uppercase; margin-bottom: 6px;">
                Institutional Custody Guidelines
              </div>
              <ul style="margin: 0; padding-left: 18px; font-size: 12px; color: #475569; line-height: 1.6;">
                <li>The device is designated for official academic, research, and institutional duties.</li>
                <li>Please report any technical malfunctions, accidental damages, or physical defects immediately to the SSISM Computer Lab.</li>
                <li>The laptop must be made available for mandatory institutional physical audits upon notification.</li>
              </ul>
            </td>
          </tr>
        </table>

        <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #475569;">
          For any technical assistance, software configuration, or maintenance inquiries, please reach out to the <strong>SSISM Computer Lab</strong>.
        </p>
      </td>
    </tr>
    <!-- Footer -->
    <tr>
      <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 22px 24px; text-align: center;">
        <div style="font-size: 12px; font-weight: 700; color: #0f172a;">
          SSISM Computer Lab & IT Operations Cell
        </div>
        <div style="font-size: 11px; color: #64748b; margin-top: 4px;">
          Shri Shivaji Institute of Science & Management • Sandalpur Campus, MP
        </div>
        <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
          Official Contact: <a href="mailto:computerlab@ssism.org" style="color: #F26522; text-decoration: none; font-weight: 600;">computerlab@ssism.org</a>
        </div>
        <div style="margin-top: 12px; font-size: 10px; color: #94a3b8; border-top: 1px dashed #cbd5e1; padding-top: 8px;">
          This is an automated institutional notification dispatched via SSISM-IMS.
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
};

/**
 * Generate professional HTML template for Laptop Returned notification
 */
const generateReturnedEmailHtml = ({
  userName,
  employeeId,
  department,
  laptopModel,
  serialNumber,
  assetTag,
  returnDate,
  returnCondition,
  fineAmount,
  finePaid,
  returnedBy,
  notes,
}) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SSISM IT Asset Return Clearance</title>
</head>
<body style="margin: 0; padding: 24px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 620px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08); border: 1px solid #e2e8f0;">
    <!-- Top Accent Bar (Emerald) -->
    <tr>
      <td style="height: 6px; background: linear-gradient(90deg, #059669 0%, #10b981 50%, #34d399 100%);"></td>
    </tr>
    <!-- Header -->
    <tr>
      <td style="background-color: #064e3b; padding: 28px 24px; text-align: center;">
        <div style="font-size: 11px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: #6ee7b7; margin-bottom: 6px;">
          Institutional IT Infrastructure
        </div>
        <h1 style="margin: 0; font-size: 19px; font-weight: 800; color: #ffffff; letter-spacing: 0.5px; text-transform: uppercase;">
          Shri Shivaji Institute of Science & Management
        </h1>
        <p style="margin: 6px 0 0; font-size: 12px; color: #a7f3d0; font-weight: 500;">
          Campus Asset & Inventory Management System (SSISM-IMS)
        </p>
      </td>
    </tr>
    <!-- Status / Notice Banner -->
    <tr>
      <td style="background-color: #ecfdf5; padding: 14px 24px; border-bottom: 1px solid #a7f3d0; text-align: center;">
        <span style="display: inline-block; background-color: #059669; color: #ffffff; font-size: 11px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; padding: 4px 12px; border-radius: 9999px;">
          ✓ CUSTODY CLEARED & ASSET SURRENDERED
        </span>
        <div style="margin-top: 6px; font-size: 13px; font-weight: 700; color: #065f46;">
          Official Hardware Custody Release & Clearance Receipt
        </div>
      </td>
    </tr>
    <!-- Content Body -->
    <tr>
      <td style="padding: 28px 24px;">
        <p style="margin: 0 0 18px; font-size: 14px; line-height: 1.6; color: #334155;">
          Dear <strong>${userName}</strong>${employeeId ? ` (Emp ID: <span style="font-family: monospace; font-weight: 700; color: #0f172a;">${employeeId}</span>)` : ''},
        </p>
        <p style="margin: 0 0 20px; font-size: 13.5px; line-height: 1.6; color: #475569;">
          This official document certifies that the campus laptop computer and accessories allocated to your custody have been physically returned, inspected, and verified back into the SSISM central inventory.
        </p>

        <!-- Return Details Card -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 22px; overflow: hidden;">
          <tr>
            <td colspan="2" style="background-color: #f1f5f9; padding: 10px 16px; border-bottom: 1px solid #e2e8f0; font-size: 11.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; color: #475569;">
              Surrender & Inspection Verification Details
            </td>
          </tr>
          ${assetTag ? `
          <tr>
            <td style="padding: 10px 16px; width: 40%; font-size: 12.5px; color: #64748b; font-weight: 600; border-bottom: 1px solid #f1f5f9;">Asset Tag Number:</td>
            <td style="padding: 10px 16px; width: 60%; font-size: 13px; color: #059669; font-weight: 800; font-family: monospace; border-bottom: 1px solid #f1f5f9;">
              <span style="background-color: #ecfdf5; border: 1px solid #86efac; padding: 2px 8px; border-radius: 6px;">${assetTag}</span>
            </td>
          </tr>` : ''}
          <tr>
            <td style="padding: 10px 16px; font-size: 12.5px; color: #64748b; font-weight: 600; border-bottom: 1px solid #f1f5f9;">Device Make & Model:</td>
            <td style="padding: 10px 16px; font-size: 13px; color: #0f172a; font-weight: 700; border-bottom: 1px solid #f1f5f9;">${laptopModel || 'Campus Notebook'}</td>
          </tr>
          <tr>
            <td style="padding: 10px 16px; font-size: 12.5px; color: #64748b; font-weight: 600; border-bottom: 1px solid #f1f5f9;">Hardware Serial (S/N):</td>
            <td style="padding: 10px 16px; font-size: 12.5px; color: #0f172a; font-family: monospace; font-weight: 700; border-bottom: 1px solid #f1f5f9;">${serialNumber || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 10px 16px; font-size: 12.5px; color: #64748b; font-weight: 600; border-bottom: 1px solid #f1f5f9;">Return Received Date:</td>
            <td style="padding: 10px 16px; font-size: 13px; color: #0f172a; font-weight: 700; border-bottom: 1px solid #f1f5f9;">${returnDate || new Date().toLocaleDateString('en-IN')}</td>
          </tr>
          <tr>
            <td style="padding: 10px 16px; font-size: 12.5px; color: #64748b; font-weight: 600; border-bottom: 1px solid #f1f5f9;">Inspection Condition:</td>
            <td style="padding: 10px 16px; font-size: 13px; color: #0f172a; font-weight: 700; border-bottom: 1px solid #f1f5f9;">${returnCondition || 'Normal / Verified'}</td>
          </tr>
          ${returnedBy ? `
          <tr>
            <td style="padding: 10px 16px; font-size: 12.5px; color: #64748b; font-weight: 600; border-bottom: 1px solid #f1f5f9;">Received & Verified By:</td>
            <td style="padding: 10px 16px; font-size: 13px; color: #0f172a; font-weight: 600; border-bottom: 1px solid #f1f5f9;">${returnedBy}</td>
          </tr>` : ''}
          <tr>
            <td style="padding: 10px 16px; font-size: 12.5px; color: #64748b; font-weight: 600; border-bottom: 1px solid #f1f5f9;">Clearance Status:</td>
            <td style="padding: 10px 16px; font-size: 13px; color: #059669; font-weight: 800; border-bottom: 1px solid #f1f5f9;">
              ✓ NO OUTSTANDING DUES / FULLY RELEASED ${fineAmount > 0 ? `(Fine ₹${fineAmount} - ${finePaid ? 'PAID' : 'PENDING'})` : ''}
            </td>
          </tr>
          ${notes ? `
          <tr>
            <td style="padding: 10px 16px; font-size: 12.5px; color: #64748b; font-weight: 600;">Inspection / Return Notes:</td>
            <td style="padding: 10px 16px; font-size: 12.5px; color: #475569; font-style: italic;">${notes}</td>
          </tr>` : ''}
        </table>

        <!-- Prominent Green Clearance Callout -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0fdf4; border: 1.5px solid #86efac; border-radius: 12px; padding: 16px; margin-bottom: 22px; text-align: center;">
          <tr>
            <td>
              <div style="font-size: 13.5px; font-weight: 800; color: #166534; margin-bottom: 4px;">
                Hardware Custody Record Closed
              </div>
              <div style="font-size: 12px; color: #15803d; line-height: 1.5;">
                Your institutional hardware accountability for device <strong>${assetTag || serialNumber}</strong> has been successfully cleared in the central registry.
              </div>
            </td>
          </tr>
        </table>

        <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #475569;">
          Should you require another device allocation for future projects or semester assignments, please submit a request to the Computer Lab or through your Department Head.
        </p>
      </td>
    </tr>
    <!-- Footer -->
    <tr>
      <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 22px 24px; text-align: center;">
        <div style="font-size: 12px; font-weight: 700; color: #0f172a;">
          SSISM Computer Lab & IT Operations Cell
        </div>
        <div style="font-size: 11px; color: #64748b; margin-top: 4px;">
          Shri Shivaji Institute of Science & Management • Sandalpur Campus, MP
        </div>
        <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
          Official Contact: <a href="mailto:computerlab@ssism.org" style="color: #059669; text-decoration: none; font-weight: 600;">computerlab@ssism.org</a>
        </div>
        <div style="margin-top: 12px; font-size: 10px; color: #94a3b8; border-top: 1px dashed #cbd5e1; padding-top: 8px;">
          This is an automated institutional clearance receipt dispatched via SSISM-IMS.
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
};

/**
 * Asynchronous function: Send Laptop Issued Email
 * Only sends to Faculty / Employees / Staff. Skips for Student role.
 */
export const sendLaptopIssuedEmail = async ({
  to,
  userName,
  employeeId,
  department,
  laptopModel,
  serialNumber,
  assetTag,
  condition,
  chargerSerial,
  issuedBy,
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
      employeeId,
      department,
      laptopModel: laptopModel || 'Campus Laptop',
      serialNumber: serialNumber || 'N/A',
      assetTag: assetTag || '',
      condition,
      chargerSerial,
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

    console.log("Email notification sent to Faculty:", to, "MessageId:", info.messageId);
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
 */
export const sendLaptopReturnedEmail = async ({
  to,
  userName,
  employeeId,
  department,
  laptopModel,
  serialNumber,
  assetTag,
  returnDate,
  returnCondition,
  fineAmount,
  finePaid,
  returnedBy,
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
      employeeId,
      department,
      laptopModel: laptopModel || 'Campus Laptop',
      serialNumber: serialNumber || 'N/A',
      assetTag: assetTag || '',
      returnDate: returnDate || new Date().toLocaleDateString('en-IN'),
      returnCondition,
      fineAmount,
      finePaid,
      returnedBy,
      notes,
    });

    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject: `SSISM Asset Management - Laptop Surrender Clearance [${assetTag || laptopModel || 'Device'}]`,
      html,
    });

    console.log("Email notification sent to Faculty:", to, "MessageId:", info.messageId);
    return { sent: true, messageId: info.messageId, recipient: to };
  } catch (err) {
    console.error("Failed to send email to Faculty:", to, err.message);
    // Graceful return without crashing or throwing
    return { sent: false, error: err.message, recipient: to };
  }
};
