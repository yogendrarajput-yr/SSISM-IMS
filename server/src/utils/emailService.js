/**
 * Email Service Utility for SSISM Asset & Inventory Management System
 * 
 * Official Institution:
 * Sant Singaji Institute of Science and Management, Sandalpur, Teh - Khategaon, Dist - Dewas, MP
 * 
 * Configured with Nodemailer for automated institutional email notifications.
 * Delivery Rules:
 * - Sends official confirmation to both Students and Faculty / Employees upon laptop issue and return.
 * - Header container styled with pure white (#FFFFFF) background and border-bottom: 2px solid #D9531E
 *   ensuring maximum emblem/logo visibility.
 * - Dynamic student-specific details (Roll Number, Course/Branch, Semester/Batch) and Faculty details.
 * - Allocation custody duration tracking (e.g. "1 Year, 2 Months, 5 Days" or "45 Days").
 * - Accessory checklist verification.
 * - Mandatory Institutional Liability Disclaimer on custody allocation notices.
 * - Official sender metadata: "Sant Singaji Institute of Science and Management - IT Asset Management" <computerlab@ssism.org>.
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
 * Format elapsed time between issueDate and returnDate into human-readable text
 * e.g., "1 Year, 2 Months, 5 Days" or "45 Days"
 * 
 * @param {string|Date} startDate - Issue Date
 * @param {string|Date} endDate - Return Date
 * @returns {string} Human-readable duration
 */
export const formatAllocationDuration = (startDate, endDate) => {
  if (!startDate) return 'Not Recorded';
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date();

  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 'Not Recorded';
  if (end <= start) return '1 Day (Same Day Return)';

  const totalDays = Math.max(1, Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();

  if (days < 0) {
    months -= 1;
    const prevMonthLastDay = new Date(end.getFullYear(), end.getMonth(), 0).getDate();
    days += prevMonthLastDay;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const parts = [];
  if (years > 0) parts.push(`${years} ${years === 1 ? 'Year' : 'Years'}`);
  if (months > 0) parts.push(`${months} ${months === 1 ? 'Month' : 'Months'}`);
  if (days > 0) parts.push(`${days} ${days === 1 ? 'Day' : 'Days'}`);

  if (years === 0 && months === 0) {
    return `${totalDays} ${totalDays === 1 ? 'Day' : 'Days'}`;
  }

  return parts.length > 0 ? parts.join(', ') : `${totalDays} Days`;
};

/**
 * Normalize accessories input (JSON string, array, or object) to a clean array of strings
 */
export const formatAccessoriesList = (acc) => {
  if (!acc) return [];
  if (Array.isArray(acc)) return acc.filter(Boolean);
  if (typeof acc === 'string') {
    try {
      const parsed = JSON.parse(acc);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch {
      return [acc];
    }
  }
  if (typeof acc === 'object') {
    return Object.entries(acc)
      .filter(([_, v]) => Boolean(v))
      .map(([k]) => k.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()));
  }
  return [];
};

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
  rollNumber,
  userRole = 'STUDENT',
  courseBranch,
  semesterYear,
  department,
  laptopModel,
  serialNumber,
  assetTag,
  condition,
  chargerSerial,
  accessories = [],
  issueDate,
  expectedReturnDate,
  dueDate,
  notes,
}) => {
  const returnDueDisplay = expectedReturnDate || dueDate || 'Not Specified (Subject to Institutional Recall)';
  const isStudent = String(userRole || '').toUpperCase().trim() === 'STUDENT';
  const idValue = rollNumber || employeeId || 'N/A';
  const accessoriesList = formatAccessoriesList(accessories);

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
    <!-- Top Accent Bar -->
    <tr>
      <td style="height: 6px; background-color: #D9531E;"></td>
    </tr>
    <!-- Header (Light background to maximize logo visibility with clean separation border) -->
    <tr>
      <td style="background-color: #FFFFFF; padding: 26px 22px; text-align: center; border-bottom: 2px solid #D9531E;">
        <img src="cid:ssismlogo" alt="SSISM Logo" style="height: 58px; width: auto; margin: 0 auto 12px auto; display: block;" />
        <h1 style="margin: 0; font-size: 16px; font-weight: 800; color: #2C3E50; letter-spacing: 0.4px; text-transform: uppercase; line-height: 1.4;">
          Sant Singaji Institute of Science and Management
        </h1>
        <p style="margin: 4px 0 0; font-size: 11.5px; color: #64748B; font-weight: 600;">
          Sandalpur, Teh - Khategaon, Dist - Dewas, MP
        </p>
        <div style="display: inline-block; margin-top: 10px; padding: 3px 12px; background-color: #FFF7ED; border: 1px solid #FED7AA; border-radius: 20px; font-size: 10.5px; font-weight: 700; color: #D9531E; letter-spacing: 0.8px; text-transform: uppercase;">
          IT Asset & Inventory Management System
        </div>
      </td>
    </tr>
    <!-- Notice Banner -->
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
          Dear <strong>${userName}</strong>,
        </p>
        <p style="margin: 0 0 20px; font-size: 13px; line-height: 1.6; color: #475569;">
          This official notification confirms that the campus IT laptop computer detailed below has been formally issued to your custody for academic and professional use.
        </p>

        <!-- Recipient Information Card -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F8F9FA; border: 1px solid #E2E8F0; border-radius: 10px; margin-bottom: 20px; overflow: hidden;">
          <tr>
            <td colspan="2" style="background-color: #EDF2F7; padding: 10px 16px; border-bottom: 1px solid #E2E8F0; font-size: 11.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; color: #2C3E50;">
              ${isStudent ? 'Student Custody Profile' : 'Faculty / Staff Custody Profile'}
            </td>
          </tr>
          <tr>
            <td style="padding: 9px 16px; font-size: 12.5px; color: #64748B; font-weight: 600; width: 40%; border-bottom: 1px solid #E2E8F0;">Full Name:</td>
            <td style="padding: 9px 16px; font-size: 12.5px; color: #2C3E50; font-weight: 700; border-bottom: 1px solid #E2E8F0;">${userName}</td>
          </tr>
          <tr>
            <td style="padding: 9px 16px; font-size: 12.5px; color: #64748B; font-weight: 600; border-bottom: 1px solid #E2E8F0;">
              ${isStudent ? 'Roll Number:' : 'Employee / Staff ID:'}
            </td>
            <td style="padding: 9px 16px; font-size: 12.5px; color: #D9531E; font-family: monospace; font-weight: 800; border-bottom: 1px solid #E2E8F0;">${idValue}</td>
          </tr>
          <tr>
            <td style="padding: 9px 16px; font-size: 12.5px; color: #64748B; font-weight: 600; border-bottom: 1px solid #E2E8F0;">Institutional Role:</td>
            <td style="padding: 9px 16px; font-size: 12.5px; color: #2C3E50; font-weight: 600; border-bottom: 1px solid #E2E8F0;">
              <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; background-color: ${isStudent ? '#EFF6FF' : '#F0FDF4'}; color: ${isStudent ? '#1D4ED8' : '#15803D'};">
                ${userRole || (isStudent ? 'STUDENT' : 'FACULTY')}
              </span>
            </td>
          </tr>
          ${isStudent && (courseBranch || department) ? `
          <tr>
            <td style="padding: 9px 16px; font-size: 12.5px; color: #64748B; font-weight: 600; border-bottom: 1px solid #E2E8F0;">Course / Branch:</td>
            <td style="padding: 9px 16px; font-size: 12.5px; color: #2C3E50; font-weight: 600; border-bottom: 1px solid #E2E8F0;">${courseBranch || department}</td>
          </tr>` : ''}
          ${isStudent && semesterYear ? `
          <tr>
            <td style="padding: 9px 16px; font-size: 12.5px; color: #64748B; font-weight: 600; border-bottom: 1px solid #E2E8F0;">Batch / Academic Year:</td>
            <td style="padding: 9px 16px; font-size: 12.5px; color: #2C3E50; font-weight: 600; border-bottom: 1px solid #E2E8F0;">${semesterYear}</td>
          </tr>` : ''}
          <tr>
            <td style="padding: 9px 16px; font-size: 12.5px; color: #64748B; font-weight: 600;">Department:</td>
            <td style="padding: 9px 16px; font-size: 12.5px; color: #2C3E50; font-weight: 600;">${department || 'General Campus'}</td>
          </tr>
        </table>

        <!-- Device Specs Card -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F8F9FA; border: 1px solid #E2E8F0; border-radius: 10px; margin-bottom: 20px; overflow: hidden;">
          <tr>
            <td colspan="2" style="background-color: #EDF2F7; padding: 10px 16px; border-bottom: 1px solid #E2E8F0; font-size: 11.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; color: #2C3E50;">
              Hardware & Allocation Specifications
            </td>
          </tr>
          ${assetTag ? `
          <tr>
            <td style="padding: 9px 16px; font-size: 12.5px; color: #64748B; font-weight: 600; width: 40%; border-bottom: 1px solid #E2E8F0;">Asset Tag:</td>
            <td style="padding: 9px 16px; font-size: 12.5px; color: #D9531E; font-family: monospace; font-weight: 800; border-bottom: 1px solid #E2E8F0;">${assetTag}</td>
          </tr>` : ''}
          <tr>
            <td style="padding: 9px 16px; font-size: 12.5px; color: #64748B; font-weight: 600; border-bottom: 1px solid #E2E8F0;">Laptop Model:</td>
            <td style="padding: 9px 16px; font-size: 12.5px; color: #2C3E50; font-weight: 700; border-bottom: 1px solid #E2E8F0;">${laptopModel}</td>
          </tr>
          <tr>
            <td style="padding: 9px 16px; font-size: 12.5px; color: #64748B; font-weight: 600; border-bottom: 1px solid #E2E8F0;">Serial Number:</td>
            <td style="padding: 9px 16px; font-size: 12.5px; color: #2C3E50; font-family: monospace; font-weight: 600; border-bottom: 1px solid #E2E8F0;">${serialNumber}</td>
          </tr>
          <tr>
            <td style="padding: 9px 16px; font-size: 12.5px; color: #64748B; font-weight: 600; border-bottom: 1px solid #E2E8F0;">Physical Condition:</td>
            <td style="padding: 9px 16px; font-size: 12.5px; color: #059669; font-weight: 700; border-bottom: 1px solid #E2E8F0;">${condition || 'GOOD (Tested & Verified)'}</td>
          </tr>
          ${chargerSerial ? `
          <tr>
            <td style="padding: 9px 16px; font-size: 12.5px; color: #64748B; font-weight: 600; border-bottom: 1px solid #E2E8F0;">Charger Serial / OEM:</td>
            <td style="padding: 9px 16px; font-size: 12.5px; color: #2C3E50; font-family: monospace; border-bottom: 1px solid #E2E8F0;">${chargerSerial}</td>
          </tr>` : ''}
          
          <!-- Accessory Checklist Row -->
          <tr>
            <td style="padding: 9px 16px; font-size: 12.5px; color: #64748B; font-weight: 600; vertical-align: top; border-bottom: 1px solid #E2E8F0;">
              Issued Accessories:
            </td>
            <td style="padding: 9px 16px; font-size: 12.5px; color: #2C3E50; font-weight: 600; border-bottom: 1px solid #E2E8F0;">
              ${accessoriesList.length > 0
                ? `<div style="display: flex; flex-direction: column; gap: 4px;">
                    ${accessoriesList.map(item => `
                      <div>
                        <span style="color: #059669; font-weight: 800; margin-right: 6px;">[✓]</span>
                        <span>${item}</span>
                      </div>
                    `).join('')}
                   </div>`
                : '<span style="color: #64748B; font-weight: normal; font-style: italic;">Standard Power Adapter</span>'
              }
            </td>
          </tr>

          <tr>
            <td style="padding: 9px 16px; font-size: 12.5px; color: #64748B; font-weight: 600; border-bottom: 1px solid #E2E8F0;">Date of Issuance:</td>
            <td style="padding: 9px 16px; font-size: 12.5px; color: #2C3E50; font-weight: 600; border-bottom: 1px solid #E2E8F0;">${issueDate}</td>
          </tr>
          <tr>
            <td style="padding: 9px 16px; font-size: 12.5px; color: #64748B; font-weight: 600; border-bottom: 1px solid #E2E8F0;">Expected Return Date:</td>
            <td style="padding: 9px 16px; font-size: 12.5px; color: #D9531E; font-weight: 700; border-bottom: 1px solid #E2E8F0;">${returnDueDisplay}</td>
          </tr>
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
  rollNumber,
  userRole = 'STUDENT',
  courseBranch,
  semesterYear,
  department,
  laptopModel,
  serialNumber,
  assetTag,
  issueDate,
  returnDate,
  duration,
  returnCondition,
  fineAmount,
  finePaid,
  returnedBy,
  notes,
}) => {
  const isStudent = String(userRole || '').toUpperCase().trim() === 'STUDENT';
  const idValue = rollNumber || employeeId || 'N/A';
  const durationText = duration || (issueDate && returnDate ? formatAllocationDuration(issueDate, returnDate) : 'Completed Custody Term');

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
    <!-- Header (Light background for logo clarity with separation border) -->
    <tr>
      <td style="background-color: #FFFFFF; padding: 26px 22px; text-align: center; border-bottom: 2px solid #D9531E;">
        <img src="cid:ssismlogo" alt="SSISM Logo" style="height: 58px; width: auto; margin: 0 auto 12px auto; display: block;" />
        <h1 style="margin: 0; font-size: 16px; font-weight: 800; color: #2C3E50; letter-spacing: 0.4px; text-transform: uppercase; line-height: 1.4;">
          Sant Singaji Institute of Science and Management
        </h1>
        <p style="margin: 4px 0 0; font-size: 11.5px; color: #64748B; font-weight: 600;">
          Sandalpur, Teh - Khategaon, Dist - Dewas, MP
        </p>
        <div style="display: inline-block; margin-top: 10px; padding: 3px 12px; background-color: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 20px; font-size: 10.5px; font-weight: 700; color: #059669; letter-spacing: 0.8px; text-transform: uppercase;">
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
          Dear <strong>${userName}</strong>,
        </p>
        <p style="margin: 0 0 20px; font-size: 13px; line-height: 1.6; color: #475569;">
          This official document certifies that the campus laptop computer allocated to your custody has been physically inspected, tested, and verified back into central institutional inventory.
        </p>

        <!-- Allocation Duration Highlight Box -->
        <div style="margin-bottom: 20px; padding: 14px 18px; background-color: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 10px;">
          <div style="font-size: 11px; font-weight: 800; color: #166534; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 4px;">
            Total Custody Duration
          </div>
          <div style="font-size: 18px; font-weight: 900; color: #15803D;">
            ${durationText}
          </div>
          ${issueDate && returnDate ? `
          <div style="font-size: 11.5px; color: #166534; font-weight: 600; margin-top: 4px;">
            Issued on ${issueDate} • Surrendered on ${returnDate}
          </div>` : ''}
        </div>

        <!-- Recipient Information Card -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F8F9FA; border: 1px solid #E2E8F0; border-radius: 10px; margin-bottom: 20px; overflow: hidden;">
          <tr>
            <td colspan="2" style="background-color: #EDF2F7; padding: 10px 16px; border-bottom: 1px solid #E2E8F0; font-size: 11.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; color: #2C3E50;">
              ${isStudent ? 'Student Clearance Profile' : 'Faculty / Staff Clearance Profile'}
            </td>
          </tr>
          <tr>
            <td style="padding: 9px 16px; font-size: 12.5px; color: #64748B; font-weight: 600; width: 40%; border-bottom: 1px solid #E2E8F0;">Full Name:</td>
            <td style="padding: 9px 16px; font-size: 12.5px; color: #2C3E50; font-weight: 700; border-bottom: 1px solid #E2E8F0;">${userName}</td>
          </tr>
          <tr>
            <td style="padding: 9px 16px; font-size: 12.5px; color: #64748B; font-weight: 600; border-bottom: 1px solid #E2E8F0;">
              ${isStudent ? 'Roll Number:' : 'Employee / Staff ID:'}
            </td>
            <td style="padding: 9px 16px; font-size: 12.5px; color: #059669; font-family: monospace; font-weight: 800; border-bottom: 1px solid #E2E8F0;">${idValue}</td>
          </tr>
          ${isStudent && (courseBranch || department) ? `
          <tr>
            <td style="padding: 9px 16px; font-size: 12.5px; color: #64748B; font-weight: 600; border-bottom: 1px solid #E2E8F0;">Course / Branch:</td>
            <td style="padding: 9px 16px; font-size: 12.5px; color: #2C3E50; font-weight: 600; border-bottom: 1px solid #E2E8F0;">${courseBranch || department}</td>
          </tr>` : ''}
          ${isStudent && semesterYear ? `
          <tr>
            <td style="padding: 9px 16px; font-size: 12.5px; color: #64748B; font-weight: 600; border-bottom: 1px solid #E2E8F0;">Batch / Academic Year:</td>
            <td style="padding: 9px 16px; font-size: 12.5px; color: #2C3E50; font-weight: 600; border-bottom: 1px solid #E2E8F0;">${semesterYear}</td>
          </tr>` : ''}
          <tr>
            <td style="padding: 9px 16px; font-size: 12.5px; color: #64748B; font-weight: 600;">Department:</td>
            <td style="padding: 9px 16px; font-size: 12.5px; color: #2C3E50; font-weight: 600;">${department || 'General Campus'}</td>
          </tr>
        </table>

        <!-- Return Inspection Details Card -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F8F9FA; border: 1px solid #E2E8F0; border-radius: 10px; margin-bottom: 20px; overflow: hidden;">
          <tr>
            <td colspan="2" style="background-color: #EDF2F7; padding: 10px 16px; border-bottom: 1px solid #E2E8F0; font-size: 11.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; color: #2C3E50;">
              Hardware & Surrender Verification Record
            </td>
          </tr>
          ${assetTag ? `
          <tr>
            <td style="padding: 9px 16px; font-size: 12.5px; color: #64748B; font-weight: 600; width: 40%; border-bottom: 1px solid #E2E8F0;">Asset Tag:</td>
            <td style="padding: 9px 16px; font-size: 12.5px; color: #059669; font-family: monospace; font-weight: 800; border-bottom: 1px solid #E2E8F0;">${assetTag}</td>
          </tr>` : ''}
          <tr>
            <td style="padding: 9px 16px; font-size: 12.5px; color: #64748B; font-weight: 600; border-bottom: 1px solid #E2E8F0;">Laptop Model:</td>
            <td style="padding: 9px 16px; font-size: 12.5px; color: #2C3E50; font-weight: 700; border-bottom: 1px solid #E2E8F0;">${laptopModel}</td>
          </tr>
          <tr>
            <td style="padding: 9px 16px; font-size: 12.5px; color: #64748B; font-weight: 600; border-bottom: 1px solid #E2E8F0;">Serial Number:</td>
            <td style="padding: 9px 16px; font-size: 12.5px; color: #2C3E50; font-family: monospace; border-bottom: 1px solid #E2E8F0;">${serialNumber}</td>
          </tr>
          <tr>
            <td style="padding: 9px 16px; font-size: 12.5px; color: #64748B; font-weight: 600; border-bottom: 1px solid #E2E8F0;">Return Date:</td>
            <td style="padding: 9px 16px; font-size: 12.5px; color: #2C3E50; font-weight: 600; border-bottom: 1px solid #E2E8F0;">${returnDate}</td>
          </tr>
          <tr>
            <td style="padding: 9px 16px; font-size: 12.5px; color: #64748B; font-weight: 600; border-bottom: 1px solid #E2E8F0;">Return Condition:</td>
            <td style="padding: 9px 16px; font-size: 12.5px; font-weight: 700; border-bottom: 1px solid #E2E8F0; color: ${returnCondition === 'DAMAGED' ? '#DC2626' : '#059669'};">
              ${returnCondition || 'GOOD (Inspection Passed)'}
            </td>
          </tr>
          ${Number(fineAmount) > 0 ? `
          <tr>
            <td style="padding: 9px 16px; font-size: 12.5px; color: #64748B; font-weight: 600; border-bottom: 1px solid #E2E8F0;">Damage / Fine Assessment:</td>
            <td style="padding: 9px 16px; font-size: 12.5px; font-weight: 700; border-bottom: 1px solid #E2E8F0; color: #DC2626;">
              ₹${fineAmount} (${finePaid ? 'PAID / Cleared' : 'PENDING / Unpaid'})
            </td>
          </tr>` : ''}
          ${returnedBy ? `
          <tr>
            <td style="padding: 9px 16px; font-size: 12.5px; color: #64748B; font-weight: 600; border-bottom: 1px solid #E2E8F0;">Received / Inspected By:</td>
            <td style="padding: 9px 16px; font-size: 12.5px; color: #2C3E50; font-weight: 600; border-bottom: 1px solid #E2E8F0;">${returnedBy}</td>
          </tr>` : ''}
          ${notes ? `
          <tr>
            <td style="padding: 9px 16px; font-size: 12.5px; color: #64748B; font-weight: 600;">Inspection Remarks:</td>
            <td style="padding: 9px 16px; font-size: 12px; color: #475569; font-style: italic;">${notes}</td>
          </tr>` : ''}
        </table>

        <!-- Clearance Notice -->
        <div style="margin-top: 18px; padding: 14px 18px; background-color: #ECFDF5; border-left: 4px solid #059669; border-radius: 6px; font-size: 12px; color: #065F46; line-height: 1.6;">
          <strong>No-Dues Custody Clearance:</strong> The laptop hardware record has been closed in the SSISM central database. Your inventory profile is clear with respect to this asset. Please retain this email as proof of surrender for no-dues and semester clearance formalities.
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
 * Sends official notification to Students, Faculty, and Staff.
 */
export const sendLaptopIssuedEmail = async ({
  to,
  userName,
  employeeId,
  rollNumber,
  userRole = 'STUDENT',
  courseBranch,
  semesterYear,
  department,
  laptopModel,
  serialNumber,
  assetTag,
  condition,
  chargerSerial,
  accessories = [],
  issueDate,
  expectedReturnDate,
  dueDate,
  notes,
}) => {
  if (!to) {
    console.warn(`[emailService] Cannot send issue email: No recipient email address provided for ${userName}`);
    return { sent: false, error: 'NO_RECIPIENT_EMAIL' };
  }

  try {
    const transporter = getTransporter();
    const fromAddress = process.env.SMTP_FROM || `"Sant Singaji Institute of Science and Management - IT Asset Management" <${process.env.SMTP_USER || 'computerlab@ssism.org'}>`;

    const html = generateIssuedEmailHtml({
      userName: userName || 'Recipient',
      employeeId,
      rollNumber,
      userRole,
      courseBranch,
      semesterYear,
      department,
      laptopModel: laptopModel || 'Campus Laptop',
      serialNumber: serialNumber || 'N/A',
      assetTag: assetTag || '',
      condition,
      chargerSerial,
      accessories,
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

    console.log(`[emailService] Issue email sent to ${userRole}: ${to} (MessageId: ${info.messageId})`);
    return { sent: true, messageId: info.messageId, recipient: to };
  } catch (err) {
    console.error(`[emailService] Failed to send issue email to ${to}:`, err.message);
    return { sent: false, error: err.message, recipient: to };
  }
};

/**
 * Asynchronous function: Send Laptop Returned Email
 * Sends official notification to Students, Faculty, and Staff.
 */
export const sendLaptopReturnedEmail = async ({
  to,
  userName,
  employeeId,
  rollNumber,
  userRole = 'STUDENT',
  courseBranch,
  semesterYear,
  department,
  laptopModel,
  serialNumber,
  assetTag,
  issueDate,
  returnDate,
  duration,
  returnCondition,
  fineAmount,
  finePaid,
  returnedBy,
  notes,
}) => {
  if (!to) {
    console.warn(`[emailService] Cannot send return email: No recipient email address provided for ${userName}`);
    return { sent: false, error: 'NO_RECIPIENT_EMAIL' };
  }

  try {
    const transporter = getTransporter();
    const fromAddress = process.env.SMTP_FROM || `"Sant Singaji Institute of Science and Management - IT Asset Management" <${process.env.SMTP_USER || 'computerlab@ssism.org'}>`;

    const html = generateReturnedEmailHtml({
      userName: userName || 'Recipient',
      employeeId,
      rollNumber,
      userRole,
      courseBranch,
      semesterYear,
      department,
      laptopModel: laptopModel || 'Campus Laptop',
      serialNumber: serialNumber || 'N/A',
      assetTag: assetTag || '',
      issueDate,
      returnDate: returnDate || new Date().toLocaleDateString('en-IN'),
      duration,
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

    console.log(`[emailService] Return email sent to ${userRole}: ${to} (MessageId: ${info.messageId})`);
    return { sent: true, messageId: info.messageId, recipient: to };
  } catch (err) {
    console.error(`[emailService] Failed to send return email to ${to}:`, err.message);
    return { sent: false, error: err.message, recipient: to };
  }
};
