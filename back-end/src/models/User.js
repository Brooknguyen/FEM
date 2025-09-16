//user.js

import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, index: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
      index: true,
    },

    // OTP reset (NEW)
    resetOtp: { type: String },
    resetOtpExp: { type: Date },
    // Optional: buộc đổi mật khẩu sau khi đăng nhập
    mustChangePassword: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const User = mongoose.model("User", UserSchema);
