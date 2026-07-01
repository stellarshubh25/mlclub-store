const nodemailer = require("nodemailer");

const SMTP_CONFIGURED = Boolean(
  process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
);

let transporter = null;
if (SMTP_CONFIGURED) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

/**
 * Sends the OTP email. Falls back to logging the OTP to the console when
 * SMTP credentials are not configured, so the flow can be tested locally
 * without a real mail account.
 */
async function sendOtpEmail(toEmail, otpCode) {
  const subject = "Your ML Club Store verification code";
  const text = `Your verification code is ${otpCode}. It expires in 10 minutes. If you didn't request this, you can ignore this email.`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color:#12181F;">ML Club Store</h2>
      <p>Your verification code is:</p>
      <p style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color:#2F6FED;">${otpCode}</p>
      <p style="color:#555;">This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.</p>
    </div>
  `;

  if (!SMTP_CONFIGURED) {
    console.log(
      `\n[DEV MODE - no SMTP configured] OTP for ${toEmail}: ${otpCode}\n` +
        `Set SMTP_HOST / SMTP_USER / SMTP_PASS in .env to send real emails.\n`
    );
    return { devMode: true };
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: toEmail,
    subject,
    text,
    html,
  });
  return { devMode: false };
}

async function sendOrderConfirmationEmail(toEmail, order) {
  const itemsHtml = order.items
    .map(
      (i) =>
        `<tr><td style="padding:4px 8px;">${i.name}</td><td style="padding:4px 8px;">x${i.quantity}</td><td style="padding:4px 8px;">₹${(i.price * i.quantity).toFixed(2)}</td></tr>`
    )
    .join("");

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color:#12181F;">Order Confirmed 🎉</h2>
      <p>Order ID: <strong>${order.id}</strong></p>
      <table style="width:100%; border-collapse: collapse;">${itemsHtml}</table>
      <p style="margin-top:12px;">Total: <strong>₹${order.total_amount.toFixed(2)}</strong></p>
      <p style="color:#555;">We'll get your merch packed and shipped soon!</p>
    </div>
  `;

  if (!SMTP_CONFIGURED) {
    console.log(`[DEV MODE] Order confirmation for ${toEmail}, order ${order.id}`);
    return { devMode: true };
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: toEmail,
    subject: `Order Confirmed - ${order.id}`,
    html,
  });
  return { devMode: false };
}

module.exports = { sendOtpEmail, sendOrderConfirmationEmail, SMTP_CONFIGURED };
