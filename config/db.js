const mongoose = require("mongoose");

// Connects to MongoDB using the connection string stored in the .env file
const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.error("MONGO_URI is missing. Add it to your .env file.");
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(uri);
    console.log(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
