require("dotenv").config(); // load variables from .env before anything else

const express = require("express");
const connectDB = require("./config/db");
const productRoutes = require("./routes/productRoutes");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const app = express();

// Parse JSON request bodies
app.use(express.json());

// Health check / welcome route
app.get("/", (req, res) => {
  res.json({ message: "Inventory and Data Management System API is running" });
});

// API routes
app.use("/api/products", productRoutes);

// 404 handler and central error handler (must come last)
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Connect to the database first, then start listening
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
