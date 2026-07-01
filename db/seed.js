const db = require("./database");

const products = [
  {
    id: "p1",
    sku: "MLC-001",
    name: "Neural Net Tee",
    description:
      "Heavyweight 220gsm cotton crewneck with a minimalist neural-network circuit print across the chest. Unisex fit, available in Charcoal.",
    price: 499,
    image: "/img/tee.svg",
    stock: 120,
  },
  {
    id: "p2",
    sku: "MLC-002",
    name: "Gradient Descent Hoodie",
    description:
      "Heavyweight fleece hoodie with a contour-map print of a loss landscape across the back. Kangaroo pocket, ribbed cuffs.",
    price: 1299,
    image: "/img/hoodie.svg",
    stock: 60,
  },
  {
    id: "p3",
    sku: "MLC-003",
    name: "Perceptron Cap",
    description:
      "Structured six-panel cap with an embroidered ML Club perceptron logo on the front and an adjustable strap at the back.",
    price: 399,
    image: "/img/cap.svg",
    stock: 80,
  },
  {
    id: "p4",
    sku: "MLC-004",
    name: "Backprop Mug",
    description:
      "11oz ceramic mug printed with a backpropagation diagram and the line \"It's not overfitting, it's dedication.\"",
    price: 299,
    image: "/img/mug.svg",
    stock: 150,
  },
  {
    id: "p5",
    sku: "MLC-005",
    name: "Circuit Sticker Pack",
    description:
      "Set of 6 die-cut vinyl stickers featuring club iconography, weatherproof and laptop-safe.",
    price: 149,
    image: "/img/stickers.svg",
    stock: 300,
  },
  {
    id: "p6",
    sku: "MLC-006",
    name: "Tensor Tote Bag",
    description:
      "Heavy canvas tote with a hand-drawn tensor diagram print. Reinforced stitched handles, fits a 15-inch laptop.",
    price: 349,
    image: "/img/tote.svg",
    stock: 100,
  },
];

const insert = db.prepare(`
  INSERT OR REPLACE INTO products (id, sku, name, description, price, image, stock)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

for (const p of products) {
  insert.run(p.id, p.sku, p.name, p.description, p.price, p.image, p.stock);
}

console.log(`Seeded ${products.length} products.`);
