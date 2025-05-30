// models/Order.js

import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    albumName: { type: String, required: true },
    paperType: { type: String, required: true },
    albumSize: { type: String, required: true },
    designPoint: { type: String },
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
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", orderSchema);

export default Order;
