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
        <p>~ Zenith Studio</p>
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

export const getAllTransactions = async (req, res) => {
  try {
    const payments = await razorpay.payments.all({ count: 100 });

    res.status(200).json({
      success: true,
      payments: payments.items, // array of payments
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    res.status(500).json({ success: false, message: "Failed to fetch transactions" });
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
    from: `"Zenith Studio" <${process.env.MAIL_USER}>`,
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
  const black = "#000";

  // Header
  doc
    .fillColor(red)
    .fontSize(18)
    .font("Helvetica-Bold")
    .text("Zenith Studio", 50, 50)
    .fontSize(10)
    .fillColor(black)
    .text("Peer Mansoor Road,", 50, 70)
    .text("Gaya, Bihar 823001", 50, 85);

  doc
    .fontSize(10)
    .fillColor(black)
    .text(`#${orderDetails.serialNo}`, 400, 30, { align: "right" });

  doc
    .fontSize(10)
    .fillColor(black)
    .text("GSTIN-10ACOPD1076D2Z8", 400, 50, { align: "right" });

  doc
    .font("Helvetica")
    .text(`Track No: ${orderDetails.orderNo}`, 400, 70)
    .text(`Order Date: ${new Date(orderDetails.orderDate).toLocaleDateString()}`, 400, 85)
    .text(`Delivery Date: ${new Date(orderDetails.deliveryDate).toLocaleDateString()}`, 400, 100);

  // Customer Info
  doc.moveDown();
  const topY = 130;
  doc
    .fillColor(red)
    .font("Helvetica-Bold")
    .text("Customer Info", 50, topY)
    .fillColor(black)
    .font("Helvetica")
    .text(`Name: ${orderDetails.fullName || "N/A"}`, 50, topY + 15)
    .text(`Shop: ${orderDetails.shopName || "N/A"}`, 50, topY + 30)
    .text(`Mobile: ${orderDetails.mobile || "N/A"}`, 50, topY + 45)
    .text(`Email: ${orderDetails.email || "N/A"}`, 50, topY + 60);

  // Table Headers
  const tableTop = topY + 90;
  doc
    .fillColor(red)
    .font("Helvetica-Bold")
    .text("Name", 50, tableTop)
    .text("Type", 170, tableTop)
    .text("Paper", 250, tableTop)
    .text("Qty", 320, tableTop)
    .text("Unit Price", 390, tableTop)
    .text("Amount", 480, tableTop);

  doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke(red);

  // Table Row
  const { quantity = 1, paperRate = 0, paperType = "Glossy", albumName = "N/A" } = orderDetails.priceDetails || {};
  const rowY = tableTop + 30;

  doc
    .fillColor(black)
    .font("Helvetica")
    .text(orderDetails.albumName, 50, rowY)
    .text(orderDetails.designPrint == "print_design" ? "Print & design" : "Only print", 170, rowY)
    .text(orderDetails.paperType, 250, rowY)
    .text(`${quantity} ${orderDetails.sheets > 0 && orderDetails.designPrint == "print_design" ? "Sheets" : "Paper"}`, 320, rowY)
    .text(orderDetails.priceDetails.paperRate.toFixed(2), 400, rowY)
    .text((orderDetails.priceDetails.paperRate * quantity).toFixed(2), 480, rowY);

   // Total
  const bagY = rowY + 40;
  doc
    .font("Helvetica-Bold")
    .text("Bag ", 400, bagY)
    .text(orderDetails.priceDetails.bagRate.toFixed(2), 480, bagY)

    if(orderDetails.deliveryOption == 'courier'){
    const courierY = rowY + 60;
      doc
        .font("Helvetica-Bold")
        .text("Courier", 400, courierY)
        .text(110.00, 480, courierY)
    }
    if(orderDetails.priceDetails.bindingRate>0){
    const courierY = rowY + 80;
      doc
        .font("Helvetica-Bold")
        .text("Binding ", 400, courierY)
        .text(orderDetails.priceDetails.bindingRate.toFixed(2), 480, courierY)
    }
  

    // Total
  const totalY = rowY + 100;
  doc
    .font("Helvetica-Bold")
    .text("Total", 400, totalY)
    .text(`${(orderDetails.priceDetails.total).toFixed(2)}/-`, 480, totalY);

  // Payment Section
  const payY = totalY + 60;
  doc
    .fillColor(red)
    .font("Helvetica-Bold")
    .text("Payment Method", 50, payY)
    .fillColor(black)
    .font("Helvetica")
    .text(orderDetails.paymentMethod || "N/A", 50, payY + 15)
    .text(`Transaction Id-${orderDetails.paymentMethod == "QR Code Payment" ? orderDetails.paymentInfo.utr_number : orderDetails.paymentInfo.razorpay_payment_id}`, 50, payY + 30)
    .text(`Payment Date-${orderDetails.paymentInfo.paymentDate}`, 50, payY + 45)
    .text(`Advance Amount-${orderDetails.priceDetails.advanceAmount?.toFixed(2)}`, 50, payY + 60)
    .text(`Balance Amount-${orderDetails.priceDetails.total?.toFixed(2)}`, 50, payY + 75);

  // Notes Section
  doc
    .fillColor(red)
    .font("Helvetica-Bold")
    .text("Notes", 300, payY)
    .fillColor(black)
    .font("Helvetica")
    .text(orderDetails.notes || "N/A", 300, payY + 15);

  // Terms & Conditions
  const termsY = payY + 90;
  doc
    .moveTo(50, termsY)
    .lineTo(550, termsY)
    .stroke(red);

  doc
    .fillColor(red)
    .font("Helvetica-Bold")
    .text("Terms & Conditions", 50, termsY + 10)
    .fillColor(black)
    .font("Helvetica")
    .text("Payment is due within 15 days", 50, termsY + 25)
    .text("Please make checks payable to: ravzenith57@gmail.com", 50, termsY + 40)
    .text("Colour matching is not guaranteed on reprints", 50, termsY + 55);

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
