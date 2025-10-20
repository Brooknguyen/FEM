// src/server.js
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
dotenv.config();
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { Server as IOServer } from "socket.io";
import { initCommentSockets } from "./sockets/comment.js";

import { connectDB } from "./db.js";

import authRouter from "./routes/auth.js";
import infoRouter from "./routes/info.js";
import maintanceRouter from "./routes/maintenance.js";
import { auth } from "./middleware/auth.js";
import recordsRouter from "./routes/records.js";
import mainreportRouter from "./routes/mainreport.js";
import inspectionReportRouter from "./routes/inspectionreport.js";
import generatorRouter from "./routes/generatorRe.js";

// Kanban (REST) + Socket handlers
import kanbanRouter from "./routes/kanban.js";
// import InfoSheet from "./models/InfoSheet.js"; // không cần ở server.js

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

/** -------- BASE_URL & UPLOAD_DIR (Cách B) -------- */
// Dùng IP/port BE của bạn làm mặc định nếu .env không có
const BASE_URL = (process.env.BASE_URL || "http://10.100.201.25:4000").replace(
  /\/+$/,
  ""
);
// Nhét lại vào env để utils/routes có thể lấy được
process.env.BASE_URL = BASE_URL;

// Dùng đường dẫn tuyệt đối cho uploads
const UPLOAD_DIR = path.resolve(
  process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads")
);

/** -------- Security / basics -------- */
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }, // cho phép tải ảnh từ domain khác
    crossOriginEmbedderPolicy: false,
  })
);

// tăng limit vì bạn post AOA + dataURL ảnh
app.use(express.json({ limit: "200mb" }));
app.use(express.urlencoded({ extended: true, limit: "200mb" }));

// CORS
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "*";
app.use(
  cors({
    origin: CLIENT_ORIGIN === "*" ? true : CLIENT_ORIGIN.split(","),
    credentials: true,
  })
);

app.set("trust proxy", 1);

// Rate limit
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

/** -------- Health check + sample -------- */
app.get("/health", (_, res) =>
  res.json({
    ok: true,
    BASE_URL,
    UPLOAD_DIR,
  })
);
app.get("/api/profile", auth(), (req, res) =>
  res.json({ message: "OK", user: req.user })
);
app.get("/api/admin/secret", auth("admin"), (req, res) =>
  res.json({ secret: "only-for-admins", user: req.user })
);

/** -------- Routers -------- */
app.use("/api/auth", authRouter);
app.use("/api/info", infoRouter);
app.use("/api/maintenance", maintanceRouter);
app.use("/api/records", recordsRouter);
app.use("/api/mainreport", mainreportRouter);
app.use("/api/device-inspection", inspectionReportRouter);
app.use("/api/kanban", kanbanRouter);
app.use("/api/generator", generatorRouter);

/** -------- Static uploads -------- */
app.use(
  "/uploads",
  (req, res, next) => {
    // cho phép mọi origin load ảnh
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("Access-Control-Allow-Origin", "*");
    next();
  },
  express.static(UPLOAD_DIR)
);

/** -------- Start HTTP + Socket.IO -------- */
const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI;

(async () => {
  try {
    await connectDB(MONGODB_URI);

    const httpServer = createServer(app);

    const io = new IOServer(httpServer, {
      cors: {
        origin: CLIENT_ORIGIN === "*" ? true : CLIENT_ORIGIN.split(","),
        credentials: true,
      },
    });

    initCommentSockets(io);

    httpServer.listen(PORT, "0.0.0.0", () => {
      console.log(`[API] Listening on 0.0.0.0:${PORT}`);
      console.log(`[API] BASE_URL = ${BASE_URL}`);
      console.log(
        `[API] Static uploads at ${BASE_URL}/uploads -> ${UPLOAD_DIR}`
      );
      console.log(`[Socket] Ready`);
    });
  } catch (err) {
    console.error("DB connection failed:", err);
    process.exit(1);
  }
})();
