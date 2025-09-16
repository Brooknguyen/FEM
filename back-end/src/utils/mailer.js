// utils/mailer.js

import nodemailer from "nodemailer";

export async function sendOtpMail(to, code, otp, fullName) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.MAIL_USER || "synopex.no.reply@gmail.com",
      pass: process.env.MAIL_PASS || "ftnljaialfpuzprf",
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  const mailOptions = {
    from: `"Synopex Auth" <${process.env.MAIL_USER}>`,
    to,
    subject: "🔐 Mã OTP đặt lại mật khẩu",
    html: `
      <p>Xin chào ${fullName},</p>
      <p>Đây là mã OTP để đặt lại mật khẩu của bạn: <strong>${otp}</strong></p>
      <p>Mã OTP này có hiệu lực trong ${
        process.env.RESET_OTP_TTL_MIN || 10
      } phút.</p>
      <p>Trân trọng,<br>Synopex Auth</p>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email đã được gửi:", info.response);
  } catch (err) {
    console.error("❌ Lỗi khi gửi email:", err);
  }
}
