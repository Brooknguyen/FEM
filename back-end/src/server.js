// server.js
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
dotenv.config();
import path from "path";

import { connectDB } from "./db.js";
import authRouter from "./routes/auth.js";
import deviceRouter from "./routes/device.js";
import maintanceRouter from "./routes/maintenance.js";
import { auth } from "./middleware/auth.js";
import recordsRouter from "./routes/records.js";

const app = express();

// ✅ Helmet: cho phép cross-origin resource cho ảnh, tắt COEP
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
  })
);

app.use(express.json());

// CORS
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

// Health & sample routes ...
app.get("/health", (_, res) => res.json({ ok: true }));
app.get("/api/profile", auth(), (req, res) =>
  res.json({ message: "OK", user: req.user })
);
app.get("/api/admin/secret", auth("admin"), (req, res) =>
  res.json({ secret: "only-for-admins", user: req.user })
);

app.use("/api/auth", authRouter);
app.use("/api/device", deviceRouter);
app.use("/api/maintenance", maintanceRouter);
app.use("/api/records", recordsRouter);

// ✅ Static /uploads: đặt CORP= cross-origin (phòng khi proxy khác chèn header)
const UPLOAD_DIR =
  process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
app.use(
  "/uploads",
  (req, res, next) => {
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("Access-Control-Allow-Origin", "*"); // không bắt buộc cho <img>, nhưng an toàn
    next();
  },
  express.static(UPLOAD_DIR)
);

const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI;

connectDB(MONGODB_URI)
  .then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`[API] Listening on 0.0.0.0:${PORT}`);
      console.log(`[API] Static uploads at /uploads -> ${UPLOAD_DIR}`);
    });
  })
  .catch((err) => {
    console.error("DB connection failed:", err);
    process.exit(1);
  });
