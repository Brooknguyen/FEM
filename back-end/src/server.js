import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
dotenv.config();

import { connectDB } from "./db.js";
import authRouter from "./routes/auth.js";
import deviceRouter from "./routes/device.js"; // <-- sửa tên import ở đây
import maintanceRouter from "./routes/maintenance.js";
import { auth } from "./middleware/auth.js";
import recordsRouter from "./routes/records.js";

const app = express();

// --- security & parsers ---
app.use(helmet());
app.use(express.json());

// === CORS: mở cho tất cả origin ===
app.use(cors());
app.options("*", cors());

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
  res.json({ message: "OK", user: req.user });
});

// ví dụ route chỉ admin mới vào
app.get("/api/admin/secret", auth("admin"), (req, res) => {
  res.json({ secret: "only-for-admins", user: req.user });
});

// --- routes ---
app.use("/api/auth", authRouter);

// --- mount toàn bộ router device.js dưới /api/device ---
// Giờ tất cả route: tank, airn2, ahu... sẽ nằm dưới đường dẫn /api/device/...
app.use("/api/device", deviceRouter);

//route maintenance
app.use("/api/maintenance", maintanceRouter);

app.use("/api/records", recordsRouter);

const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI;

connectDB(MONGODB_URI)
  .then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`[API] Listening on 0.0.0.0:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("DB connection failed:", err);
    process.exit(1);
  });
