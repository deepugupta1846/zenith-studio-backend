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
      designPoint,
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
    } = req.body;

    // Basic validation
    if (!albumName || !paperType || !albumSize || !orderDate || !orderNo) {
      return res.status(400).json({ message: "Please fill in all required fields" });
    }

    // Collect file paths with full folder name

      const uploadedFiles = req.files?.map((file) =>
  `/uploads/${path.relative(path.join(__dirname, "uploads"), file.path).replace(/\\/g, "/")}`
) || [];

    const order = await Order.create({
      albumName,
      paperType,
      albumSize,
      designPoint,
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
      uploadedFiles,
    });

     // Calculate payment amount dynamically if needed
    const amount = 500; // Example: ₹500 → calculate dynamically

    res.status(201).json({
      order,
      paymentRedirect: "/api/payment/create-order", // Where to POST payment details from frontend
      suggestedPaymentDetails: {
        amount,
        currency: "INR",
        receipt: `receipt_order_${order.orderNo}`,
        notes: { albumName: order.albumName, orderNo: order.orderNo },
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
export const deleteOrder = async (req, res) => {
  try {
    const deletedOrder = await Order.findByIdAndDelete(req.params.id);
    if (!deletedOrder) return res.status(404).json({ success: false, message: "Order not found" });
    res.status(200).json({ success: true, message: "Order deleted" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};


