// Optional: fills the database with 12 sample products so you can test
// filtering, pagination (12 items = 2 pages of 10), low-stock and summary right away.
// Run with:  npm run seed
require("dotenv").config();

const mongoose = require("mongoose");
const Product = require("./models/Product");

const products = [
  { name: "Study Table", sku: "FURN-TB-812", category: "Furniture", price: 3999, quantity: 2, reorderLevel: 4, supplier: "IKEA India" },
  { name: "Office Chair", sku: "FURN-CH-204", category: "Furniture", price: 5499, quantity: 15, reorderLevel: 5, supplier: "Godrej Interio" },
  { name: "Laptop 15 inch", sku: "ELEC-LP-101", category: "Electronics", price: 55000, quantity: 5, reorderLevel: 3, supplier: "Dell India" },
  { name: "Wireless Mouse", sku: "ELEC-MS-102", category: "Electronics", price: 799, quantity: 40, reorderLevel: 10, supplier: "Logitech" },
  { name: "Bluetooth Speaker", sku: "ELEC-SP-103", category: "Electronics", price: 2499, quantity: 8, reorderLevel: 10, supplier: "boAt" },
  { name: "USB-C Cable", sku: "ELEC-CB-104", category: "Electronics", price: 349, quantity: 43, reorderLevel: 20, supplier: "Anker" },
  { name: "Cotton T-Shirt", sku: "APRL-TS-301", category: "Apparel", price: 599, quantity: 60, reorderLevel: 20, supplier: "Levi's" },
  { name: "Denim Jeans", sku: "APRL-JN-302", category: "Apparel", price: 2199, quantity: 18, reorderLevel: 15, supplier: "Levi's" },
  { name: "Notebook A4", sku: "STNY-NB-701", category: "Stationery", price: 60, quantity: 200, reorderLevel: 50, supplier: "Classmate" },
  { name: "Stapler", sku: "STNY-ST-702", category: "Stationery", price: 150, quantity: 3, reorderLevel: 10, supplier: "Kangaro" },
  { name: "Basmati Rice 5kg", sku: "GROC-RC-501", category: "Grocery", price: 650, quantity: 30, reorderLevel: 10, supplier: "India Gate" },
  { name: "Olive Oil 1L", sku: "GROC-OL-502", category: "Grocery", price: 799, quantity: 6, reorderLevel: 8, supplier: "Figaro" },
];

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    await Product.deleteMany({});
    await Product.insertMany(products);
    console.log(`Seeded ${products.length} products into ${mongoose.connection.name}`);
  } catch (error) {
    console.error("Seeding failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

seed();
