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
  const filePath = path.join("","uploads", `order-${orderDetails.orderNo}`, `${paymentDetails.payment_id}.pdf`);
  const doc = new PDFDocument({ size: "A4", margin: 40 });

  if (!fs.existsSync("receipts")) fs.mkdirSync("receipts");
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  const orange = "#ce181e";
  const gray = "#f5f5f5";
  const dark = "#333333";

  // ─────────── Top Header Bar ───────────
  doc.rect(0, 0, doc.page.width, 30).fill(orange);

  doc.moveDown(2);

  // ─────────── Logo & Receipt Info ───────────
  const logoPath = path.join("public", "logo.png");
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, 50, 50, { width: 60 });
  }

  doc
    .fontSize(14)
    .fillColor(dark)
    .text("RECEIPT", doc.page.width - 150, 50, { align: "right" })
    .moveDown(0.5)
    .fontSize(10)
    .text(`DATE: ${new Date().toLocaleDateString()}`, { align: "right" })
    .text(`RECEIPT NO: ${paymentDetails.payment_id}`, { align: "right" });

  doc.moveDown(2);

  // ─────────── BILL TO & SHIP TO ───────────
  const boxY = doc.y;
  const col1X = 50;
  const col2X = doc.page.width / 2 + 10;

  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .text("BILL TO", col1X, boxY)
    .font("Helvetica")
    .text(orderDetails.name, col1X, boxY + 15)
    .text(orderDetails.email, col1X)
    .text(orderDetails.mobile, col1X)
    .text(orderDetails.address || "N/A", col1X);

  doc
    .font("Helvetica-Bold")
    .text("SHIP TO", col2X, boxY)
    .font("Helvetica")
    .text(orderDetails.name, col2X, boxY + 15)
    .text(orderDetails.email, col2X)
    .text(orderDetails.mobile, col2X)
    .text(orderDetails.address || "N/A", col2X);

  doc.moveDown(5);

  // ─────────── Table Headers ───────────
  const tableTop = doc.y + 10;
  const colWidths = [200, 80, 100, 100];
  const headers = ["DESCRIPTION", "QTY", "UNIT PRICE", "TOTAL"];

  // Header row
  doc.rect(50, tableTop, 480, 20).fill(orange).fillColor("white").font("Helvetica-Bold").fontSize(10);
  headers.forEach((h, i) => {
    doc.text(h, 55 + colWidths.slice(0, i).reduce((a, b) => a + b, 0), tableTop + 5);
  });

  doc.fillColor(dark).font("Helvetica").fontSize(10);

  // ─────────── Table Rows (Simulated Items) ───────────
  const items = [
    {
      description: orderDetails.albumName,
      qty: orderDetails.quantity,
      unitPrice: orderDetails.baseRate,
      total: orderDetails.baseRate * orderDetails.quantity,
    },
  ];

  let rowY = tableTop + 20;
  items.forEach((item, idx) => {
    const isEven = idx % 2 === 0;
    doc
      .rect(50, rowY, 480, 20)
      .fill(isEven ? "#ffffff" : gray)
      .fillColor(dark);
    doc
      .text(item.description, 55, rowY + 5)
      .text(item.qty, 55 + colWidths[0], rowY + 5)
      .text(item?.unitPrice?.toFixed(2), 55 + colWidths[0] + colWidths[1], rowY + 5)
      .text(item?.total?.toFixed(2), 55 + colWidths[0] + colWidths[1] + colWidths[2], rowY + 5);
    rowY += 20;
  });

  // ─────────── Remarks ───────────
  doc.fillColor(dark).font("Helvetica-Oblique").fontSize(10).text("Remarks, notes", 55, rowY + 10);

  // ─────────── Summary Section ───────────
  const summaryY = rowY + 60;
  const rightX = 330;

  const summaryData = [
    ["SUBTOTAL", orderDetails.subtotal],
    ["DISCOUNT", 0],
    ["SUBTOTAL LESS DISCOUNT", orderDetails.subtotal],
    ["TAX RATE", "18%"],
    ["TOTAL TAX", orderDetails.gst],
    ["SHIPPING/HANDLING", orderDetails.fixedCost],
    ["Balance Paid", orderDetails.total],
  ];

  summaryData.forEach(([label, value], i) => {
    const y = summaryY + i * 20;
    doc
      .font("Helvetica-Bold")
      .text(label, rightX, y)
      .font("Helvetica")
      .text(typeof value === "number" ? `Rs. ${value?.toFixed(2)}` : value, rightX + 150, y, {
        align: "right",
      });
  });

  // ─────────── Footer Bar ───────────
  doc.rect(0, doc.page.height - 30, doc.page.width, 30).fill(orange);

  doc.end();
  return filePath;
};

// Add this to your order controller
export const downloadReceiptByOrderNo = async (req, res) => {
  try {
    const { orderNo } = req.params;

    console.log("Downloading receipt for orderNo:", orderNo);
    const order = await Order.findOne({ orderNo });
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const paymentDetails = order.paymentInfo || {
      payment_id: "N/A",
      order_id: order.orderNo,
    };

    console.log("Payment details:", paymentDetails);
    console.log("Order details:", order);

    const filePath = generateReceiptPDF(paymentDetails, order);

    console.log("Generated PDF at:", filePath);

    // Wait for PDF to be fully written
    const stream = fs.createReadStream(filePath);
    stream.on("open", () => {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=receipt_${orderNo}.pdf`);
      stream.pipe(res);
    });

    stream.on("error", (err) => {
      console.error("PDF stream error:", err);
      res.status(500).send("Failed to stream PDF.");
    });
  } catch (err) {
    console.error("Download receipt error:", err);
    res.status(500).json({ message: "Could not download receipt" });
  }
};
