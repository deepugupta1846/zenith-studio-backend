import User from "../models/User.js";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { v4 as uuidv4 } from "uuid";

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

    const user = await User.create({
      name,
      email,
      mobileNumber,
      password,
      licenseKey: licenseKey || "",
      userType: userType || "user",
      active: false,
      shopName
    });

    delete otps[email];

    if (user.userType === "Professional") {
      await sendAdminVerificationEmail(user);
    }

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

// @desc    Send OTP to email
// @route   POST /api/auth/send-otp
export const sendOtp = async (req, res) => {
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

const sendAdminVerificationEmail = async (user) => {
  const adminEmail = process.env.ADMIN_EMAIL;

  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });


const html = `
  <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; padding: 30px; background-color: #f9f9f9; border: 1px solid #e2e2e2; border-radius: 8px;">
    <h2 style="color: #ce181e; border-bottom: 2px solid #ce181e; padding-bottom: 10px;">🔔 New Professional User Registration</h2>
    
    <p style="font-size: 16px; color: #333; margin-top: 20px;">
      A new <strong>professional</strong> user has registered. Please review their details below and verify the account.
    </p>

    <table style="width: 100%; margin-top: 20px; font-size: 15px; color: #444;">
      <tr>
        <td style="padding: 8px 0;"><strong>Name:</strong></td>
        <td style="padding: 8px 0;">${user.name}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0;"><strong>Email:</strong></td>
        <td style="padding: 8px 0;">${user.email}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0;"><strong>Mobile:</strong></td>
        <td style="padding: 8px 0;">${user.mobileNumber}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0;"><strong>Shop Name:</strong></td>
        <td style="padding: 8px 0;">${user.shopName}</td>
      </tr>
    </table>

    <div style="text-align: center; margin-top: 30px;">
      <a href="http://localhost:5173/activate/?userid=${user._id}" style="
        display: inline-block;
        padding: 12px 25px;
        background-color: #ce181e;
        color: #fff;
        text-decoration: none;
        font-weight: bold;
        border-radius: 6px;
        font-size: 16px;
      ">✅ Verify User</a>
    </div>

    <p style="margin-top: 40px; font-size: 13px; color: #999; text-align: center;">
      This is an automated message. Please do not reply to this email.
    </p>
  </div>
`;

  await transporter.sendMail({
    from: `"Zenith Admin" <${process.env.EMAIL_USER}>`,
    to: adminEmail,
    subject: "New Professional User Verification Needed",
    html,
  });
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
