// Email sending utility using Brevo SMTP via nodemailer
// Uses the SMTP credentials provided by the user

import nodemailer from 'nodemailer';

const BREVO_SMTP_SERVER = process.env.BREVO_SMTP_SERVER || 'smtp-relay.brevo.com';
const BREVO_SMTP_PORT = parseInt(process.env.BREVO_SMTP_PORT || '587');
const BREVO_SMTP_LOGIN = process.env.BREVO_SMTP_LOGIN || '';
const BREVO_API_KEY = process.env.BREVO_API_KEY || '';
const BREVO_FROM_EMAIL = process.env.BREVO_FROM_EMAIL || 'noreply@trishulhub.com';
const BREVO_FROM_NAME = process.env.BREVO_FROM_NAME || 'TrishulHub Pay Tracker';

// Create reusable transporter using Brevo SMTP
const transporter = nodemailer.createTransport({
  host: BREVO_SMTP_SERVER,
  port: BREVO_SMTP_PORT,
  secure: false, // true for 465, false for other ports (587 uses STARTTLS)
  auth: {
    user: BREVO_SMTP_LOGIN,
    pass: BREVO_API_KEY, // Brevo uses the API key as the SMTP password
  },
});

interface EmailPayload {
  to: { email: string; name?: string }[];
  subject: string;
  htmlContent: string;
  textContent?: string;
}

export async function sendEmail(payload: EmailPayload): Promise<{ success: boolean; error?: string }> {
  if (!BREVO_SMTP_LOGIN || !BREVO_API_KEY) {
    console.error('Brevo SMTP credentials not configured');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const result = await transporter.sendMail({
      from: `"${BREVO_FROM_NAME}" <${BREVO_FROM_EMAIL}>`,
      to: payload.to.map((t) => t.name ? `"${t.name}" <${t.email}>` : t.email).join(', '),
      subject: payload.subject,
      html: payload.htmlContent,
      text: payload.textContent || '',
    });

    console.log(`[EMAIL] Sent successfully to ${payload.to.map(t => t.email).join(', ')} - MessageId: ${result.messageId}`);
    return { success: true };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error: 'Failed to send email' };
  }
}

export function generateOtpCode(): string {
  // Generate a 6-digit OTP
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function getOtpExpiry(): Date {
  // OTP expires in 10 minutes
  return new Date(Date.now() + 10 * 60 * 1000);
}

export function getOtpEmailHtml(code: string, type: 'SIGNUP' | 'PASSWORD_RESET'): string {
  const title = type === 'SIGNUP' ? 'Verify Your Email' : 'Reset Your Password';
  const description = type === 'SIGNUP'
    ? 'Welcome to TrishulHub Pay Tracker! Please verify your email address to complete your registration.'
    : 'We received a request to reset your password. Use the code below to proceed.';
  const actionText = type === 'SIGNUP' ? 'complete your registration' : 'reset your password';
  const expiryText = 'This code expires in 10 minutes.';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f5f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f5f7; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 480px;">
          <!-- Logo & Brand -->
          <tr>
            <td align="center" style="padding-bottom: 30px;">
              <h1 style="margin: 0; color: #2563eb; font-size: 24px; font-weight: 700;">TrishulHub</h1>
              <p style="margin: 4px 0 0; color: #64748b; font-size: 14px;">Pay Tracker</p>
            </td>
          </tr>
          <!-- Card -->
          <tr>
            <td style="background-color: #ffffff; border-radius: 16px; padding: 40px 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <h2 style="margin: 0 0 16px; color: #1e293b; font-size: 22px; font-weight: 600;">${title}</h2>
              <p style="margin: 0 0 24px; color: #475569; font-size: 15px; line-height: 1.5;">
                ${description}
              </p>
              <!-- OTP Code Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="background-color: #f1f5f9; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                    <p style="margin: 0 0 8px; color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Your verification code</p>
                    <p style="margin: 0; font-size: 36px; font-weight: 700; color: #2563eb; letter-spacing: 6px; font-family: 'Courier New', monospace;">${code}</p>
                  </td>
                </tr>
              </table>
              <p style="margin: 16px 0 0; color: #94a3b8; font-size: 13px;">
                Enter this code to ${actionText}. ${expiryText}
              </p>
              <p style="margin: 12px 0 0; color: #94a3b8; font-size: 13px;">
                If you didn't request this, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top: 24px;">
              <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                &copy; ${new Date().getFullYear()} TrishulHub. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function getPasswordResetSuccessHtml(): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f5f7;padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:480px;">
        <tr><td align="center" style="padding-bottom:30px;">
          <h1 style="margin:0;color:#2563eb;font-size:24px;font-weight:700;">TrishulHub</h1>
        </td></tr>
        <tr><td style="background:#fff;border-radius:16px;padding:40px 32px;box-shadow:0 1px 3px rgba(0,0,0,.1);">
          <h2 style="margin:0 0 16px;color:#1e293b;font-size:22px;">Password Changed Successfully</h2>
          <p style="margin:0;color:#475569;font-size:15px;line-height:1.5;">
            Your TrishulHub Pay Tracker password has been reset. If you didn't make this change, please contact us immediately at support@trishulhub.com.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
