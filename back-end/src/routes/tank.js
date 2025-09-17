// routes/tank.js
import express from "express";
import TankSheet from "../models/TankSheet.js";
const router = express.Router();

function esc(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// POST upsert (giữ nguyên)
router.post("/", async (req, res) => {
  try {
    const { sheetName, rows, merges } = req.body;
    if (!sheetName || !Array.isArray(rows)) {
      return res.status(400).json({ message: "sheetName và rows là bắt buộc" });
    }
    const doc = await TankSheet.findOneAndUpdate(
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

// ✅ ĐỂ TRƯỚC: lấy bản mới nhất bất kỳ
router.get("/latest", async (req, res) => {
  const doc = await TankSheet.findOne({}).sort({ updatedAt: -1 }).lean();
  if (!doc) return res.status(404).json({ message: "Không tìm thấy" });
  res.json(doc);
});

// ✅ SAU ĐÓ: lấy mới nhất theo tên (không phân biệt hoa/thường, có khoảng trắng)
router.get("/:sheetName/latest", async (req, res) => {
  const raw = (req.params.sheetName || "").trim();
  const doc = await TankSheet.findOne({
    sheetName: { $regex: `^${esc(raw)}$`, $options: "i" },
  })
    .sort({ updatedAt: -1 })
    .lean();

  if (!doc) return res.status(404).json({ message: "Không tìm thấy" });
  res.json(doc);
});

export default router;
