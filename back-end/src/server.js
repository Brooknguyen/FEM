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
import deviceRouter from "./routes/device.js";
import maintanceRouter from "./routes/maintenance.js";
import { auth } from "./middleware/auth.js";
import recordsRouter from "./routes/records.js";
import mainreportRouter from "./routes/mainreport.js";
import inspectionReportRouter from "./routes/inspectionreport.js";
import generatorRouter from "./routes/generatorRe.js"

// Kanban (REST) + Socket handlers
import kanbanRouter from "./routes/kanban.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

/** -------- Security / basics -------- */
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
  })
);
app.use(express.json());

// CORS (một lần duy nhất)
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "*";
app.use(
  cors({
    origin: CLIENT_ORIGIN === "*" ? true : CLIENT_ORIGIN.split(","),
    credentials: true,
  })
);

app.set("trust proxy", 1);

// Rate limit (một lần duy nhất)
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

/** -------- Health check + sample -------- */
app.get("/health", (_, res) => res.json({ ok: true }));
app.get("/api/profile", auth(), (req, res) =>
  res.json({ message: "OK", user: req.user })
);
app.get("/api/admin/secret", auth("admin"), (req, res) =>
  res.json({ secret: "only-for-admins", user: req.user })
);

/** -------- Routers -------- */
// Login
app.use("/api/auth", authRouter);
// Thông tin máy
app.use("/api/device", deviceRouter);
// Kế hoạch bảo dưỡng theo năm
app.use("/api/maintenance", maintanceRouter);
// Thay filter OA AHU hằng ngày
app.use("/api/records", recordsRouter);
// Lịch sử bảo dưỡng máy
app.use("/api/mainreport", mainreportRouter);
// Kiểm tra bảo dưỡng máy hàng tháng
app.use("/api/device-inspection", inspectionReportRouter);
// Kanban (board + comments REST)
app.use("/api/kanban", kanbanRouter);
// Kanban (history REST)

//History of operate generator
app.use("/api/generator", generatorRouter);


/** -------- Static uploads -------- */
const UPLOAD_DIR =
  process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
app.use(
  "/uploads",
  (req, res, next) => {
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

    // Tạo HTTP server rồi attach Socket.IO
    const httpServer = createServer(app);

    const io = new IOServer(httpServer, {
      cors: {
        origin: CLIENT_ORIGIN === "*" ? true : CLIENT_ORIGIN.split(","),
        credentials: true,
      },
    });

    // Khởi tạo namespace/handlers cho comment realtime
    initCommentSockets(io);

    httpServer.listen(PORT, "0.0.0.0", () => {
      console.log(`[API] Listening on 0.0.0.0:${PORT}`);
      console.log(`[API] Static uploads at /uploads -> ${UPLOAD_DIR}`);
      console.log(`[Socket] Ready`);
    });
  } catch (err) {
    console.error("DB connection failed:", err);
    process.exit(1);
  }
})();
