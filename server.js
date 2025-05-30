// server.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import mongoose from "mongoose";
import { fileURLToPath } from "url";

import connectDB from "./config/db.js";
import orderRoutes from "./routes/orderRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import upload from "./middlewares/uploadMiddleware.js";

// Config
dotenv.config();
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// File path setup for static files
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Static uploads folder
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// File upload route (supports multiple files from folder input)
app.post("/api/upload", upload.array("albumFiles", 100), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: "No files uploaded" });
  }

  const filePaths = req.files.map((file) => `/uploads/${file.filename}`);
  res.status(200).json({ files: filePaths });
});

// Routes
app.use("/api/orders", orderRoutes);
app.use("/api/auth", authRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
