import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import archiver from "archiver";
import Order from "../models/Order.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const folderName = `order-${req.body.orderNo}`;

    const relativePath = file.originalname.includes("/")
      ? path.dirname(file.originalname)
      : "";

    const uploadPath = path.join(process.cwd(), "uploads", folderName, relativePath);

    fs.mkdirSync(uploadPath, { recursive: true });

    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const safeName = file.originalname.replace(/\s+/g, "_");
    cb(null, `${Date.now()}-${path.basename(safeName)}`);
  },
});


// File upload middleware
export const upload = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024 * 1024, // 2GB max
  },
});




export const downloadOrderFiles = async (req, res) => {
  const { orderNo } = req.params;
  const folderPath = path.join(process.cwd(), "uploads", `order-${orderNo}`);

  if (!fs.existsSync(folderPath)) {
    return res.status(404).json({ message: "Order files not found" });
  }

  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename=order-${orderNo}.zip`);

  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.pipe(res);

  // Add folder to archive
  archive.directory(folderPath, false);

  // Finalize and handle post-download
  archive.finalize();

  // When the download finishes
  archive.on("end", async () => {
    try {
      // Delete the folder after zip is streamed
      fs.rmSync(folderPath, { recursive: true, force: true });

      // Update the order in DB
      await Order.findOneAndUpdate(
        { orderNo },
        { $set: { downloadFile: true } }
      );
    } catch (err) {
      console.error("Post-download cleanup failed:", err);
    }
  });

  // Handle archiver error
  archive.on("error", (err) => {
    console.error("Archive error:", err);
    res.status(500).json({ message: "Failed to generate zip." });
  });
};