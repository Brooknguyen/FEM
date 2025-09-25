import express from "express";
import {
  TankSheet,
  AirN2Sheet,
  HighPressureSheet,
  AhuSheet,
  WaterChillerSheet,
  ExhaustFanSheet,
  ACUSheet,
  SummarySheet,
} from "../models/InfoSheet.js";

const router = express.Router();

function esc(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Hàm tạo router cho từng model, tránh lặp code
function createSheetRouter(model, basePath) {
  const r = express.Router();

  // POST upsert
  r.post("/", async (req, res) => {
    try {
      const { sheetName, rows, merges } = req.body;
      if (!sheetName || !Array.isArray(rows)) {
        return res
          .status(400)
          .json({ message: "sheetName và rows là bắt buộc" });
      }
      const doc = await model.findOneAndUpdate(
        { sheetName },
        { sheetName, rows, merges: merges || [] },
        { upsert: true, new: true }
      );
      res
        .status(200)
        .json({ id: doc._id, message: "Đã lưu (insert/update)", sheet: doc });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Lỗi lưu dữ liệu" });
    }
  });

  // GET latest document (bản mới nhất bất kỳ)
  r.get("/latest", async (req, res) => {
    try {
      const doc = await model.findOne({}).sort({ updatedAt: -1 }).lean();
      if (!doc) return res.status(404).json({ message: "Không tìm thấy" });
      res.json(doc);
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Lỗi truy vấn dữ liệu" });
    }
  });

  // GET latest theo sheetName (ignore case + trim)
  r.get("/:sheetName/latest", async (req, res) => {
    try {
      const raw = (req.params.sheetName || "").trim();
      const doc = await model
        .findOne({ sheetName: { $regex: `^${esc(raw)}$`, $options: "i" } })
        .sort({ updatedAt: -1 })
        .lean();

      if (!doc) return res.status(404).json({ message: "Không tìm thấy" });
      res.json(doc);
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Lỗi truy vấn dữ liệu" });
    }
  });

  return r;
}

// Tạo router cho từng loại sheet
router.use("/tank", createSheetRouter(TankSheet, "tank"));
router.use("/airn2", createSheetRouter(AirN2Sheet, "airn2"));
router.use(
  "/highpressure",
  createSheetRouter(HighPressureSheet, "highpressure")
);
router.use("/ahu", createSheetRouter(AhuSheet, "ahu"));
router.use(
  "/waterchiller",
  createSheetRouter(WaterChillerSheet, "waterchiller")
);
router.use("/exhaustfan", createSheetRouter(ExhaustFanSheet, "exhaustfan"));
router.use("/acu", createSheetRouter(ACUSheet, "acu"));
router.use("/summary", createSheetRouter(SummarySheet, "summmary"))

export default router;
