import express from "express";
import { createRazorpayOrder, downloadReceiptByOrderNo, verifyPayment } from "../controllers/paymentController.js";


const paymentRoutes = express.Router();

paymentRoutes.post("/create-order", createRazorpayOrder);
paymentRoutes.post("/verify", verifyPayment);
paymentRoutes.get("/download-receipt/:orderNo", downloadReceiptByOrderNo);

export default paymentRoutes;
