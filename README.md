# ML Club Store

A small e-commerce site for selling ML Club merchandise: browse products, check out,
verify your email with an OTP, "pay" (simulated), and look up order history.

## Stack

- **Backend:** Node.js + Express
- **Database:** SQLite, via Node's built-in `node:sqlite` module (no native build step, no external DB to install)
- **Frontend:** Plain HTML/CSS/JS, no build tooling — open it, edit it, deploy it anywhere
- **Email:** Nodemailer. Falls back to a "dev mode" that logs the OTP to the console when no SMTP is configured, so you can run and test the whole flow immediately.
- **Payment:** Simulated — see "Swapping in a real payment gateway" below.

Requires **Node.js 22.5+** (for `node:sqlite`). Check with `node -v`.

## Getting started

```bash
npm install
npm run seed     # populates the product catalogue
npm start        # http://localhost:3000
```

Then open `http://localhost:3000` in a browser.

### Testing the OTP flow without email setup

By default there's no `.env`, so SMTP isn't configured. When you check out, the app:
1. Logs the OTP code to the terminal running `npm start`, and
2. Also returns it in the API response, which the verify page shows on-screen labeled "Dev mode".

This lets you test end-to-end immediately. To send real emails, copy `.env.example` to `.env` and fill in SMTP credentials (see below).

### Sending real OTP emails

```bash
cp .env.example .env
```

Fill in `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` (for Gmail, use an **App Password**, not your normal password — enable 2-Step Verification first, then generate one under Google Account → Security → App Passwords). Restart the server.

## Project structure

```
server.js              Express app entry point
db/
  database.js           SQLite schema (products, customers, orders, otp_verifications)
  seed.js                Seeds the product catalogue
routes/
  products.js            GET product list / single product
  otp.js                 POST send OTP, POST verify OTP (creates customer + order on success)
  orders.js               POST mock payment, GET order, GET order history by email
services/
  mailer.js               Nodemailer wrapper + dev-mode console fallback
public/
  index.html               Product catalogue
  cart.html                 Cart review (localStorage-backed)
  checkout.html              Delivery details form
  verify.html                  6-digit OTP entry
  payment.html                  Simulated payment
  confirmation.html              Order confirmation
  orders.html                     Order history lookup
  css/style.css, js/cart.js, img/*.svg
```

## How an order flows through the system

1. **Browse & add to cart** (`index.html`) — cart lives in the browser's `localStorage`, no login needed.
2. **Checkout** (`checkout.html`) — collects name, email, contact number, delivery address. Submits to `POST /api/otp/send`.
3. **Server validates the cart** against real product prices/stock (never trusts client-side totals), generates a 6-digit OTP, stores it in `otp_verifications` with a 10-minute expiry, and emails it.
4. **Verify** (`verify.html`) — user enters the code, `POST /api/otp/verify` checks it against the DB (max 5 attempts, must be unexpired). On success, the server creates the `customers` row and an `orders` row (`verification_status = 'verified'`, `payment_status = 'pending'`).
5. **Payment** (`payment.html`) — currently simulated: `POST /api/orders/:id/pay` marks the order paid, generates a mock payment reference, and emails an order confirmation.
6. **Confirmation** (`confirmation.html`) — shows the final order summary.
7. **Order history** (`orders.html`) — `GET /api/orders/history/:email` looks up all past orders for an email address.

## Database schema

- `products` — id, sku, name, description, price, image, stock
- `customers` — id, name, email, contact_number, delivery_address, created_at
- `otp_verifications` — email, otp_code, purpose, verified, attempts, expires_at, created_at
- `orders` — id, customer_id, items_json, total_amount, **verification_status**, **payment_status**, payment_ref, **created_at**

This directly covers the required "Customer Details, Order Details, Verification Status, and Timestamp of Order."

## Swapping in a real payment gateway

`routes/orders.js` has one handler, `POST /:id/pay`, that currently just marks the order paid.
To go live:

- **Razorpay:** create an Order via the Razorpay Orders API when the user reaches the payment page, render Razorpay Checkout client-side with that order id, and verify the payment signature server-side in the `/pay` route before marking `payment_status = 'paid'`.
- **Stripe:** create a Checkout Session server-side, redirect the browser to it, and mark the order paid from a webhook (`checkout.session.completed`) rather than trusting the browser redirect alone.

Either way, the rest of the app — DB writes, confirmation email, confirmation page — doesn't need to change.

## Notes & limitations (things to harden before a real launch)

- Pending checkout drafts (name/address/cart, before OTP verification) are held in an **in-memory Map**, keyed by email. This is fine for a single server process; if you deploy multiple instances behind a load balancer, move this to Redis or the database.
- There's no authentication — order history is looked up by email alone. Fine for a small club store; add magic-link login if you want to prevent anyone from viewing an order history just by knowing an email address.
- SQLite is file-based (`data/store.db`), which is great for a low-traffic club store. If you outgrow it, the queries are simple enough to port to Postgres/MySQL with minimal changes.
- `node:sqlite` is still flagged "experimental" by Node — stable in practice for this use case, but keep an eye on Node release notes.
