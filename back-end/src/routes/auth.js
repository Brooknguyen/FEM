//back-end /src/routes/auth.js
import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { sendOtpMail } from "../utils/mailer.js";

const router = Router();

// Helpers
function signAccessToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), code: user.code, role: user.role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES || "1h" }
  );
}

function signRefreshToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), typ: "refresh" },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES || "30d" }
  );
}

// RESGISTER
// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { code, password, firstName, lastName, role } = req.body || {};
    if (!code || !password || !firstName || !lastName) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const exists = await User.findOne({ code });
    if (exists)
      return res.status(409).json({ message: "Employee code already exists" });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      code,
      firstName,
      lastName,
      passwordHash,
      role: role && ["user", "admin"].includes(role) ? role : "user",
    });

    // cấp token ngay sau đăng ký (tùy)
    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    return res.status(201).json({
      user: {
        id: user._id,
        code: user.code,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      accessToken,
      refreshToken,
      expiresIn: process.env.JWT_ACCESS_EXPIRES || "1h",
    });
  } catch (err) {
    console.error("[register]", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { code, password } = req.body || {};
    console.log("[login] code:", code); // Add this
    if (!code || !password) {
      return res.status(400).json({ message: "Missing code or password" });
    }

    const user = await User.findOne({ code });
    console.log("[login] user found:", !!user); // Add this
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const hash = user.passwordHash || user.passwordHash;
    const ok = await bcrypt.compare(password, hash);

    console.log("[login] password match:", ok); // Add this
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    return res.json({
      user: {
        id: user._id,
        code: user.code,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      accessToken,
      refreshToken,
      expiresIn: process.env.JWT_ACCESS_EXPIRES || "1h",
    });
  } catch (err) {
    console.error("[login]", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// POST /api/auth/refresh
router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken)
      return res.status(400).json({ message: "Missing refreshToken" });

    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    if (payload.typ !== "refresh") throw new Error("Invalid token type");

    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ message: "User not found" });

    const accessToken = signAccessToken(user);
    const newRefresh = signRefreshToken(user); // có thể giữ refresh cũ nếu muốn

    return res.json({
      accessToken,
      refreshToken: newRefresh,
      expiresIn: process.env.JWT_ACCESS_EXPIRES || "1h",
    });
  } catch (err) {
    console.error("[refresh]", err);
    return res
      .status(401)
      .json({ message: "Invalid or expired refresh token" });
  }
});

// ===== FORGOT PASSWORD (send OTP) =====
router.post("/forgot-password", async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ message: "Employee code is required" });
    }
    const user = await User.findOne({ code });
    if (!user) return res.status(404).json({ message: "User not found" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetOtp = otp;
    user.resetOtpExp = new Date(
      Date.now() + (parseInt(process.env.RESET_OTP_TTL_MIN, 10) || 10) * 60000
    );
    await user.save();

    // Gửi OTP đến email admin hoặc user
    await sendOtpMail(
      process.env.MAIL_USERGET || "nguyenbrook0412@gmail.com",
      code,
      otp,
      `${user.firstName} ${user.lastName}`
    );

    const devMode = process.env.NODE_ENV !== "production";
    if (devMode) {
      return res.json({
        message: "OTP sent to admin email",
        otp: otp,
        expiresInMinutes: parseInt(process.env.RESET_OTP_TTL_MIN, 10) || 10,
      });
    } else {
      return res.json({
        message: "OTP sent to email if exists",
      });
    }
  } catch (e) {
    console.error("[forgot-password error]", e);
    res.status(500).json({ message: "Server error: " + e.message });
  }
});

// ===== RESET PASSWORD =====
router.post("/reset-password", async (req, res) => {
  try {
    const { code, otp, newPassword } = req.body || {};
    if (!code || !otp || !newPassword) {
      return res.status(400).json({ message: "Missing data" });
    }

    const user = await User.findOne({ code });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.resetOtp || !user.resetOtpExp) {
      return res.status(400).json({ message: "OTP not requested" });
    }
    if (user.resetOtp !== otp || new Date() > user.resetOtpExp) {
      return res.status(400).json({ message: "OTP invalid or expired" });
    }

    // ✅ LƯU ĐÚNG FIELD
    user.passwordHash = await bcrypt.hash(newPassword, 12);

    user.resetOtp = undefined;
    user.resetOtpExp = undefined;
    await user.save();
    console.log("Password updated for", user.code, user.passwordHash); // Log added

    res.json({ message: "Password reset success" });
  } catch (e) {
    console.error("[reset-password]", e);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/auth/me (đòi access token)
router.get("/me", async (req, res) => {
  try {
    // middleware auth sẽ xử lý ở server.js (gắn trước khi vào route này)
    // nhưng để endpoint này độc lập, ta parse nhanh tại đây nếu muốn:
    return res
      .status(400)
      .json({ message: "Mount this under auth middleware" });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;
