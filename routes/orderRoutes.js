import express from "express";
import {
  createOrder,
  getAllOrders,
  getOrderById,
  updateOrder,
  deleteOrder,
  getOrderByUser,
  updatePaymentByOrderNo,
  generateQRPayment,
  getOrderDetails,
  sendPaymentReminder,
} from "../controllers/orderController.js";
import {downloadOrderFiles, upload} from "../middlewares/uploadMiddleware.js";


const router = express.Router();

router.post("/", upload.array("albumFiles", 1000), createOrder);
router.get("/", getAllOrders);
router.get("/:id", getOrderById);
router.put("/:id", updateOrder);
router.delete("/:id", deleteOrder);
router.get("/details/:orderno", getOrderDetails);
router.post("/user", getOrderByUser);
router.get("/download/:orderNo", downloadOrderFiles);
router.post("/payment/update", updatePaymentByOrderNo);
router.post("/make-qr-payment", generateQRPayment);
router.post("/send-reminder", sendPaymentReminder )

export default router;
