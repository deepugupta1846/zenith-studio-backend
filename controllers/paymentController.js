import Razorpay from "razorpay";
import nodemailer from "nodemailer";
import path from "path";
import fs from "fs";
import PDFDocument from "pdfkit";
import crypto from "crypto";
import dotenv from "dotenv";
import Order from "../models/Order.js";
dotenv.config();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});


// Create Razorpay Order
export const createRazorpayOrder = async (req, res) => {
  try {
    const { amount, currency = "INR", receipt, notes } = req.body;

    console.log("body data", {
      amount: amount * 100, // Rs → paise
      currency,
      receipt,
      notes,
    });

    if (!amount || !receipt) {
      return res.status(400).json({ message: "Amount and Receipt are required" });
    }

    const razorpayOrder = await razorpay.orders.create({
      amount: amount * 100, // Rs → paise
      currency,
      receipt,
      notes,
    });

    res.status(201).json({
      success: true,
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error("Failed to create Razorpay order:", err);
    res.status(500).json({ message: "Payment initiation failed" });
  }
};

export const verifyPayment = async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    orderDetails, // sent from frontend
  } = req.body;

  const generatedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(razorpay_order_id + "|" + razorpay_payment_id)
    .digest("hex");

  if (generatedSignature !== razorpay_signature) {
    return res.status(400).json({ success: false, message: "Invalid signature" });
  }
  await Order.findOneAndUpdate(
    { orderNo: orderDetails.orderNo },
    {
      $set: {
        paymentStatus: "Paid",
        paymentInfo: {
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature,
          paymentDate: new Date()
        }
      }
    }
  );

  try {
    // 1. Generate Receipt PDF
    const pdfPath = generateReceiptPDF(
      { payment_id: razorpay_payment_id, order_id: razorpay_order_id },
      orderDetails
    );

    // 2. Send Email with PDF
    await sendMail({
      to: orderDetails.email,
      subject: "Your Album Order Receipt",
      html: `
        <h2>Thank you for your payment!</h2>
        <p>Your receipt for the album order is attached.</p>
        <p><strong>Order No:</strong> ${orderDetails.orderNo}</p>
        <p>We'll contact you once the album is ready for delivery.</p>
        <p>~ Album Studio</p>
      `,
      attachments: [
        {
          filename: "receipt.pdf",
          path: pdfPath,
        },
      ],
    });

    return res.json({ success: true, message: "Payment verified & email sent" });
  } catch (err) {
    console.error("Error during email receipt:", err);
    return res.status(500).json({ success: false, message: "PDF or email failed" });
  }
};


export const sendMail = async ({ to, subject, html, attachments = [] }) => {
  const transporter = nodemailer.createTransport({
    service: "gmail", // Or use SMTP settings
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"Album Studio" <${process.env.MAIL_USER}>`,
    to,
    subject,
    html,
    attachments,
  });
};

export const generateReceiptPDF = (paymentDetails, orderDetails) => {
  const filePath = path.join("receipts", `${paymentDetails.payment_id}.pdf`);
  const doc = new PDFDocument({ margin: 40 });

  if (!fs.existsSync("receipts")) {
    fs.mkdirSync("receipts");
  }

  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  // Add logo
  const logoPath = path.join("public", "logo.png"); // change if needed
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, 40, 40, { width: 100 });
  }

  // Header
  doc
    .fontSize(20)
    .text("Zenith Studio", 0, 50, { align: "right" })
    .fontSize(10)
    .text("123 Main Road, Gaya, Bihar", { align: "right" })
    .text("Phone: +91-9876543210", { align: "right" })
    .text("Email: zenithstudio@example.com", { align: "right" });

  doc.moveDown(2);
  doc.fontSize(16).text("Invoice", { align: "center", underline: true });
  doc.moveDown(1);

  // Payment & Customer Info
  doc.fontSize(12);
  doc.text(`Invoice Date: ${new Date().toLocaleDateString()}`);
  doc.text(`Payment ID: ${paymentDetails.payment_id}`);
  doc.text(`Order ID: ${paymentDetails.order_id}`);
  doc.moveDown(1);
  doc.text(`Customer Email: ${orderDetails.email}`);
  doc.text(`Customer Mobile: ${orderDetails.mobile}`);
  doc.text(`Delivery Address: ${orderDetails.address || "N/A"}`);
  doc.moveDown(1);

  // Order Info Table
  doc
    .fontSize(14)
    .text("Order Details", { underline: true })
    .moveDown(0.5)
    .fontSize(12);

  const orderDetailsTable = [
    ["Album Name", orderDetails.albumName],
    ["Paper Type", orderDetails.paperType],
    ["Album Size", orderDetails.albumSize],
    ["Design/Print", orderDetails.designPrint],
    ["Bag Type", orderDetails.bagType],
    ["Delivery Option", orderDetails.deliveryOption],
    ["Order No", orderDetails.orderNo],
  ];

  orderDetailsTable.forEach(([label, value]) => {
    doc
      .font("Helvetica-Bold")
      .text(`${label}:`, { continued: true })
      .font("Helvetica")
      .text(` ${value}`);
  });

  doc.moveDown(1);

  // Pricing Table
  doc.fontSize(14).text("Payment Summary", { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(12);

  const pricingData = [
    ["Description", "Amount (₹)"],
    [`Quantity (${orderDetails.quantity} photos)`, `${orderDetails.baseRate * orderDetails.quantity}`],
    ["Fixed Charges", `${orderDetails.fixedCost}`],
    ["Subtotal", `${orderDetails.subtotal}`],
    ["GST (18%)", `${orderDetails.gst}`],
    ["Total Paid", `${orderDetails.total}`],
  ];

  const tableTop = doc.y + 5;
  const startX = 50;
  const col1Width = 300;
  const col2Width = 150;

  pricingData.forEach((row, idx) => {
    const y = tableTop + idx * 20;
    doc
      .font(idx === 0 ? "Helvetica-Bold" : "Helvetica")
      .text(row[0], startX, y)
      .text(row[1], startX + col1Width, y, { width: col2Width, align: "right" });
  });

  doc.moveDown(3);

  // Signature
  doc
    .font("Helvetica-Oblique")
    .text("Authorized Signature", { align: "right" })
    .moveDown(0.5)
    .image(path.join("public", "signature.png"), doc.page.width - 120, doc.y, {
      width: 100,
      fit: [100, 50],
    }); // optional

  doc.end();
  return filePath;
};


