import express from "express";
import {
  registerUser,
  loginUser,
  checkEmail,
  sendOtp,
  verifyUser,
} from "../controllers/userController.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/check-email", checkEmail);
router.post("/send-otp", sendOtp);
router.get("/verify-user/:id", verifyUser);

export default router;
