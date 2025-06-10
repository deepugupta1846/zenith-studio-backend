import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import archiver from "archiver";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    console.log(req.body)
    const folderName = `order-${req.body.orderNo}`;

    const relativePath = file.originalname.includes("/")
      ? path.dirname(file.originalname)
      : "";

    const uploadPath = path.join(__dirname, "uploads", folderName, relativePath);

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




export const downloadOrderFiles = (req, res) => {
  const { orderNo } = req.params;
  const folderPath = path.join(__dirname, "uploads", `order-${orderNo}`);

  if (!fs.existsSync(folderPath)) {
    return res.status(404).json({ message: "Order files not found" });
  }

  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename=order-${orderNo}.zip`);

  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.pipe(res);
  archive.directory(folderPath, false);
  archive.finalize();
};