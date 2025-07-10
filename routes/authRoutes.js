import express from "express";
import {
  registerUser,
  loginUser,
  checkEmail,
  sendOtp,
  verifyUser,
  getUserDetails,
  createSuperUser,
  getAllUsers,
  deactivateUser,
  resetPassword,
  sendForgotPasswordOtp,
  deleteUser,
} from "../controllers/userController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/check-email", checkEmail);
router.post("/send-otp", sendOtp);
router.get("/verify-user/:id", verifyUser);
router.get("/deactivate-user/:id", deactivateUser);
router.get("/profile", protect, getUserDetails);
router.post("/create-super-user", createSuperUser);
router.get("/get-all-users", protect, getAllUsers);
router.post("/send-reset-otp", sendForgotPasswordOtp);
router.post("/reset-password", resetPassword);
router.delete("/user/:id", protect, deleteUser);

export default router;
