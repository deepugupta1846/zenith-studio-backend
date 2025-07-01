import express from "express";
import {
  createOrder,
  getAllOrders,
  getOrderById,
  updateOrder,
  deleteOrder,
  getOrderByUser,
} from "../controllers/orderController.js";
import {downloadOrderFiles, upload} from "../middlewares/uploadMiddleware.js";


const router = express.Router();

router.post("/", upload.array("albumFiles", 1000), createOrder);
router.get("/", getAllOrders);
router.get("/:id", getOrderById);
router.put("/:id", updateOrder);
router.delete("/:id", deleteOrder);
router.post("/user", getOrderByUser);
router.get("/download/:orderNo", downloadOrderFiles);

export default router;
