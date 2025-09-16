// test-mail.js
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

(async () => {
  try {
    const info = await transporter.sendMail({
      from: `"Test Sender" <${process.env.MAIL_USER}>`,
      to: "nguyenbrook0412@gmail.com", // email người nhận test
      subject: "Test Mail",
      text: "This is a test email from nodemailer",
    });
    console.log("✅ Sent:", info.messageId);
  } catch (err) {
    console.error("❌ MAIL FAIL:", err);
  }
})();
