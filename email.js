// email.js
// Dispatches automated transactional emails through the Apps Script bridge (Zoho / ZeptoMail)
let APPS_SCRIPT_URL = '';
let APPS_SCRIPT_SECRET = '';

try {
  const config = await import('./config.js');
  APPS_SCRIPT_URL = config.APPS_SCRIPT_URL || '';
  APPS_SCRIPT_SECRET = config.APPS_SCRIPT_SECRET || '';
} catch (e) {
  console.warn('[email.js] config.js not found or failed to load. Automated email dispatch is inactive.');
}

async function dispatchEmail(emailType, recipient, data = {}) {
  if (!recipient) {
    console.warn("No recipient provided for automated email:", emailType);
    return;
  }
  if (!APPS_SCRIPT_URL) {
    console.warn("Google Apps Script URL is not configured; skipping email dispatch.");
    return;
  }

  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        secret: APPS_SCRIPT_SECRET,
        action: 'send_email',
        emailType,
        recipient,
        data
      })
    });
    const result = await res.json();
    return result;
  } catch (err) {
    console.warn(`Error dispatching ${emailType} email to ${recipient}:`, err);
    return { error: err.message };
  }
}

// 1. User Registration Welcome Email
export function sendRegistrationEmail({ email, name, uid }) {
  return dispatchEmail('registration', email, { name, uid });
}

// 2. Publication Submission Received Email
export function sendSubmissionEmail({ email, name, title, field }) {
  return dispatchEmail('submission', email, { name, title, field });
}

// 3. Publication Approved Email
export function sendApprovalEmail({ email, name, title, paperId }) {
  return dispatchEmail('approval', email, { name, title, paperId });
}

// 4. Publication Denial / Rejection Email
export function sendRejectionEmail({ email, name, title }) {
  return dispatchEmail('denial', email, { name, title });
}
