import express from "express";
import {
  registerUser,
  loginUser,
  checkEmail,
  sendOtp,
  verifyUser,
  getUserDetails,
  createSuperUser,
} from "../controllers/userController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/check-email", checkEmail);
router.post("/send-otp", sendOtp);
router.get("/verify-user/:id", verifyUser);
router.get("/profile", protect, getUserDetails);
router.post("/create-super-user", createSuperUser);

export default router;
