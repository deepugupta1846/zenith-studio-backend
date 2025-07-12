// models/Order.js

import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    albumName: { type: String, required: true },
    paperType: { type: String, required: true },
    albumSize: { type: String, required: true },
    designPrint: { type: String },
    bagType: { type: String },
    deliveryOption: { type: String },
    orderDate: { type: Date, required: true },
    deliveryDate: { type: Date },
    orderNo: { type: String, required: true, unique: true },
    paymentMethod: { type: String },
    advancePercent: { type: Number },
    notes: { type: String },
    email: { type: String },
    mobile: {type: String},
    uploadedFiles: [{ type: String }], // Store file URLs or names
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Paid', 'Failed'],
      default: 'Pending'
    },
    paymentInfo: {
      razorpay_order_id: String,
      razorpay_payment_id: String,
      razorpay_signature: String,
      paymentDate: Date
    },
    priceDetails:{
      quantity: { type: Number, required: true },
      paperRate: { type: Number, required: true },
      bindingRate: { type: Number, default: 0 },
      bagRate: { type: Number, required: true },
      subtotal: { type: Number, required: true },
      serviceTax: { type: Number, required: true },
      total: { type: Number, required: true },
    },
    downloadFile: { type: Boolean, default: false }, // Flag to indicate if the order file is ready for download
    orderStatus: {
      type: String,
      enum: ['Pending', 'In Progress', 'Completed', 'Delivered', 'Cancelled'],
      default: 'Pending'
    }
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", orderSchema);

export default Order;
