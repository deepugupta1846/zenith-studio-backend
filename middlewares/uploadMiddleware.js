import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    console.log(req.body)
    const folderName = `order-${11}`;

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
const upload = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024 * 1024, // 2GB max
  },
});

export default upload;
