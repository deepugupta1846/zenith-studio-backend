import Razorpay from "razorpay";
import crypto from "crypto";

const razorpay = new Razorpay({
  key_id: "J1xH9mDq4Z9MZJb9LNKhCMFg",
  key_secret: "rzp_test_eLWHQbmT4CTzZr",
});


// Create Razorpay Order
export const createRazorpayOrder = async (req, res) => {
  try {
    const { amount, currency = "INR", receipt, notes } = req.body;

    console.log("body data",{
        amount: amount * 100, // Rs → paise
      currency,
      receipt,
      notes,
    } )

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

// OPTIONAL: Verify Razorpay Payment Signature
export const verifyPayment = (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const generatedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(razorpay_order_id + "|" + razorpay_payment_id)
    .digest("hex");

  if (generatedSignature === razorpay_signature) {
    return res.json({ success: true, message: "Payment verified successfully" });
  } else {
    return res.status(400).json({ success: false, message: "Invalid signature" });
  }
};
