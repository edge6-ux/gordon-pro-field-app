import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM = 'jobs@gordonprotreeservice.com'
const COMPANY = 'Gordon Pro Tree Service'
const PHONE = '(770) 271-6072'
const PHONE_LINK = 'tel:7702716072'
const WEBSITE = 'https://gordonprotreeservice.com'

function emailWrapper(bodyHtml: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body {
      background-color: #F5F2ED;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      font-size: 16px;
      color: #1A1A1A;
    }
    .wrapper { width: 100%; background-color: #F5F2ED; padding: 32px 16px; }
    .container {
      max-width: 580px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
    }
    .header { background-color: #1C3A2B; padding: 28px 32px; text-align: center; }
    .header-company {
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #9FE1CB;
      margin-top: 10px;
    }
    .gold-bar { height: 4px; background-color: #C8922A; }
    .body { padding: 36px 36px 28px; }
    .greeting { font-size: 20px; font-weight: 700; color: #1C3A2B; margin-bottom: 14px; }
    p { font-size: 15px; color: #4A4A4A; line-height: 1.7; margin-bottom: 14px; }
    .reference-box {
      background: #EAF3DE;
      border: 1px solid #C0DD97;
      border-left: 4px solid #1C3A2B;
      border-radius: 10px;
      padding: 16px 20px;
      margin: 22px 0;
    }
    .reference-label {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #3B6D11;
      margin-bottom: 4px;
    }
    .reference-code {
      font-size: 24px;
      font-weight: 700;
      font-family: 'Courier New', monospace;
      color: #1C3A2B;
      letter-spacing: 0.05em;
    }
    .reference-sub { font-size: 12px; color: #3B6D11; margin-top: 4px; }
    .cta-wrap { text-align: center; margin: 28px 0 20px; }
    .cta-button {
      display: inline-block;
      background-color: #1C3A2B;
      color: #ffffff !important;
      font-size: 14px;
      font-weight: 700;
      text-decoration: none;
      padding: 13px 32px;
      border-radius: 10px;
    }
    .phone-box {
      background: #1C3A2B;
      border-radius: 10px;
      padding: 14px 20px;
      text-align: center;
      margin: 20px 0;
    }
    .phone-label {
      font-size: 11px;
      color: #9FE1CB;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 600;
      margin-bottom: 4px;
    }
    .phone-number { font-size: 20px; font-weight: 700; color: #ffffff; text-decoration: none; }
    .signature { margin-top: 28px; padding-top: 20px; border-top: 1px solid #E5E3DE; }
    .sig-name { font-size: 14px; font-weight: 700; color: #1A1A1A; }
    .sig-title { font-size: 13px; color: #888780; }
    .footer { background: #1C3A2B; padding: 24px 32px; text-align: center; }
    .footer-name { font-size: 14px; font-weight: 700; color: #ffffff; margin-bottom: 4px; }
    .footer-contact { font-size: 12px; color: #9FE1CB; margin-bottom: 2px; }
    .footer-contact a { color: #9FE1CB; text-decoration: none; }
    .footer-address { font-size: 11px; color: rgba(159,225,203,0.5); margin-top: 6px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <div class="header-company">Gordon Pro Tree Service</div>
      </div>
      <div class="gold-bar"></div>
      <div class="body">
        ${bodyHtml}
        <div class="signature">
          <div class="sig-name">The Gordon Pro Team</div>
          <div class="sig-title">Gordon Pro Tree Service &middot; Lula, GA</div>
        </div>
      </div>
      <div class="footer">
        <div class="footer-name">Gordon Pro Tree Service</div>
        <div class="footer-contact">
          <a href="${PHONE_LINK}">${PHONE}</a>
          &nbsp;&middot;&nbsp;
          <a href="mailto:admin@gordonprotree.com">admin@gordonprotree.com</a>
        </div>
        <div class="footer-contact">
          <a href="${WEBSITE}">gordonprotreeservice.com</a>
        </div>
        <div class="footer-address">5662 Cemetery Rd &middot; Lula, GA 30554</div>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim()
}

// ── Email 1 — Submission Confirmed ──────────────────────────────────────────
// Trigger: /api/submit on new customer submission
// Sends to: customer email
// Timing: immediately after successful insert

export async function sendSubmissionConfirmed(params: {
  customerName: string
  customerEmail: string
  referenceCode: string
  trackingUrl: string
}): Promise<void> {
  const { customerName, customerEmail, referenceCode, trackingUrl } = params
  const firstName = customerName.split(' ')[0] || 'there'

  const body = `
    <p class="greeting">Hi ${firstName},</p>

    <p>
      Thanks for reaching out to Gordon Pro Tree Service. We've received your tree
      assessment and our team will review it shortly.
    </p>

    <p>
      We'll review your photos and AI assessment — usually within a few hours
      during business hours. Once we've taken a look, we'll reach out to discuss
      the job and get you a quote.
    </p>

    <div class="reference-box">
      <div class="reference-label">Your Reference Number</div>
      <div class="reference-code">${referenceCode}</div>
      <div class="reference-sub">Save this to track your job status</div>
    </div>

    <div class="cta-wrap">
      <a href="${trackingUrl}" class="cta-button">Track Your Job Status &rarr;</a>
    </div>

    <div class="phone-box">
      <div class="phone-label">Questions? Call us anytime</div>
      <a href="${PHONE_LINK}" class="phone-number">${PHONE}</a>
    </div>
  `

  await resend.emails.send({
    from: `${COMPANY} <${FROM}>`,
    to: customerEmail,
    subject: "We got your assessment — here's what happens next",
    html: emailWrapper(body),
  })
}

// ── Future emails ────────────────────────────────────────────────────────────
// sendJobReviewed()
// sendJobScheduled()
// sendJobComplete()
// sendReviewRequest()
// sendReengagement()
