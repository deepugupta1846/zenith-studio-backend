import Order from "../models/Order.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import archiver from "archiver";
import QRCode from "qrcode";
import { generateReceiptPDF, sendMail } from "./paymentController.js";
import User from "../models/User.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create new order
export const createOrder = async (req, res) => {
  try {
    const {
      fullName,
      albumName,
      paperType,
      albumSize,
      sheetNumber,
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
      pricingDetails,
      street,
      state,
      district,
      landmark,
      zipCode,
      userType,
      shopName,
    } = req.body;
    console.log("Request body:", req.body);
    // Basic validation
    if (!albumName || !paperType || !albumSize || !orderDate || !orderNo || !userType) {
      return res.status(400).json({ message: "Please fill in all required fields" });
    }

    if(deliveryOption == 'courier'){
      if (!street || !landmark || !district || !state || !zipCode) {
        return res.status(400).json({ message: "Please provide complete delivery address" });
      }
    }

    const existingOrder = await Order.findOne({orderNo});
    if (existingOrder) {
      return res.status(409).json({ message: "Sorry, This order already exist." });
    }

    //validate email exist
    
    const userData = await User.findOne({ email });
    console.log("User data:", userData);
    if (userData) {
      if (userData.userType.toLocaleLowerCase() === "professional"  && userData.active === true && userType === "user") {
        return res.status(409).json({ message: "Sorry, professional users cannot place orders. Please order from dashboard." });
      }
    }

    // Collect file paths
    const uploadedFiles = req.files?.map((file) =>
      `/uploads/${path.relative(path.join(__dirname, "uploads"), file.path).replace(/\\/g, "/")}`
    ) || [];

    const pricingData = JSON.parse(pricingDetails || "{}");
    const userShopName = shopName || (userData ? userData.shopName : "");

    // Create the order in DB
    const order = await Order.create({
      fullName,
      albumName,
      paperType,
      albumSize,
      designPrint,
      sheets: sheetNumber,
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
      userType,
      shopName: userShopName,
      deliveryAddress: {
        street: street,
        landmark: landmark,
        city: district,
        state: state,
        zipCode: zipCode,
      },
    });

    // Prepare order details text
    const orderDetails = `
      Full Name: ${order.fullName}
      Shop Name: ${order.shopName}
      User Type: ${order.userType}
      Email: ${order.email || "-"}
      Mobile: ${order.mobile || "-"}
      Order No: ${order.orderNo}
      Order Date: ${order.orderDate?.toLocaleDateString() || "-"}
      Delivery Date: ${order.deliveryDate?.toLocaleDateString() || "-"}
      Album Name: ${order.albumName}
      Paper Type: ${order.paperType}
      Album Size: ${order.albumSize}
      Sheet Number: ${order.sheetNumber}
      Design / Print: ${order.designPrint || "-"}
      Bag Type: ${order.bagType || "-"}
      Delivery Option: ${order.deliveryOption || "-"}

      ${order.deliveryOption === "courier" ? 
      `Delivery Address:
        House No. / Village: ${order.deliveryAddress.street}
        Landmark: ${order.deliveryAddress.landmark}
        City: ${order.deliveryAddress.city}
        State: ${order.deliveryAddress.state}
        Zip Code: ${order.deliveryAddress.zipCode}
        Country: ${order.deliveryAddress.country}
      ` : ""
      }

      Payment Method: ${order.paymentMethod || "-"}
      Advance Percent: ${order.advancePercent || "-"}
      Payment Status: ${order.paymentStatus}
      Notes: ${order.notes || "-"}

      Price Details:
        Quantity: ${order.priceDetails.quantity}
        Paper Rate: ₹${order.priceDetails.paperRate}
        Binding Rate: ₹${order.priceDetails.bindingRate}
        Bag Rate: ₹${order.priceDetails.bagRate}
        Subtotal: ₹${order.priceDetails.subtotal}
        GST: ₹${order.priceDetails.serviceTax}
        Total: ₹${order.priceDetails.total}

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

    if(order.paymentMethod == "Cash Payment"){
     return res.status(200).json({ message: "Congratulation, Your order has been placed." });
    }

    if (order.paymentMethod == "QR Code Payment") {
      // Generate UPI QR code
      const qrCode = await generateQrCode({
        upiId: "paytmqr5wvv4d@ptys",
        name: "RAVINDER SINGH DHILL",
        amount: order.priceDetails.total,
        note: `Order No: ${order.orderNo}`,
      });

      console.log("QR Code generated successfully", qrCode);

      console.log("QR Code generated successfully");
      return res.status(201).json({
        order,
        ...qrCode,
      });
    }

    // Send response
    res.status(201).json({
      order,
      paymentRedirect: "/api/payment/create-order",
      suggestedPaymentDetails: {
        amount: order.priceDetails.total,
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

export const generateQRPayment=async(req, res)=>{
  const {order} = req.body
  if (order.paymentMethod == "QR Code Payment") {
      // Generate UPI QR code
      const qrCode = await generateQrCode({
        upiId: "paytmqr5wvv4d@ptys",
        name: "RAVINDER SINGH DHILL",
        amount: order.priceDetails.total,
        note: `Order No: ${order.orderNo}`,
      });

      // console.log("QR Code generated successfully", qrCode);

      // console.log("QR Code generated successfully");
      return res.status(201).json({
        order,
        ...qrCode,
      });
    }
}

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

export const getOrderDetails = async (req, res)=>{
   console.log(req.params.id)
  try {
   
    const orderDetails = await Order.findOne({orderNo: req.params.orderno})
    if (!orderDetails) return res.status(404).json({ success: false, message: "Order not found" });
    res.status(200).json({ success: true, order: orderDetails });
  } catch (error) {
    res.status(500).json({status: "failed", error: err.message})
  }
}


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

export const updatePaymentByOrderNo = async (req, res) => {
  const { paymentData, orderNo } = req.body
  console.log(paymentData)
  try {
    const updatedOrder = await Order.findOneAndUpdate(
      { orderNo },
      {
        $set: {
          paymentInfo: {
            razorpay_order_id: paymentData.razorpay_order_id || "",
            razorpay_payment_id: paymentData.razorpay_payment_id || "",
            razorpay_signature: paymentData.razorpay_signature || "",
            paymentDate: new Date(),
            utr_number: paymentData.utr_number || "",
          },
          paymentStatus: paymentData.paymentStatus || "Pending",
        },
      },
      { new: true }
    );

    if (!updatedOrder) return res.status(404).json({ message: "Order not found" });
        const pdfPath = generateReceiptPDF(
          { payment_id: paymentData.utr_number || "", order_id: orderNo },
          updatedOrder
        );
    
        // 2. Send Email with PDF
        await sendMail({
          to: updatedOrder.email,
          subject: "Your Album Order Receipt",
          html: `
            <div style="margin: 0; padding: 0; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f4;">
            <table cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f4f4; padding: 40px 0;">
              <tr>
                <td align="center">
                  <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">

                    <tr>
                      <td style="background-color: #ce181e; padding: 20px 30px; color: #ffffff; text-align: center;">
                        <h1 style="margin: 0; font-size: 24px;">Order Successful</h1>
                      </td>
                    </tr>

                    <tr>
                      <td style="padding: 30px;">
                        <h2 style="font-size: 20px; color: #333;">Thank you for your payment!</h2>
                        <p style="font-size: 16px; color: #555;">Your receipt for the album order is attached.</p>

                        <table cellpadding="0" cellspacing="0" width="100%" style="margin-top: 20px; font-size: 15px;">
                          <tr>
                            <td style="padding: 6px 0;"><strong>Order No:</strong></td>
                            <td>${updatedOrder.orderNo}</td>
                          </tr>
                          <tr>
                            <td style="padding: 6px 0;"><strong>UTR / Transaction Number:</strong></td>
                            <td>${paymentData.utr_number}</td>
                          </tr>
                          <tr>
                            <td style="padding: 6px 0;"><strong>Payment Date:</strong></td>
                            <td>${new Date().toLocaleDateString()}</td>
                          </tr>
                        </table>

                        <p style="margin-top: 20px; font-size: 16px; color: #444;">Your payment has been recorded. Please wait while we verify and confirm your order.</p>

                      </td>
                    </tr>

                    <tr>
                      <td style="background-color: #f0f0f0; padding: 20px 30px; text-align: center; font-size: 13px; color: #777;">
                        © ${new Date().getFullYear()} Zenith Studio. All rights reserved.
                      </td>
                    </tr>

                  </table>
                </td>
              </tr>
            </table>

          </div>
          `,
          attachments: [
            {
              filename: "receipt.pdf",
              path: pdfPath,
            },
          ],
        });
    
    res.status(200).json({ message: "Payment updated. Please wait for admin aproval.", order: updatedOrder });
  } catch (err) {
    console.error("Error updating payment info:", err);
    throw err;
  }
};



// Delete order (and all its uploaded files)
export const deleteOrder = async (req, res) => {
  try {
    // 1️⃣ Fetch the order
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const orderDir = path.join("", "uploads", `order-${order.orderNo}`); // Adjust root if needed

    try {
      if (fs.existsSync(orderDir)) {
        fs.rmSync(orderDir, { recursive: true, force: true });
        console.log(`🗑️  Removed folder ${orderDir}`);
      }
    } catch (fsErr) {
      console.error("File cleanup error:", fsErr);
    }

    // 2️⃣ Soft delete: update active to false
    order.active = false;
    await order.save();

    res.status(200).json({ success: true, message: "Order deleted" });
  } catch (err) {
    console.error("Delete order failed:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};



export const generateQrCode = async (paymentData) => {
  const { upiId, name, amount, note } = paymentData;

  // UPI payment URI format
  const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(name)}&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`;

  try {
    const qrDataURL = await QRCode.toDataURL(upiUrl);

    return {
      upiUrl,
      qrCode: qrDataURL, // base64 string for QR image
      upiId,
      name,
      amount,
      note,
    };
  } catch (err) {
    console.error("QR Code generation error:", err);
    throw new Error("Failed to generate UPI QR code");
  }
};