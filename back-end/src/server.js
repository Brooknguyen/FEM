import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
dotenv.config();

import { connectDB } from "./db.js";
import authRouter from "./routes/auth.js";
import { auth } from "./middleware/auth.js";

const app = express();

// --- security & parsers ---
app.use(helmet());
app.use(express.json());

// === CORS: mở cho tất cả origin ===
app.use(cors()); // -> Access-Control-Allow-Origin: *
app.options("*", cors()); // -> cho phép preflight OPTIONS mọi route

app.set("trust proxy", 1);
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// --- health ---
app.get("/health", (_, res) => res.json({ ok: true }));

// ví dụ route cần xác thực (đính kèm role, expires trong JWT)
app.get("/api/profile", auth(), (req, res) => {
  res.json({ message: "OK", user: req.user }); // { sub, code, role, iat, exp }
});

// ví dụ route chỉ admin mới vào
app.get("/api/admin/secret", auth("admin"), (req, res) => {
  res.json({ secret: "only-for-admins", user: req.user });
});




// --- routes ---
app.use("/api/auth", authRouter);
// --- start ---
const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI;

connectDB(MONGODB_URI)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`[API] Listening on :${PORT}`);
    });
  })
  .catch((err) => {
    console.error("DB connection failed:", err);
    process.exit(1);
  });
