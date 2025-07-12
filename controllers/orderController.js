import Order from "../models/Order.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import archiver from "archiver";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create new order
export const createOrder = async (req, res) => {
  try {
    const {
      albumName,
      paperType,
      albumSize,
      designPrint,
      bagType,
      deliveryOption,
      orderDate,
      deliveryDate,
      orderNo,
      paymentMethod,
      advancePercent,
      notes,
      email,
      mobileNumber,
      pricingDetails, // This is not used in the current logic
    } = req.body;
    console.log("Request body:", req.body);
    // Basic validation
    if (!albumName || !paperType || !albumSize || !orderDate || !orderNo) {
      return res.status(400).json({ message: "Please fill in all required fields" });
    }

    // Collect file paths
    const uploadedFiles = req.files?.map((file) =>
      `/uploads/${path.relative(path.join(__dirname, "uploads"), file.path).replace(/\\/g, "/")}`
    ) || [];

    const pricingData = JSON.parse(pricingDetails || "{}");

    // Create the order in DB
    const order = await Order.create({
      albumName,
      paperType,
      albumSize,
      designPrint,
      bagType,
      deliveryOption,
      orderDate,
      deliveryDate,
      orderNo,
      paymentMethod,
      advancePercent,
      notes,
      email,
      mobile: mobileNumber,
      uploadedFiles,
      paymentStatus: "Pending",
      paymentInfo: {},
      priceDetails: {
        quantity: pricingData?.qty || 1,
        paperRate: pricingData?.paperRate || 0,
        bindingRate: pricingData?.binding || 0,
        bagRate: pricingData?.bagRate || 0,
        subtotal: pricingData?.subtotal || 0,
        serviceTax: pricingData?.gst || 0,
        total: pricingData?.total || 0,
      },
    });

    // Prepare order details text
    const orderDetails = `
      Order No: ${order.orderNo}
      Album Name: ${order.albumName}
      Paper Type: ${order.paperType}
      Album Size: ${order.albumSize}
      Design / Print: ${order.designPrint || "-"}
      Bag Type: ${order.bagType || "-"}
      Delivery Option: ${order.deliveryOption || "-"}
      Order Date: ${order.orderDate}
      Delivery Date: ${order.deliveryDate || "-"}
      Payment Method: ${order.paymentMethod || "-"}
      Advance Percent: ${order.advancePercent || "-"}
      Notes: ${order.notes || "-"}
      Email: ${order.email || "-"}
      Mobile: ${order.mobile || "-"}
      Uploaded Files: ${uploadedFiles.length ? uploadedFiles.join(", ") : "-"}
      `.trim();

    // Create uploads/order-{orderNo} folder
    const orderFolder = path.join(process.cwd(), "uploads", `order-${order.orderNo}`);
    if (!fs.existsSync(orderFolder)) {
      fs.mkdirSync(orderFolder, { recursive: true });
    }

    // Write details.txt inside the folder
    const detailsFilePath = path.join(orderFolder, "details.txt");
    fs.writeFileSync(detailsFilePath, orderDetails, "utf-8");

    // Example dynamic amount
    const amount = 500;

    // Send response
    res.status(201).json({
      order,
      paymentRedirect: "/api/payment/create-order",
      suggestedPaymentDetails: {
        amount,
        currency: "INR",
        receipt: `receipt_order_${order.orderNo}`,
        notes: {
          albumName: order.albumName,
          orderNo: order.orderNo,
        },
      },
    });
  } catch (err) {
    console.error("Order creation failed:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all orders
export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get order by ID
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    res.status(200).json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get order by ID
export const getOrderByUser = async (req, res) => {
  try {
    const order = await Order.find({email: req.body.email});
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    res.status(200).json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};


// Update order
export const updateOrder = async (req, res) => {
  try {
    const updatedOrder = await Order.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!updatedOrder) return res.status(404).json({ success: false, message: "Order not found" });
    res.status(200).json({ success: true, order: updatedOrder });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// Delete order
// export const deleteOrder = async (req, res) => {
//   try {
//     const deletedOrder = await Order.findByIdAndDelete(req.params.id);
//     if (!deletedOrder) return res.status(404).json({ success: false, message: "Order not found" });
//     res.status(200).json({ success: true, message: "Order deleted" });
//   } catch (err) {
//     res.status(500).json({ success: false, error: err.message });
//   }
// };


// Delete order (and all its uploaded files)
export const deleteOrder = async (req, res) => {
  try {
    // 1️⃣ Fetch the order so we know the folder / files to clean up
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    /* ------------------------------------------------------------------
       2️⃣  FILE‑SYSTEM CLEANUP
       ------------------------------------------------------------------
       Recommended folder layout when you store the files (diskStorage):
         uploads/
           └── <orderNo>/
               ├── img‑1.jpg
               ├── img‑2.jpg
               └── …
       That way we can kill the whole folder in one call.
    ------------------------------------------------------------------ */

    const orderDir = path.join("", "uploads", String(order.orderNo));

    try {
      if (fs.existsSync(orderDir)) {
        // Node 14+ : fs.rmSync supports recursive deletion
        fs.rmSync(orderDir, { recursive: true, force: true });
        console.log(`🗑️  Removed folder ${orderDir}`);
      } else {
        // Fallback – delete files one‑by‑one using the stored URLs
        order.uploadedFiles.forEach((rel) => {
          // rel looks like "/uploads/12345/img‑1.jpg" → make absolute
          const absPath = path.join(__dirname, rel.replace(/^\/+/, ""));
          if (fs.existsSync(absPath)) {
            fs.unlinkSync(absPath);
            console.log(`🗑️  Removed file ${absPath}`);
          }
        });
      }
    } catch (fsErr) {
      // Log but don’t block the HTTP response
      console.error("File‑cleanup error:", fsErr);
    }

    /* ------------------------------------------------------------------
       3️⃣  Delete the document itself
    ------------------------------------------------------------------ */
    await order.deleteOne();

    res
      .status(200)
      .json({ success: true, message: "Order and its files deleted" });
  } catch (err) {
    console.error("Delete order failed:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};
