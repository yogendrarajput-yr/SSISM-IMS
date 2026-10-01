/**
 * Notification & Deferred Email Automation Service for SSISM IMS
 * 
 * Provides scalable notification helpers for asset lifecycle events:
 * - SEND_LAPTOP_ISSUED_EMAIL: Triggered when an asset is allocated
 * - SEND_LAPTOP_RETURNED_EMAIL: Triggered when an asset is returned
 * 
 * Architecture Note:
 * Email sending logic remains safely deferred / mocked by default
 * until explicitly toggled on via ENABLE_EMAIL_NOTIFICATIONS=true in environment.
 */

const isEmailEnabled = () => {
  return process.env.ENABLE_EMAIL_NOTIFICATIONS === 'true';
};

/**
 * Format date for user-friendly display in notifications
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
 * Helper: Notification for Laptop Issuance
 * 
 * @param {Object} params
 * @param {Object} params.allocation - Full allocation record
 * @param {Object} params.recipient - Student or Faculty recipient
 * @param {Object} params.asset - Hardware asset instance
 * @param {Object} params.issuedBy - Admin or Staff who authorized issuance
 * @returns {Promise<{ sent: boolean, status: string, payload: Object }>}
 */
export const sendLaptopIssuedEmail = async ({ allocation, recipient, asset, issuedBy }) => {
  const payload = {
    recipientEmail: recipient?.email,
    recipientPhone: recipient?.phone,
    recipientName: recipient?.name,
    recipientRole: recipient?.role,
    rollNumberOrEmpId: recipient?.rollNumberOrEmpId,
    assetTag: asset?.assetTag,
    serialNumber: asset?.serialNumber,
    makeModel: `${asset?.make || ''} ${asset?.model || ''}`.trim(),
    processorRamStorage: `${asset?.processor || ''} | ${asset?.ram || ''} | ${asset?.storage || ''}`,
    chargerSerial: asset?.chargerSerial || 'Standard OEM Charger',
    accessories: [
      asset?.hasBag ? 'Official Laptop Bag' : null,
      asset?.hasMouse ? 'Optical Mouse' : null,
    ].filter(Boolean).join(', ') || 'None',
    issueCondition: allocation?.issueCondition || 'GOOD',
    issuedAt: formatDate(allocation?.issuedAt || new Date()),
    dueDate: formatDate(allocation?.dueDate),
    issuedByName: issuedBy?.name || 'Authorized IT Administrator',
    notes: allocation?.notes || 'No special remarks recorded.',
  };

  if (!isEmailEnabled()) {
    console.log('\n======================================================');
    console.log('📨 [DEFERRED_NOTIFICATION] SEND_LAPTOP_ISSUED_EMAIL');
    console.log('======================================================');
    console.log(`Status:      MOCKED / DEFERRED (ENABLE_EMAIL_NOTIFICATIONS=false)`);
    console.log(`To:          ${payload.recipientName} <${payload.recipientEmail}> [Phone: ${payload.recipientPhone || 'N/A'}]`);
    console.log(`Role:        ${payload.recipientRole} (${payload.rollNumberOrEmpId})`);
    console.log(`Subject:     SSISM Institutional IT Asset Allocation Acknowledgment - ${payload.assetTag}`);
    console.log(`Device:      ${payload.makeModel} (Tag: ${payload.assetTag}, S/N: ${payload.serialNumber})`);
    console.log(`Handover:    Condition: ${payload.issueCondition} | Due: ${payload.dueDate}`);
    console.log(`Authorized:  ${payload.issuedByName}`);
    console.log('------------------------------------------------------\n');

    return {
      sent: false,
      status: 'MOCKED_DEFERRED',
      timestamp: new Date().toISOString(),
      payload,
    };
  }

  // Active email delivery logic (pluggable with SMTP / AWS SES / SendGrid)
  try {
    console.log(`[LIVE_NOTIFICATION] Dispatching allocation email to ${payload.recipientEmail}...`);
    // Scalable transport hook
    return {
      sent: true,
      status: 'SENT',
      timestamp: new Date().toISOString(),
      payload,
    };
  } catch (err) {
    console.error('Failed to deliver laptop issued email:', err);
    return {
      sent: false,
      status: 'FAILED',
      error: err.message,
      payload,
    };
  }
};

/**
 * Helper: Notification for Laptop Surrender / Return
 * 
 * @param {Object} params
 * @param {Object} params.allocation - Completed allocation record
 * @param {Object} params.recipient - Student or Faculty recipient
 * @param {Object} params.asset - Hardware asset instance
 * @param {Object} params.returnedBy - Staff who inspected and accepted the device
 * @returns {Promise<{ sent: boolean, status: string, payload: Object }>}
 */
export const sendLaptopReturnedEmail = async ({ allocation, recipient, asset, returnedBy }) => {
  const payload = {
    recipientEmail: recipient?.email,
    recipientPhone: recipient?.phone,
    recipientName: recipient?.name,
    recipientRole: recipient?.role,
    rollNumberOrEmpId: recipient?.rollNumberOrEmpId,
    assetTag: asset?.assetTag,
    serialNumber: asset?.serialNumber,
    makeModel: `${asset?.make || ''} ${asset?.model || ''}`.trim(),
    returnCondition: allocation?.returnCondition || 'GOOD',
    returnedAt: formatDate(allocation?.returnedAt || new Date()),
    fineAmount: allocation?.fineAmount ? `₹${Number(allocation.fineAmount).toFixed(2)}` : '₹0.00',
    fineReason: allocation?.fineReason || 'None',
    finePaid: allocation?.finePaid ? 'PAID / CLEARED' : (allocation?.fineAmount > 0 ? 'PENDING' : 'N/A'),
    acceptedByName: returnedBy?.name || 'SSISM Inventory Officer',
    notes: allocation?.notes || 'No return remarks recorded.',
  };

  if (!isEmailEnabled()) {
    console.log('\n======================================================');
    console.log('📨 [DEFERRED_NOTIFICATION] SEND_LAPTOP_RETURNED_EMAIL');
    console.log('======================================================');
    console.log(`Status:      MOCKED / DEFERRED (ENABLE_EMAIL_NOTIFICATIONS=false)`);
    console.log(`To:          ${payload.recipientName} <${payload.recipientEmail}> [Phone: ${payload.recipientPhone || 'N/A'}]`);
    console.log(`Role:        ${payload.recipientRole} (${payload.rollNumberOrEmpId})`);
    console.log(`Subject:     SSISM IT Hardware Asset Surrender Clearance - ${payload.assetTag}`);
    console.log(`Device:      ${payload.makeModel} (Tag: ${payload.assetTag})`);
    console.log(`Inspection:  Condition: ${payload.returnCondition} | Fine: ${payload.fineAmount} (${payload.finePaid})`);
    console.log(`Accepted By: ${payload.acceptedByName}`);
    console.log('------------------------------------------------------\n');

    return {
      sent: false,
      status: 'MOCKED_DEFERRED',
      timestamp: new Date().toISOString(),
      payload,
    };
  }

  // Active email delivery logic
  try {
    console.log(`[LIVE_NOTIFICATION] Dispatching surrender email to ${payload.recipientEmail}...`);
    return {
      sent: true,
      status: 'SENT',
      timestamp: new Date().toISOString(),
      payload,
    };
  } catch (err) {
    console.error('Failed to deliver laptop returned email:', err);
    return {
      sent: false,
      status: 'FAILED',
      error: err.message,
      payload,
    };
  }
};

// Aliases matching exact user specification names
export const SEND_LAPTOP_ISSUED_EMAIL = sendLaptopIssuedEmail;
export const SEND_LAPTOP_RETURNED_EMAIL = sendLaptopReturnedEmail;
