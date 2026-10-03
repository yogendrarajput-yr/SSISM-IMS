/**
 * Email Service Utility for SSISM Asset & Inventory Management System
 * 
 * Official Institution:
 * Sant Singaji Institute of Science and Management, Sandalpur, Teh - Khategaon, Dist - Dewas, MP
 * 
 * Configured with Nodemailer for automated institutional email notifications.
 * Enforces role-based delivery rules:
 * - Emails are sent ONLY to Faculty / Employees / Staff upon laptop issue and return.
 * - Emails are explicitly SKIPPED for STUDENT role with diagnostic log.
 * - Mandatory Liability Disclaimer on all outgoing custody templates.
 * - Professional palette: #D9531E (Brand Accent), #2C3E50 (Dark Text), #F8F9FA (Light Background).
 */

import nodemailer from 'nodemailer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to official emblem logo
const LOGO_PATH = path.resolve(__dirname, '../../../client/public/Logo/SSISM.png');

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
  const pass = (process.env.SMTP_PASS || 'hlnzyjytggnvwdyp').replace(/\s+/g, '').trim();

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
  expectedReturnDate,
  dueDate,
  notes,
}) => {
  const returnDueDisplay = expectedReturnDate || dueDate || 'Not Specified (Subject to Recall)';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SSISM IT Asset Allocation</title>
</head>
<body style="margin: 0; padding: 24px; background-color: #F8F9FA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #2C3E50;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 620px; margin: 0 auto; background-color: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06); border: 1px solid #E2E8F0;">
    <!-- Top Brand Accent Bar -->
    <tr>
      <td style="height: 6px; background-color: #D9531E;"></td>
    </tr>
    <!-- Header -->
    <tr>
      <td style="background-color: #2C3E50; padding: 26px 22px; text-align: center;">
        <img src="cid:ssismlogo" alt="SSISM Logo" style="height: 52px; width: auto; margin: 0 auto 12px auto; display: block;" />
        <h1 style="margin: 0; font-size: 16px; font-weight: 800; color: #ffffff; letter-spacing: 0.4px; text-transform: uppercase; line-height: 1.4;">
          Sant Singaji Institute of Science and Management
        </h1>
        <p style="margin: 4px 0 0; font-size: 11.5px; color: #CBD5E1; font-weight: 500;">
          Sandalpur, Teh - Khategaon, Dist - Dewas, MP
        </p>
        <div style="display: inline-block; margin-top: 10px; padding: 3px 10px; background-color: rgba(217, 83, 30, 0.2); border: 1px solid #D9531E; border-radius: 20px; font-size: 10.5px; font-weight: 700; color: #FFA07A; letter-spacing: 1px; text-transform: uppercase;">
          IT Asset & Inventory Management System
        </div>
      </td>
    </tr>
    <!-- Status / Notice Banner -->
    <tr>
      <td style="background-color: #FFF7ED; padding: 12px 22px; border-bottom: 1px solid #FED7AA; text-align: center;">
        <span style="display: inline-block; background-color: #D9531E; color: #ffffff; font-size: 11px; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase; padding: 3px 12px; border-radius: 9999px;">
          ✓ LAPTOP ALLOCATED & HANDED OVER
        </span>
        <div style="margin-top: 5px; font-size: 12.5px; font-weight: 700; color: #9A3412;">
          Official Hardware Custody Confirmation Notice
        </div>
      </td>
    </tr>
    <!-- Content Body -->
    <tr>
      <td style="padding: 26px 24px;">
        <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #2C3E50;">
          Dear <strong>${userName}</strong>${employeeId ? ` (ID: <span style="font-family: monospace; font-weight: 700; color: #D9531E;">${employeeId}</span>)` : ''},
        </p>
        <p style="margin: 0 0 20px; font-size: 13px; line-height: 1.6; color: #475569;">
          This official notification confirms that the campus IT laptop computer detailed below has been formally issued to your academic and professional custody.
        </p>

        <!-- Device Specs Card -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F8F9FA; border: 1px solid #E2E8F0; border-radius: 10px; margin-bottom: 20px; overflow: hidden;">
          <tr>
            <td colspan="2" style="background-color: #EDF2F7; padding: 10px 16px; border-bottom: 1px solid #E2E8F0; font-size: 11.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; color: #2C3E50;">
              Hardware & Allocation Specifications
            </td>
          </tr>
          ${assetTag ? `
          <tr>
            <td style="padding: 9px 16px; width: 38%; font-size: 12.5px; color: #64748B; font-weight: 600; border-bottom: 1px solid #E2E8F0;">Asset Tag Number:</td>
            <td style="padding: 9px 16px; width: 62%; font-size: 13px; color: #D9531E; font-weight: 800; font-family: monospace; border-bottom: 1px solid #E2E8F0;">
              <span style="background-color: #FFF7ED; border: 1px solid #FDBA74; padding: 2px 8px; border-radius: 6px;">${assetTag}</span>
            </td>
          </tr>` : ''}
          <tr>
            <td style="padding: 9px 16px; font-size: 12.5px; color: #64748B; font-weight: 600; border-bottom: 1px solid #E2E8F0;">Device Make & Model:</td>
            <td style="padding: 9px 16px; font-size: 13px; color: #2C3E50; font-weight: 700; border-bottom: 1px solid #E2E8F0;">${laptopModel || 'Campus Notebook'}</td>
          </tr>
          <tr>
            <td style="padding: 9px 16px; font-size: 12.5px; color: #64748B; font-weight: 600; border-bottom: 1px solid #E2E8F0;">Hardware Serial (S/N):</td>
            <td style="padding: 9px 16px; font-size: 12.5px; color: #2C3E50; font-family: monospace; font-weight: 700; border-bottom: 1px solid #E2E8F0;">${serialNumber || 'N/A'}</td>
          </tr>
          ${chargerSerial ? `
          <tr>
            <td style="padding: 9px 16px; font-size: 12.5px; color: #64748B; font-weight: 600; border-bottom: 1px solid #E2E8F0;">Charger Serial:</td>
            <td style="padding: 9px 16px; font-size: 12.5px; color: #2C3E50; font-family: monospace; font-weight: 600; border-bottom: 1px solid #E2E8F0;">${chargerSerial}</td>
          </tr>` : ''}
          <tr>
            <td style="padding: 9px 16px; font-size: 12.5px; color: #64748B; font-weight: 600; border-bottom: 1px solid #E2E8F0;">Handover Condition:</td>
            <td style="padding: 9px 16px; font-size: 12.5px; color: #16A34A; font-weight: 700; border-bottom: 1px solid #E2E8F0;">${condition || 'Good / Tested'}</td>
          </tr>
          <tr>
            <td style="padding: 9px 16px; font-size: 12.5px; color: #64748B; font-weight: 600; border-bottom: 1px solid #E2E8F0;">Date of Issue:</td>
            <td style="padding: 9px 16px; font-size: 13px; color: #2C3E50; font-weight: 700; border-bottom: 1px solid #E2E8F0;">${issueDate || new Date().toLocaleDateString('en-IN')}</td>
          </tr>
          <tr>
            <td style="padding: 9px 16px; font-size: 12.5px; color: #64748B; font-weight: 600; border-bottom: 1px solid #E2E8F0;">Expected Return Date:</td>
            <td style="padding: 9px 16px; font-size: 13px; color: #C2410C; font-weight: 800; border-bottom: 1px solid #E2E8F0;">${returnDueDisplay}</td>
          </tr>
          ${department ? `
          <tr>
            <td style="padding: 9px 16px; font-size: 12.5px; color: #64748B; font-weight: 600; border-bottom: 1px solid #E2E8F0;">Department:</td>
            <td style="padding: 9px 16px; font-size: 12.5px; color: #2C3E50; font-weight: 600; border-bottom: 1px solid #E2E8F0;">${department}</td>
          </tr>` : ''}
          ${notes ? `
          <tr>
            <td style="padding: 9px 16px; font-size: 12.5px; color: #64748B; font-weight: 600;">Remarks / Notes:</td>
            <td style="padding: 9px 16px; font-size: 12px; color: #475569; font-style: italic;">${notes}</td>
          </tr>` : ''}
        </table>

        <!-- Mandatory Institutional Liability Note -->
        <div style="margin-top: 22px; padding: 14px 18px; background-color: #FFF7ED; border-left: 4px solid #D9531E; border-radius: 6px; font-size: 12px; color: #2C3E50; line-height: 1.6;">
          <strong style="color: #D9531E; display: block; margin-bottom: 4px; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">Institutional Liability Undertaking:</strong>
          "Note: You are solely responsible for the physical and technical integrity of the assigned asset during the allocation period. Any physical damage, loss, or unauthorized technical modification will attract appropriate institutional action."
        </div>
      </td>
    </tr>
    <!-- Footer -->
    <tr>
      <td style="background-color: #F8F9FA; border-top: 1px solid #E2E8F0; padding: 20px 24px; text-align: center;">
        <div style="font-size: 12px; font-weight: 700; color: #2C3E50;">
          SSISM Computer Lab & IT Operations Cell
        </div>
        <div style="font-size: 11px; color: #64748B; margin-top: 3px;">
          Sant Singaji Institute of Science and Management, Sandalpur, Teh - Khategaon, Dist - Dewas, MP
        </div>
        <div style="font-size: 11px; color: #64748B; margin-top: 3px;">
          Contact: <a href="mailto:computerlab@ssism.org" style="color: #D9531E; text-decoration: none; font-weight: 600;">computerlab@ssism.org</a>
        </div>
        <div style="margin-top: 10px; font-size: 10px; color: #94A3B8; border-top: 1px dashed #CBD5E1; padding-top: 8px;">
          Automated institutional dispatch via SSISM IT Asset Management System.
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
<body style="margin: 0; padding: 24px; background-color: #F8F9FA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #2C3E50;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 620px; margin: 0 auto; background-color: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06); border: 1px solid #E2E8F0;">
    <!-- Top Accent Bar (Emerald) -->
    <tr>
      <td style="height: 6px; background-color: #059669;"></td>
    </tr>
    <!-- Header -->
    <tr>
      <td style="background-color: #2C3E50; padding: 26px 22px; text-align: center;">
        <img src="cid:ssismlogo" alt="SSISM Logo" style="height: 52px; width: auto; margin: 0 auto 12px auto; display: block;" />
        <h1 style="margin: 0; font-size: 16px; font-weight: 800; color: #ffffff; letter-spacing: 0.4px; text-transform: uppercase; line-height: 1.4;">
          Sant Singaji Institute of Science and Management
        </h1>
        <p style="margin: 4px 0 0; font-size: 11.5px; color: #CBD5E1; font-weight: 500;">
          Sandalpur, Teh - Khategaon, Dist - Dewas, MP
        </p>
        <div style="display: inline-block; margin-top: 10px; padding: 3px 10px; background-color: rgba(5, 150, 105, 0.2); border: 1px solid #059669; border-radius: 20px; font-size: 10.5px; font-weight: 700; color: #6EE7B7; letter-spacing: 1px; text-transform: uppercase;">
          IT Asset & Inventory Management System
        </div>
      </td>
    </tr>
    <!-- Status / Notice Banner -->
    <tr>
      <td style="background-color: #ECFDF5; padding: 12px 22px; border-bottom: 1px solid #A7F3D0; text-align: center;">
        <span style="display: inline-block; background-color: #059669; color: #ffffff; font-size: 11px; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase; padding: 3px 12px; border-radius: 9999px;">
          ✓ CUSTODY CLEARED & ASSET SURRENDERED
        </span>
        <div style="margin-top: 5px; font-size: 12.5px; font-weight: 700; color: #065F46;">
          Official Hardware Custody Release & Clearance Receipt
        </div>
      </td>
    </tr>
    <!-- Content Body -->
    <tr>
      <td style="padding: 26px 24px;">
        <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #2C3E50;">
          Dear <strong>${userName}</strong>${employeeId ? ` (ID: <span style="font-family: monospace; font-weight: 700; color: #059669;">${employeeId}</span>)` : ''},
        </p>
        <p style="margin: 0 0 20px; font-size: 13px; line-height: 1.6; color: #475569;">
          This official document certifies that the campus laptop computer allocated to your custody has been physically inspected, tested, and verified back into central institutional inventory.
        </p>

        <!-- Return Details Card -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F8F9FA; border: 1px solid #E2E8F0; border-radius: 10px; margin-bottom: 20px; overflow: hidden;">
          <tr>
            <td colspan="2" style="background-color: #EDF2F7; padding: 10px 16px; border-bottom: 1px solid #E2E8F0; font-size: 11.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; color: #2C3E50;">
              Surrender & Inspection Verification Details
            </td>
          </tr>
          ${assetTag ? `
          <tr>
            <td style="padding: 9px 16px; width: 38%; font-size: 12.5px; color: #64748B; font-weight: 600; border-bottom: 1px solid #E2E8F0;">Asset Tag Number:</td>
            <td style="padding: 9px 16px; width: 62%; font-size: 13px; color: #059669; font-weight: 800; font-family: monospace; border-bottom: 1px solid #E2E8F0;">
              <span style="background-color: #ECFDF5; border: 1px solid #86EFAC; padding: 2px 8px; border-radius: 6px;">${assetTag}</span>
            </td>
          </tr>` : ''}
          <tr>
            <td style="padding: 9px 16px; font-size: 12.5px; color: #64748B; font-weight: 600; border-bottom: 1px solid #E2E8F0;">Device Make & Model:</td>
            <td style="padding: 9px 16px; font-size: 13px; color: #2C3E50; font-weight: 700; border-bottom: 1px solid #E2E8F0;">${laptopModel || 'Campus Notebook'}</td>
          </tr>
          <tr>
            <td style="padding: 9px 16px; font-size: 12.5px; color: #64748B; font-weight: 600; border-bottom: 1px solid #E2E8F0;">Hardware Serial (S/N):</td>
            <td style="padding: 9px 16px; font-size: 12.5px; color: #2C3E50; font-family: monospace; font-weight: 700; border-bottom: 1px solid #E2E8F0;">${serialNumber || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 9px 16px; font-size: 12.5px; color: #64748B; font-weight: 600; border-bottom: 1px solid #E2E8F0;">Return Received Date:</td>
            <td style="padding: 9px 16px; font-size: 13px; color: #2C3E50; font-weight: 700; border-bottom: 1px solid #E2E8F0;">${returnDate || new Date().toLocaleDateString('en-IN')}</td>
          </tr>
          <tr>
            <td style="padding: 9px 16px; font-size: 12.5px; color: #64748B; font-weight: 600; border-bottom: 1px solid #E2E8F0;">Inspection Condition:</td>
            <td style="padding: 9px 16px; font-size: 12.5px; color: #2C3E50; font-weight: 700; border-bottom: 1px solid #E2E8F0;">${returnCondition || 'Good / Normal'}</td>
          </tr>
          ${returnedBy ? `
          <tr>
            <td style="padding: 9px 16px; font-size: 12.5px; color: #64748B; font-weight: 600; border-bottom: 1px solid #E2E8F0;">Received & Verified By:</td>
            <td style="padding: 9px 16px; font-size: 12.5px; color: #2C3E50; font-weight: 600; border-bottom: 1px solid #E2E8F0;">${returnedBy}</td>
          </tr>` : ''}
          <tr>
            <td style="padding: 9px 16px; font-size: 12.5px; color: #64748B; font-weight: 600; border-bottom: 1px solid #E2E8F0;">Clearance Status:</td>
            <td style="padding: 9px 16px; font-size: 13px; color: #059669; font-weight: 800; border-bottom: 1px solid #E2E8F0;">
              ✓ NO OUTSTANDING DUES / FULLY RELEASED ${fineAmount > 0 ? `(Fine ₹${fineAmount} - ${finePaid ? 'PAID' : 'PENDING'})` : ''}
            </td>
          </tr>
          ${notes ? `
          <tr>
            <td style="padding: 9px 16px; font-size: 12.5px; color: #64748B; font-weight: 600;">Inspection / Return Notes:</td>
            <td style="padding: 9px 16px; font-size: 12px; color: #475569; font-style: italic;">${notes}</td>
          </tr>` : ''}
        </table>

        <!-- Prominent Green Clearance Callout -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F0FDF4; border: 1.5px solid #86EFAC; border-radius: 10px; padding: 16px; margin-bottom: 20px; text-align: center;">
          <tr>
            <td>
              <div style="font-size: 13px; font-weight: 800; color: #166534; margin-bottom: 3px;">
                Hardware Custody Record Closed
              </div>
              <div style="font-size: 12px; color: #15803D; line-height: 1.5;">
                Your institutional hardware accountability for device <strong>${assetTag || serialNumber}</strong> has been successfully cleared in the central registry.
              </div>
            </td>
          </tr>
        </table>

        <!-- Mandatory Institutional Liability Note -->
        <div style="padding: 12px 16px; background-color: #F8FAFC; border-left: 4px solid #94A3B8; border-radius: 6px; font-size: 11.5px; color: #64748B; line-height: 1.5;">
          "Note: You are solely responsible for the physical and technical integrity of the assigned asset during the allocation period. Any physical damage, loss, or unauthorized technical modification will attract appropriate institutional action."
        </div>
      </td>
    </tr>
    <!-- Footer -->
    <tr>
      <td style="background-color: #F8F9FA; border-top: 1px solid #E2E8F0; padding: 20px 24px; text-align: center;">
        <div style="font-size: 12px; font-weight: 700; color: #2C3E50;">
          SSISM Computer Lab & IT Operations Cell
        </div>
        <div style="font-size: 11px; color: #64748B; margin-top: 3px;">
          Sant Singaji Institute of Science and Management, Sandalpur, Teh - Khategaon, Dist - Dewas, MP
        </div>
        <div style="font-size: 11px; color: #64748B; margin-top: 3px;">
          Contact: <a href="mailto:computerlab@ssism.org" style="color: #059669; text-decoration: none; font-weight: 600;">computerlab@ssism.org</a>
        </div>
        <div style="margin-top: 10px; font-size: 10px; color: #94A3B8; border-top: 1px dashed #CBD5E1; padding-top: 8px;">
          Automated institutional clearance receipt dispatched via SSISM-IMS.
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
  issueDate,
  expectedReturnDate,
  dueDate,
  userRole,
  notes,
}) => {
  // Check user role: Skip students
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
    const fromAddress = process.env.SMTP_FROM || `"Sant Singaji Institute of Science and Management - IT Asset Management" <${process.env.SMTP_USER || 'computerlab@ssism.org'}>`;

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
      expectedReturnDate,
      dueDate,
      notes,
    });

    const attachments = [];
    if (fs.existsSync(LOGO_PATH)) {
      attachments.push({
        filename: 'ssism-logo.png',
        path: LOGO_PATH,
        cid: 'ssismlogo',
      });
    }

    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject: `SSISM Asset Management - Laptop Allocation [${assetTag || laptopModel || 'Device'}]`,
      html,
      attachments,
    });

    console.log("Email notification sent to Faculty:", to, "MessageId:", info.messageId);
    return { sent: true, messageId: info.messageId, recipient: to };
  } catch (err) {
    console.error("Failed to send email to Faculty:", to, err.message);
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
  // Check user role: Skip students
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
    const fromAddress = process.env.SMTP_FROM || `"Sant Singaji Institute of Science and Management - IT Asset Management" <${process.env.SMTP_USER || 'computerlab@ssism.org'}>`;

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

    const attachments = [];
    if (fs.existsSync(LOGO_PATH)) {
      attachments.push({
        filename: 'ssism-logo.png',
        path: LOGO_PATH,
        cid: 'ssismlogo',
      });
    }

    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject: `SSISM Asset Management - Laptop Surrender Clearance [${assetTag || laptopModel || 'Device'}]`,
      html,
      attachments,
    });

    console.log("Email notification sent to Faculty:", to, "MessageId:", info.messageId);
    return { sent: true, messageId: info.messageId, recipient: to };
  } catch (err) {
    console.error("Failed to send email to Faculty:", to, err.message);
    return { sent: false, error: err.message, recipient: to };
  }
};
