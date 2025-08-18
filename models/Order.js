// models/Order.js

import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
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
    mobile: { type: String },
    userType: { type: String, enum: ['user', 'retailer', 'professional', 'Professional'], default: 'user' },
    shopName: { type: String, default: "" },
    deliveryAddress: {
      street: { type: String, },
      landmark: { type: String, },
      city: { type: String, },
      state: { type: String, },
      zipCode: { type: String, },
      country: { type: String, default: "India"}
    },
    uploadedFiles: [{ type: String }],
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
      paymentDate: Date,
      utr_number: String,
    },
    priceDetails:{
      quantity: { type: Number, required: true, },
      paperRate: { type: Number, required: true },
      bindingRate: { type: Number, default: 0 },
      bagRate: { type: Number, required: true },
      subtotal: { type: Number, required: true },
      serviceTax: { type: Number, required: true },
      advanceAmount: { type: Number, default: 0 },
      cashPayment:{ type: Number, default: 0},
      total: { type: Number, required: true },
    },
    downloadFile: { type: Boolean, default: false },
    orderStatus: {
      type: String,
      enum: ['Pending', 'In Progress', 'Completed', 'Delivered', 'Cancelled'],
      default: 'Pending'
    },
    sheets: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    serialNo: { type: String, default:"ZN-2025-0000"},
  },
  { timestamps: true }
);

orderSchema.pre('validate', function (next) {
  if (this.deliveryOption === 'courier') {
    const address = this.deliveryAddress || {};
    const requiredFields = ['street', 'landmark', 'city', 'state', 'zipCode', 'country'];

    const missingFields = requiredFields.filter(
      (field) => !address[field] || address[field].trim() === ''
    );

    if (missingFields.length > 0) {
      return next(
        new mongoose.Error.ValidationError(
          new Error(`Delivery address is required for courier: Missing ${missingFields.join(', ')}`)
        )
      );
    }
  }
  next();
});

const Order = mongoose.model("Order", orderSchema);

export default Order;
