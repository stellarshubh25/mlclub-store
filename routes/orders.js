const express = require("express");
const crypto = require("crypto");
const db = require("../db/database");
const { sendOrderConfirmationEmail } = require("../services/mailer");

const router = express.Router();

function hydrateOrder(row) {
  return {
    id: row.id,
    customer_id: row.customer_id,
    items: JSON.parse(row.items_json),
    total_amount: row.total_amount,
    verification_status: row.verification_status,
    payment_status: row.payment_status,
    payment_ref: row.payment_ref,
    created_at: row.created_at,
  };
}

// POST /api/orders/:id/pay
// Mock payment gateway: always "succeeds" after a short simulated delay.
// Swap the body of this handler for a real gateway (Razorpay/Stripe) later —
// the rest of the app (DB writes, confirmation email, confirmation page)
// doesn't need to change.
router.post("/:id/pay", async (req, res) => {
  try {
    const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found." });
    if (order.verification_status !== "verified") {
      return res.status(400).json({ error: "Order email has not been verified yet." });
    }
    if (order.payment_status === "paid") {
      return res.json({ message: "Order already paid.", order: hydrateOrder(order) });
    }

    const paymentRef = "PAY-" + crypto.randomUUID().slice(0, 10).toUpperCase();
    db.prepare(
      `UPDATE orders SET payment_status = 'paid', payment_ref = ? WHERE id = ?`
    ).run(paymentRef, order.id);

    const updated = db.prepare("SELECT * FROM orders WHERE id = ?").get(order.id);
    const customer = db.prepare("SELECT * FROM customers WHERE id = ?").get(order.customer_id);
    const hydrated = hydrateOrder(updated);

    sendOrderConfirmationEmail(customer.email, hydrated).catch((e) =>
      console.error("Failed to send confirmation email:", e.message)
    );

    res.json({ message: "Payment successful.", order: hydrated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Payment could not be processed." });
  }
});

// GET /api/orders/:id
router.get("/:id", (req, res) => {
  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found." });
  const customer = db.prepare("SELECT * FROM customers WHERE id = ?").get(order.customer_id);
  res.json({ order: hydrateOrder(order), customer });
});

// GET /api/orders/history/:email
router.get("/history/:email", (req, res) => {
  const rows = db
    .prepare(
      `SELECT o.* FROM orders o
       JOIN customers c ON c.id = o.customer_id
       WHERE c.email = ?
       ORDER BY o.created_at DESC`
    )
    .all(req.params.email);
  res.json({ orders: rows.map(hydrateOrder) });
});

module.exports = router;
