# ML Club Store

A small e-commerce site for selling ML Club merchandise: browse products, check out,
verify your email with an OTP, "pay" (simulated), and look up order history.

## Stack

- **Backend:** Node.js + Express
- **Database:** SQLite, via Node's built-in `node:sqlite` module (no native build step, no external DB to install)
- **Frontend:** Plain HTML/CSS/JS, no build tooling — open it, edit it, deploy it anywhere
- **Email:** Nodemailer. Falls back to a "dev mode" that logs the OTP to the console when no SMTP is configured, so you can run and test the whole flow immediately.
- **Payment:** Simulated — see "Swapping in a real payment gateway" below.





```bash
npm install
npm run seed     # populates the product catalogue
npm start        # http://localhost:3000
```

Then open `http://localhost:3000` in a browser.


```bash
cp .env.example .env
```



- SQLite is file-based (`data/store.db`), which is great for a low-traffic club store. If you outgrow it, the queries are simple enough to port to Postgres/MySQL with minimal changes.
- `node:sqlite` is still flagged "experimental" by Node — stable in practice for this use case, but keep an eye on Node release notes.
