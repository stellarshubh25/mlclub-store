const express = require("express");
const crypto = require("crypto");
const db = require("../db/database");
const { sendOtpEmail } = require("../services/mailer");

const router = express.Router();

// In-memory holding area for checkout drafts awaiting OTP verification.
// Keyed by email. Fine for a single-instance app; swap for Redis/DB-backed
// sessions if you deploy multiple server instances.
const pendingCheckouts = new Map();

const OTP_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 30 * 1000;

function generateOtp() {
  return crypto.randomInt(100000, 999999).toString();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// POST /api/otp/send
// body: { name, email, contact_number, delivery_address, items: [{id, name, price, quantity}] }
router.post("/send", async (req, res) => {
  try {
    const { name, email, contact_number, delivery_address, items } = req.body;

    if (!name || !email || !contact_number || !delivery_address) {
      return res.status(400).json({ error: "Name, email, contact number, and delivery address are all required." });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: "Please enter a valid email address." });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Your cart is empty." });
    }

    // Cooldown check to avoid spamming sends
    const existing = pendingCheckouts.get(email);
    if (existing && Date.now() - existing.lastSentAt < RESEND_COOLDOWN_MS) {
      const waitSec = Math.ceil((RESEND_COOLDOWN_MS - (Date.now() - existing.lastSentAt)) / 1000);
      return res.status(429).json({ error: `Please wait ${waitSec}s before requesting another code.` });
    }

    // Validate items against real product data + compute authoritative total
    const productStmt = db.prepare("SELECT * FROM products WHERE id = ?");
    let total = 0;
    const verifiedItems = [];
    for (const item of items) {
      const product = productStmt.get(item.id);
      if (!product) return res.status(400).json({ error: `Unknown product in cart: ${item.id}` });
      const quantity = Math.max(1, Math.min(10, Number(item.quantity) || 1));
      total += product.price * quantity;
      verifiedItems.push({ id: product.id, name: product.name, price: product.price, quantity });
    }

    const otpCode = generateOtp();
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000).toISOString();

    db.prepare(
      `INSERT INTO otp_verifications (email, otp_code, purpose, verified, attempts, expires_at)
       VALUES (?, ?, 'order', 0, 0, ?)`
    ).run(email, otpCode, expiresAt);

    pendingCheckouts.set(email, {
      name,
      email,
      contact_number,
      delivery_address,
      items: verifiedItems,
      total,
      lastSentAt: Date.now(),
    });

    const result = await sendOtpEmail(email, otpCode);

    res.json({
      message: "Verification code sent to your email.",
      expiresInMinutes: OTP_TTL_MINUTES,
      // Only surface the code in the response when running without real SMTP,
      // so local testing/demoing doesn't require a mail account.
      devOtp: result.devMode ? otpCode : undefined,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong sending the verification code." });
  }
});

// POST /api/otp/verify
// body: { email, otp }
router.post("/verify", (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: "Email and code are required." });

    const record = db
      .prepare(
        `SELECT * FROM otp_verifications WHERE email = ? AND verified = 0
         ORDER BY id DESC LIMIT 1`
      )
      .get(email);

    if (!record) return res.status(400).json({ error: "No pending verification for this email. Please request a new code." });

    if (record.attempts >= MAX_ATTEMPTS) {
      return res.status(429).json({ error: "Too many attempts. Please request a new code." });
    }

    if (new Date(record.expires_at).getTime() < Date.now()) {
      return res.status(400).json({ error: "This code has expired. Please request a new one." });
    }

    if (record.otp_code !== String(otp).trim()) {
      db.prepare("UPDATE otp_verifications SET attempts = attempts + 1 WHERE id = ?").run(record.id);
      return res.status(400).json({ error: "Incorrect code. Please try again." });
    }

    db.prepare("UPDATE otp_verifications SET verified = 1 WHERE id = ?").run(record.id);

    const draft = pendingCheckouts.get(email);
    if (!draft) {
      return res.status(400).json({ error: "Your checkout session expired. Please start again." });
    }

    // Create the customer record
    const customerId = crypto.randomUUID();
    db.prepare(
      `INSERT INTO customers (id, name, email, contact_number, delivery_address)
       VALUES (?, ?, ?, ?, ?)`
    ).run(customerId, draft.name, draft.email, draft.contact_number, draft.delivery_address);

    // Create the order, verified but not yet paid
    const orderId = "ORD-" + crypto.randomUUID().slice(0, 8).toUpperCase();
    db.prepare(
      `INSERT INTO orders (id, customer_id, items_json, total_amount, verification_status, payment_status)
       VALUES (?, ?, ?, ?, 'verified', 'pending')`
    ).run(orderId, customerId, JSON.stringify(draft.items), draft.total);

    pendingCheckouts.delete(email);

    res.json({ message: "Email verified.", orderId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong verifying the code." });
  }
});

module.exports = router;
