import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import {
  createStock,
  getAllStock,
  getStockById,
  updateStock,
  deleteStock,
  updateStockQuantity,
  getLowStockAlerts,
  getExpiredStockAlerts,
  getStockAnalytics,
  bulkUpdateStock,
  exportStock,
} from "../controllers/stockController.js";

const router = express.Router();

router.post("/", protect, createStock);
router.get("/", protect, getAllStock);
router.get("/analytics", protect, getStockAnalytics);
router.get("/alerts/low-stock", protect, getLowStockAlerts);
router.get("/alerts/expired", protect, getExpiredStockAlerts);
router.get("/export", protect, exportStock);
router.post("/bulk-update", protect, bulkUpdateStock);
router.get("/:id", protect, getStockById);
router.put("/:id", protect, updateStock);
router.patch("/:id/quantity", protect, updateStockQuantity);
router.delete("/:id", protect, deleteStock);

export default router;
