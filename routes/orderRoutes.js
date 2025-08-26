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
  getAllUsersWithOrders,
  getUserOrdersWithPayments,
  updateCashPayment,
  getPaymentStatistics,
  bulkUpdatePaymentStatus,
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

// New Admin Order Management Routes
router.get("/admin/users-with-orders", getAllUsersWithOrders);
router.get("/admin/user-orders/:email", getUserOrdersWithPayments);
router.post("/admin/update-cash-payment", updateCashPayment);
router.get("/admin/payment-statistics", getPaymentStatistics);
router.post("/admin/bulk-update-payment", bulkUpdatePaymentStatus);

export default router;
