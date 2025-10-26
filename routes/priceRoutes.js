// routes/priceRoutes.js

import express from "express";
import {
  createPrice,
  getAllPrices,
  getPriceById,
  updatePrice,
  deletePrice,
  updatePremiumPrices,
  getAllPricesWithPremium,
} from "../controllers/priceController.js";

const router = express.Router();

// @route   POST /api/prices
router.post("/", createPrice);

// @route   GET /api/prices
router.get("/", getAllPrices);

// @route   GET /api/prices/:id
router.get("/:id", getPriceById);

// @route   PUT /api/prices/:id
router.put("/:id", updatePrice);

// @route   DELETE /api/prices/:id
router.delete("/:id", deletePrice);

// @route   PUT /api/prices/:id/premium
router.put("/:id/premium", updatePremiumPrices);

// @route   GET /api/prices/premium
router.get("/premium", getAllPricesWithPremium);

export default router;
