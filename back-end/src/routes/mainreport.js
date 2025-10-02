// src/routes/mainreport.js
import express from "express";
import MainReport, { makeMainId } from "../models/mainReport.js";

const router = express.Router();

/**
 * GET /api/mainreport
 *  - /api/mainreport?all=true            -> tất cả
 *  - /api/mainreport?date=*              -> tất cả (wildcard)
 *  - /api/mainreport?from=YYYY-MM-DD&to=YYYY-MM-DD -> theo khoảng
 *  - /api/mainreport?date=YYYY-MM-DD     -> theo ngày
 */
router.get("/", async (req, res) => {
  try {
    let { date, all, from, to } = req.query;

    // chuẩn hóa input
    if (date) date = String(date).replace(/\//g, "-");
    if (from) from = String(from).replace(/\//g, "-");
    if (to) to = String(to).replace(/\//g, "-");

    // 1) all=true hoặc date='*' -> lấy tất cả
    if (all === "true" || all === "1" || date === "*") {
      const items = await MainReport.find({}).sort({ date: 1, no: 1 }).lean();
      return res.json({ items });
    }

    // 2) from/to -> theo khoảng (chuỗi YYYY-MM-DD so sánh theo từ điển vẫn đúng)
    if (from && to) {
      const items = await MainReport.find({ date: { $gte: from, $lte: to } })
        .sort({ date: 1, no: 1 })
        .lean();
      return res.json({ from, to, items });
    }

    // 3) theo ngày cụ thể
    if (date) {
      const items = await MainReport.find({ date }).sort({ no: 1 }).lean();
      return res.json({ date, items });
    }

    // 4) thiếu tham số hợp lệ
    return res
      .status(400)
      .json({ error: "Missing date (or use all=true / date=* / from&to)" });
  } catch (e) {
    console.error("[GET /api/mainreport]", e);
    return res.status(500).json({ error: e?.message || "Server error" });
  }
});

/**
 * POST /api/mainreport?date=YYYY-MM-DD
 * Body: { items: [...] }
 * FULL-SYNC theo ngày
 */
router.post("/", async (req, res) => {
  try {
    let { date } = req.query;
    if (!date) return res.status(400).json({ error: "Missing date" });
    date = String(date).replace(/\//g, "-");

    let parsed = req.body.items;
    if (typeof parsed === "string") {
      try {
        parsed = JSON.parse(parsed);
      } catch {
        return res.status(400).json({ error: "Invalid items JSON" });
      }
    }
    if (!Array.isArray(parsed)) {
      return res.status(400).json({ error: "items must be array" });
    }

    const keepIds = [];
    const ops = [];

    for (const it of parsed) {
      const no = Number(it?.no);
      if (!Number.isFinite(no)) continue;

      const _id = makeMainId(date, no);
      keepIds.push(_id);

      const doc = {
        content: String(it?.content ?? ""),
        taskDate: String(it?.date ?? it?.taskDate ?? ""),
        duration: isNaN(parseFloat(it?.duration)) ? 0 : parseFloat(it.duration),
        detail: String(it?.detail ?? ""),
        result: String(it?.result ?? ""),
        person: String(it?.person ?? ""),
        supervisor: String(it?.supervisor ?? ""),
        note: String(it?.note ?? ""),
      };

      ops.push({
        updateOne: {
          filter: { _id },
          update: { $setOnInsert: { _id, date, no }, $set: doc },
          upsert: true,
        },
      });
    }

    if (ops.length) {
      await MainReport.bulkWrite(ops, { ordered: false });
    }
    await MainReport.deleteMany({ date, _id: { $nin: keepIds } });

    return res.json({ ok: true, upserted: ops.length, kept: keepIds.length });
  } catch (e) {
    console.error("[POST /api/mainreport]", e);
    return res.status(500).json({ error: e?.message || "Server error" });
  }
});

/** DELETE /api/mainreport/:no?date=YYYY-MM-DD */
router.delete("/:no", async (req, res) => {
  try {
    let { date } = req.query;
    const no = Number(req.params.no);
    if (!date || !Number.isFinite(no))
      return res.status(400).json({ error: "Missing date or no" });

    date = String(date).replace(/\//g, "-");
    const _id = makeMainId(date, no);
    const r = await MainReport.deleteOne({ _id });
    return res.json({ ok: true, deletedCount: r.deletedCount });
  } catch (e) {
    console.error("[DELETE /api/mainreport/:no]", e);
    return res.status(500).json({ error: e?.message || "Server error" });
  }
});

export default router;
