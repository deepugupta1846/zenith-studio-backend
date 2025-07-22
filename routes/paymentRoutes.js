import express from "express";
import { createRazorpayOrder, downloadReceiptByOrderNo, getAllTransactions, verifyPayment } from "../controllers/paymentController.js";
import { protect } from "../middlewares/authMiddleware.js";


const paymentRoutes = express.Router();

paymentRoutes.post("/create-order", createRazorpayOrder);
paymentRoutes.post("/verify", verifyPayment);
paymentRoutes.get("/download-receipt/:orderNo", downloadReceiptByOrderNo);
paymentRoutes.get("/alltransaction", protect, getAllTransactions)

export default paymentRoutes;
