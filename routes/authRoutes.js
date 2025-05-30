import express from "express";
import {
  registerUser,
  loginUser,
  checkEmail,
  sendOtp,
} from "../controllers/userController.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/check-email", checkEmail);
router.post("/send-otp", sendOtp);

export default router;
