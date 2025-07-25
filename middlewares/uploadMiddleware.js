import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import archiver from "archiver";
import Order from "../models/Order.js";
import axios from "axios";
import { v2 as cloudinary } from "cloudinary";
const storage = multer.memoryStorage(); // No file system


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the multer storage
// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     const folderName = `order-${req.body.orderNo}`;

//     const relativePath = file.originalname.includes("/")
//       ? path.dirname(file.originalname)
//       : "";

//     const uploadPath = path.join(process.cwd(), "uploads", folderName, relativePath);

//     fs.mkdirSync(uploadPath, { recursive: true });

//     cb(null, uploadPath);
//   },
//   filename: function (req, file, cb) {
//     const safeName = file.originalname.replace(/\s+/g, "_");
//     cb(null, `${Date.now()}-${path.basename(safeName)}`);
//   },
// });


export const upload = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024 * 1024, // 2GB max
  },
});




export const downloadOrderFiles = async (req, res) => {
  const { orderNo } = req.params;
  console.log("Order No:", orderNo);

  try {
    // 1. Get the order and files
    const order = await Order.findOne({ orderNo });
    if (!order || !order.uploadedFiles || order.uploadedFiles.length === 0) {
      return res.status(404).json({ message: "No files found for this order." });
    }

    // 2. Set headers for ZIP download
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename=order-${orderNo}.zip`);

    // 3. Create zip archive and stream to response
    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.pipe(res);

    // 4. Add each Cloudinary file to the zip
    for (const fileUrl of order.uploadedFiles) {
      const response = await axios.get(fileUrl, { responseType: "stream" });
      const filename = decodeURIComponent(fileUrl.split("/").pop().split("?")[0]);
      archive.append(response.data, { name: filename });
    }

    // 5. Finalize the zip
    archive.finalize();

    // 6. After zipping is done, update order + delete Cloudinary folder
    archive.on("end", async () => {
      try {
        // Update DB
        await Order.findOneAndUpdate({ orderNo }, { $set: { downloadFile: true } });

        // Delete Cloudinary files under the order folder
        const folderPath = `orders/order-${orderNo}`;
        const { resources } = await cloudinary.api.resources({
          type: "upload",
          prefix: folderPath,
          max_results: 100,
        });

        const publicIds = resources.map((file) => file.public_id);

        if (publicIds.length > 0) {
          await cloudinary.api.delete_resources(publicIds);
          console.log(`Deleted Cloudinary files for ${folderPath}`);
        } else {
          console.log(`No files found in ${folderPath}`);
        }
      } catch (err) {
        console.error("Post-download cleanup error:", err);
      }
    });

    archive.on("error", (err) => {
      console.error("Archiving error:", err);
      res.status(500).json({ message: "Error generating zip." });
    });

  } catch (err) {
    console.error("Download error:", err);
    res.status(500).json({ message: "Internal server error." });
  }
};