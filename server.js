require("dotenv").config({ quiet: true });
const express = require("express");
const cors = require("cors");
const path = require("path");

require("./db/database"); // ensures schema exists on boot

const productsRouter = require("./routes/products");
const otpRouter = require("./routes/otp");
const ordersRouter = require("./routes/orders");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use("/api/products", productsRouter);
app.use("/api/otp", otpRouter);
app.use("/api/orders", ordersRouter);

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use(express.static(path.join(__dirname, "public")));

app.listen(PORT, () => {
  console.log(`ML Club Store running at http://localhost:${PORT}`);
});
