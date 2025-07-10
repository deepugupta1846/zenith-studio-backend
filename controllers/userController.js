import User from "../models/User.js";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { v4 as uuidv4 } from "uuid";
import { sendEmailViaApi } from "../utils/sendEmailViaApi.js";

const otps = {}; // { email: { otp, expiresAt } }

// Generate JWT
const generateToken = (user) => {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req, res) => {
  const {
    name,
    email,
    password,
    otp,
    licenseKey,
    userType, // optional
    active,   // optional
    mobileNumber,
    shopName
  } = req.body;

  if (!name || !email || !mobileNumber || !password || !password || !otp) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const storedOtp = otps[email];
    if (!storedOtp || storedOtp.otp !== otp || storedOtp.expiresAt < Date.now()) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    const user = {
      name,
      email,
      mobileNumber,
      password,
      licenseKey: licenseKey || "",
      userType: userType || "user",
      active: false,
      shopName
    };

    delete otps[email];

    if (user.userType === "Professional") {
      user.active = false; 
      const newUser = await User.create(user);
      await sendAdminVerificationEmail(user);
      return res.status(201).json({
        message: "User registered successfully. Please wait for admin approval.",
        status:"success"
      });
    }else{
      user.active = true; // Set active to true for non-professional users
      const newUser = await User.create(user);
      res.status(201).json({
        status:"success",
        message: "User registered successfully.",
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server error" });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (user) {
      // Check if account is active
      if (!user.active) {
        return res.status(403).json({ message: "User not activated" });
      }

      // Check password
      const isMatch = await user.matchPassword(password);
      if (isMatch) {
        return res.json({
          _id: user._id,
          name: user.name,
          email: user.email,
          userType: user.userType,
          token: generateToken(user),
        });
      }
    }

    res.status(401).json({ message: "Invalid email or password" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};


// @desc    Check if email exists
// @route   GET /api/auth/check-email?email=xxx
export const checkEmail = async (req, res) => {
  const { email } = req.query;
  try {
    const user = await User.findOne({ email });
    res.json({ exists: !!user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Send OTP to email
// @route   POST /api/auth/send-otp
export const old_sendOtp = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required" });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  otps[email] = { otp, expiresAt };

  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });

  const mailOptions = {
    from: `"Zenith Studio" <${process.env.MAIL_USER}>`,
    to: email,
    subject: "Your Zenith Studio OTP",
    html: `<p>Your OTP is <strong>${otp}</strong>. It is valid for 10 minutes.</p>`,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ message: "OTP sent" });
  } catch (err) {
    console.error("Failed to send OTP:", err);
    res.status(500).json({ message: "Failed to send OTP" });
  }
};

// @desc    Send OTP to email
// @route   POST /api/auth/send-otp
export const sendOtp = async (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ message: "Email is required" });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  otps[email] = { otp, expiresAt };

  const htmlContent = `Your OTP is <b>${otp}</b>. It is valid for 10 minutes.`;

  try {
    await sendEmailViaApi({
      to: email,
      subject: "Your Zenith Studio Registration OTP",
      html: htmlContent,
      type: "otp"
    });

    res.status(200).json({ message: "OTP sent successfully" });
  } catch (err) {
    console.error("Failed to send OTP:", err.message);
    res.status(500).json({ message: "Failed to send OTP" });
  }
};

// @desc    Verify professional user and activate account
// @route   GET /api/auth/verify-user/:token
// @access  Public
export const verifyUser = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ message: "User ID is required" });
  }

  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update license key and activate user
    user.licenseKey = uuidv4();
    user.active = true;
    await user.save();

    res.status(200).json({
      message: "User verified successfully",
      licenseKey: user.licenseKey,
      userId: user._id,
    });
  } catch (error) {
    console.error("Verification failed:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const deactivateUser = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ message: "User ID is required" });
  }

  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update license key and activate user
    user.licenseKey = "";
    user.active = false;
    await user.save();

    res.status(200).json({
      message: "User Deactivated successfully",
      licenseKey: user.licenseKey,
      userId: user._id,
    });
  } catch (error) {
    console.error("Deactivation failed:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const sendAdminVerificationEmail = async (user) => {
  const adminEmail = process.env.ADMIN_EMAIL;

  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });


const htmlMessage = `
  <!DOCTYPE html>
  <html lang="en" xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Verify Your Account</title>
    <style>
      body {
        margin: 0;
        padding: 0;
        background-color: #f4f6f8;
        font-family: "Segoe UI", Roboto, Arial, sans-serif;
      }
      .container {
        max-width: 600px;
        margin: 40px auto;
        background: #fff;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 0 10px rgba(0,0,0,0.05);
      }
      .header {
        background-color: #ce181e;
        color: #fff;
        padding: 24px;
        text-align: center;
      }
      .header h1 {
        margin: 0;
        font-size: 24px;
      }
      .body {
        padding: 30px;
        color: #333;
      }
      .body p {
        font-size: 16px;
        line-height: 1.6;
        margin: 0 0 16px;
      }
      .button {
        display: block;
        width: fit-content;
        margin: 30px auto 0;
        padding: 12px 28px;
        background-color: #ce181e;
        color: white;
        font-weight: 600;
        font-size: 16px;
        text-align: center;
        border-radius: 6px;
        text-decoration: none;
      }
      .footer {
        text-align: center;
        padding: 20px;
        font-size: 12px;
        color: #777;
      }
      .footer a {
        color: #ce181e;
        text-decoration: none;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Zenith Studio</h1>
      </div>

      <div class="body">
        <p>Hello <strong>${user.name}</strong>,</p>
        <p>Thank you for registering with Zenith Studio. To complete your sign-up, please verify your account by clicking the button below.</p>
        
        <a href="https://zenithstudiogaya.in/activate/?userid=${user._id}" class="button">✅ Verify My Account</a>

        <p>If you did not create an account with us, you can safely ignore this message.</p>
      </div>

      <div class="footer">
        &copy; ${new Date().getFullYear()} Zenith Studio. All rights reserved.<br />
        <a href="https://zenithstudiogaya.in">Visit our website</a>
      </div>
    </div>
  </body>
  </html>
`;

// await sendEmailViaApi({
//   to: user.email,
//   subject: 'Verify Your Zenith Studio Account',
//   html: htmlMessage,
//   type: 'account-verification'
// });

 try {
    await sendEmailViaApi({
      to: adminEmail,
      subject: "Verify Your Zenith Studio Account",
      html: htmlMessage,
      type: "Verification Email",
    });

  } catch (err) {
    console.error("Failed to send link:", err.message);
  }
};


// @desc    Get logged-in user details
// @route   GET /api/auth/profile
// @access  Private (Protected)
export const getUserDetails = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { _id, name, email, mobileNumber, shopName, licenseKey, userType, active } = req.user;

    res.status(200).json({
      _id,
      name,
      email,
      mobileNumber,
      shopName,
      licenseKey,
      userType,
      active,
    });
  } catch (error) {
    console.error("Error fetching user details:", error);
    res.status(500).json({ message: "Server error" });
  }
};


export const createSuperUser = async (req, res) => {
  const {
    name,
    email,
    password,
    mobileNumber,
  } = req.body;

  if (!name || !email || !mobileNumber || !password ) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const user = await User.create({
      name,
      email,
      mobileNumber,
      password,
      licenseKey: "",
      userType: "admin",
      active: true,
      shopName:"Zenith Studio"
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      mobileNumber: mobileNumber,
      licenseKey: user.licenseKey,
      userType: user.userType,
      active: user.active,
      token: generateToken(user),
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server error" });
  }
};


// @route   POST /api/auth/forgot-password/send-otp
export const sendForgotPasswordOtp = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required" });

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    otps[email] = { otp, expiresAt };

    const htmlContent = `Your password reset OTP is <b>${otp}</b>. It is valid for 10 minutes.`;

    await sendEmailViaApi({
      to: email,
      subject: "Reset Your Password - Zenith Studio",
      html: htmlContent,
      type: "otp",
    });

    res.status(200).json({ message: "OTP sent to email" });
  } catch (err) {
    console.error("Forgot password OTP error:", err);
    res.status(500).json({ message: "Failed to send OTP" });
  }
};


// @route   POST /api/auth/reset-password
export const resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const storedOtp = otps[email];
  if (!storedOtp || storedOtp.otp !== otp || storedOtp.expiresAt < Date.now()) {
    return res.status(400).json({ message: "Invalid or expired OTP" });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    user.password = newPassword;
    await user.save();

    delete otps[email];

    res.status(200).json({ message: "Password reset successfully" });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ message: "Failed to reset password" });
  }
};


export const deleteUser = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ message: "User ID is required" });
  }

  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await user.deleteOne();

    res.status(200).json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ message: "Failed to delete user" });
  }
};