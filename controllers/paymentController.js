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

export const generateReceiptPDF = (paymentDetails, orderDetails, isReceipt = false) => {
  const folderPath = path.join("", isReceipt ? "receipts" : "uploads", `order-${orderDetails.orderNo}`);
  const fileName = `receipt_${orderDetails.orderNo}.pdf`;
  const filePath = path.join(folderPath, fileName);

  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }

  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  const red = "#ce181e";
  const gray = "#f5f5f5";
  const black = "#000";

  // Header
  doc
    .fillColor(red)
    .fontSize(18)
    .text("Zenith Studio", { align: "left" })
    .fillColor(black)
    .fontSize(10)
    .text("Peer Mansoor Road,")
    .text("Gaya, Bihar 823001");

  doc.moveDown();

  // Customer Info Section
  const topY = doc.y;
  doc
    .fillColor(red)
    .font("Helvetica-Bold")
    .text("Customer Info", 50, topY)
    .fillColor(black)
    .font("Helvetica")
    .text(`Name: ${orderDetails.fullName || "N/A"}`, 50, topY + 15)
    .text(`Mobile: ${orderDetails.mobile || "N/A"}`, 50, topY + 30)
    .text(`Email: ${orderDetails.email || "N/A"}`, 50, topY + 45)
    .text(`Order No: ${orderDetails.orderNo}`, 300, topY + 15)
    .text(`Order Date: ${new Date(orderDetails.orderDate).toLocaleDateString()}`, 300, topY + 30)
    .text(`Delivery Date: ${new Date(orderDetails.deliveryDate).toLocaleDateString()}`, 300, topY + 45);
    if(orderDetails.deliveryOption === 'courier'){
      doc
        .text(`Address: ${orderDetails.deliveryAddress.street || ""}, ${orderDetails.deliveryAddress.landmark || ""}, ${orderDetails.deliveryAddress.city || ""}, ${orderDetails.deliveryAddress.state || ""}, ${orderDetails.deliveryAddress.zipCode || ""}`, 50, topY + 60)
        .text(`Country: ${orderDetails.deliveryAddress.country || "India"}`, 50, topY + 75);
    }
  doc.moveDown(5);

  // Table Headers
  const tableY = doc.y + 10;
  doc
    .fillColor(red)
    .font("Helvetica-Bold")
    .text("Qty", 50, tableY)
    .text("Description", 100, tableY)
    .text("Unit Price", 350, tableY)
    .text("Amount", 450, tableY);

  doc.moveTo(50, tableY + 15).lineTo(550, tableY + 15).stroke(red);

  // Table Data
  let y = tableY + 25;
  const items = [];

  const { quantity = 1, paperRate = 0, bindingRate = 0, bagRate = 0 } = orderDetails.priceDetails || {};

  if (paperRate > 0) {
    items.push({
      qty: quantity,
      description: `${orderDetails.albumName || "Album"} - Paper (${orderDetails.paperType || "N/A"})`,
      unitPrice: paperRate,
      total: paperRate * quantity,
    });
  }

  if (bindingRate > 0) {
    items.push({
      qty: quantity,
      description: `Binding`,
      unitPrice: bindingRate,
      total: bindingRate * quantity,
    });
  }

  if (bagRate > 0) {
    items.push({
      qty: quantity,
      description: `Bag Type: ${orderDetails.bagType || "N/A"}`,
      unitPrice: bagRate,
      total: bagRate * quantity,
    });
  }

  items.forEach((item) => {
    doc
      .fillColor(black)
      .font("Helvetica")
      .text(item.qty, 50, y)
      .text(item.description, 100, y)
      .text(item.unitPrice.toFixed(2), 350, y)
      .text(item.total.toFixed(2), 450, y);
    y += 20;
  });

  // Totals
  y += 10;
  doc
    .font("Helvetica")
    .text("Subtotal", 400, y)
    .text(orderDetails.priceDetails.subtotal?.toFixed(2) || "0.00", 470, y, { align: "right" });

  y += 15;
  doc.text("Service Tax", 400, y);
  doc.text(orderDetails.priceDetails.serviceTax?.toFixed(2) || "0.00", 470, y, { align: "right" });

  y += 20;
  doc
    .font("Helvetica-Bold")
    .text("Total", 400, y)
    .text(`${orderDetails.priceDetails.total?.toFixed(2) || "0.00"}/-`, 470, y, { align: "right" });

  // Payment Info
  y += 40;
  doc
    .fillColor(red)
    .font("Helvetica-Bold")
    .text("Payment Method", 50, y)
    .fillColor(black)
    .font("Helvetica")
    .text(orderDetails.paymentMethod || "N/A", 50, y + 15)
    .text("Payment Status:", 50, y + 30)
    .text(orderDetails.paymentStatus || "N/A", 150, y + 30);

  doc
    .fillColor(red)
    .font("Helvetica-Bold")
    .text("Notes", 300, y)
    .fillColor(black)
    .font("Helvetica")
    .text(orderDetails.notes || "N/A", 300, y + 15);

  // Terms
  y += 60;
  doc
    .moveTo(50, y)
    .lineTo(550, y)
    .stroke(red);
  y += 10;

  doc
    .fillColor(red)
    .font("Helvetica-Bold")
    .text("Terms & Conditions", 50, y);

  doc
    .fillColor(black)
    .font("Helvetica")
    .text("Payment is due within 15 days", 50, y + 15)
    .text("Please make checks payable to: ravzenith57@gmail.com", 50, y + 30);

  doc.end();
  return filePath;
};

// Add this to your order controller
export const downloadReceiptByOrderNo = async (req, res) => {
  try {
    const { orderNo } = req.params;

    console.log("Received orderNo:", orderNo);

    const order = await Order.findOne({ orderNo });
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const paymentDetails = order.paymentInfo || {
      payment_id: "N/A",
      order_id: order.orderNo,
    };

    const folderPath = path.join("", "receipts", `order-${order.orderNo}`);
    const fileName = `receipt_${order.orderNo}.pdf`;
    const filePath = path.join(folderPath, fileName);

    // ✅ Check if PDF already exists (cache)
    if (!fs.existsSync(filePath)) {
      console.log("Generating new PDF...");
      await generateReceiptPDF(paymentDetails, order, true);
    } else {
      console.log("Using cached PDF...");
    }

    console.log("Sending PDF:", filePath);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=receipt_${orderNo}.pdf`);

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);

    stream.on("error", (err) => {
      console.error("PDF stream error:", err);
      res.status(500).send("Failed to stream PDF.");
    });

    // ✅ Delete file after sending (optional)
    res.on("finish", () => {
      fs.unlink(filePath, (err) => {
        if (err) {
          console.error("Error deleting PDF:", err);
        } else {
          console.log("Deleted temporary PDF:", filePath);
        }
      });
    });

  } catch (err) {
    console.error("Download receipt error:", err);
    res.status(500).json({ message: "Could not download receipt" });
  }
};
