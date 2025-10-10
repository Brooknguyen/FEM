// src/routes/inspectionreport.js
import express from "express";
import InspectionReport, {
  makeInspectionId,
} from "../models/inspectionReport.js";

const router = express.Router();

/**
 * GET /api/device-inspection
 *  - ?all=true                  -> tất cả
 *  - ?date=*                    -> tất cả (wildcard)
 *  - ?from=YYYY-MM-DD&to=YYYY-MM-DD -> theo khoảng
 *  - ?date=YYYY-MM-DD           -> theo ngày
 */
router.get("/", async (req, res) => {
  try {
    let { date, all, from, to } = req.query;
    if (date) date = String(date).replace(/\//g, "-");
    if (from) from = String(from).replace(/\//g, "-");
    if (to) to = String(to).replace(/\//g, "-");

    if (all === "true" || all === "1" || date === "*") {
      const items = await InspectionReport.find({})
        .sort({ date: 1, no: 1 })
        .lean();
      return res.json({ items });
    }

    if (from && to) {
      const items = await InspectionReport.find({
        date: { $gte: from, $lte: to },
      })
        .sort({ date: 1, no: 1 })
        .lean();
      return res.json({ from, to, items });
    }

    if (date) {
      const items = await InspectionReport.find({ date })
        .sort({ no: 1 })
        .lean();
      return res.json({ date, items });
    }

    return res
      .status(400)
      .json({ error: "Missing date (or use all=true / date=* / from&to)" });
  } catch (e) {
    console.error("[GET /api/device-inspection]", e);
    return res.status(500).json({ error: e?.message || "Server error" });
  }
});

/**
 * POST /api/device-inspection?date=YYYY-MM-DD
 * Body: { items: [{ no, name, date, checker, issue }] }
 * FULL-SYNC theo ngày (giống mainreport)
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

      const _id = makeInspectionId(date, no);
      keepIds.push(_id);

      // Chuẩn hoá theo FE: it.date (#Ngày từng dòng) map vào checkDate
      const doc = {
        name: String(it?.name ?? it?.deviceName ?? ""),
        checker: String(it?.checker ?? it?.person ?? ""),
        issue: String(it?.issue ?? it?.problem ?? ""),
        checkDate: String(it?.date ?? it?.checkDate ?? ""),
      };

      ops.push({
        updateOne: {
          filter: { _id },
          update: { $setOnInsert: { _id, date, no }, $set: doc },
          upsert: true,
        },
      });
    }

    if (ops.length) await InspectionReport.bulkWrite(ops, { ordered: false });
    await InspectionReport.deleteMany({ date, _id: { $nin: keepIds } });

    return res.json({ ok: true, upserted: ops.length, kept: keepIds.length });
  } catch (e) {
    console.error("[POST /api/device-inspection]", e);
    return res.status(500).json({ error: e?.message || "Server error" });
  }
});

/** DELETE /api/device-inspection/:no?date=YYYY-MM-DD */
router.delete("/:no", async (req, res) => {
  try {
    let { date } = req.query;
    const no = Number(req.params.no);
    if (!date || !Number.isFinite(no))
      return res.status(400).json({ error: "Missing date or no" });

    date = String(date).replace(/\//g, "-");
    const _id = makeInspectionId(date, no);
    const r = await InspectionReport.deleteOne({ _id });
    return res.json({ ok: true, deletedCount: r.deletedCount });
  } catch (e) {
    console.error("[DELETE /api/device-inspection/:no]", e);
    return res.status(500).json({ error: e?.message || "Server error" });
  }
});

export default router;
