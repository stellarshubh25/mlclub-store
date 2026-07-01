const express = require("express");
const db = require("../db/database");

const router = express.Router();

// GET /api/products - list all products
router.get("/", (req, res) => {
  const products = db.prepare("SELECT * FROM products ORDER BY rowid ASC").all();
  res.json({ products });
});

// GET /api/products/:id - single product
router.get("/:id", (req, res) => {
  const product = db
    .prepare("SELECT * FROM products WHERE id = ?")
    .get(req.params.id);
  if (!product) return res.status(404).json({ error: "Product not found" });
  res.json({ product });
});

module.exports = router;
