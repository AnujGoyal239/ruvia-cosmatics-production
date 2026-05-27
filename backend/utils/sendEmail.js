const nodemailer = require('nodemailer');

let cachedTransporter = null;

// Timeout (ms) for outbound email send. Keeps best-effort emails from blocking
// request handlers when the SMTP server is slow/unreachable.
const EMAIL_SEND_TIMEOUT_MS = 5000;

/**
 * Race a promise against a timeout. On timeout, rejects with a TimeoutError
 * tagged with `code: 'TIMEOUT'` so callers can detect and handle gracefully.
 */
const withTimeout = (promise, ms, label = 'operation') => {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error(`${label} timed out after ${ms}ms`);
      err.code = 'TIMEOUT';
      err.name = 'TimeoutError';
      reject(err);
    }, ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
};

const getTransporter = () => {
  if (cachedTransporter) return cachedTransporter;

  const host = process.env.EMAIL_HOST;
  const port = Number(process.env.EMAIL_PORT || 0);
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!host || !port || !user || !pass) {
    return null;
  }

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // common SMTPS port
    auth: { user, pass },
  });

  return cachedTransporter;
};

const sendEmail = async (options) => {
  // Feature flag: allow disabling emails without breaking flows
  const enabled = String(process.env.EMAIL_ENABLED || 'true').toLowerCase() !== 'false';
  if (!enabled) return;

  // Create a transporter
  const transporter = getTransporter();
  if (!transporter) {
    // Don't throw — email should be best-effort
    console.warn('Email transporter not configured (missing EMAIL_HOST/EMAIL_PORT/EMAIL_USER/EMAIL_PASS). Skipping email.');
    return;
  }

  // Define email options
  const fromName = process.env.EMAIL_FROM_NAME || 'Ruvia';
  const fromEmail = process.env.EMAIL_FROM_EMAIL || 'info@ruviacosmetics.com';
  const mailOptions = {
    from: `${fromName} <${fromEmail}>`,
    replyTo: process.env.EMAIL_REPLY_TO || undefined,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html, // Optional HTML version
  };

  // Send the email with a 5s timeout to prevent slow SMTP from holding
  // request handlers (Requirement 21).
  try {
    await withTimeout(
      transporter.sendMail(mailOptions),
      EMAIL_SEND_TIMEOUT_MS,
      'sendEmail'
    );
  } catch (err) {
    if (err && (err.code === 'TIMEOUT' || err.name === 'TimeoutError')) {
      console.warn('Email send timed out:', err.message);
      // Best-effort emails: swallow timeouts so callers (registration,
      // password reset, etc.) are not blocked by slow SMTP.
      return;
    }
    // Surface SMTP auth and connection errors loudly. These are the most
    // common reason a "successful" form submit produces no email
    // (e.g. Brevo IP allowlist, expired credentials, rate limit). The
    // caller is expected to wrap this in its own try/catch since email
    // delivery is best-effort, but a clear log line is essential so the
    // operator can diagnose silent delivery failures quickly.
    console.error(
      'Email send failed:',
      (err && (err.responseCode || err.code || '')) +
        ' ' +
        (err && err.message ? err.message : err)
    );
    throw err;
  }
};

module.exports = sendEmail;
