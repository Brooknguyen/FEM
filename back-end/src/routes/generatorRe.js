// src/routes/generatorRe.js
import express from "express";
import GeneratorReport from "../models/generator.js";
// import { auth } from "../middleware/auth.js";

const router = express.Router();

function normalizeDateStr(s) {
  if (!s || typeof s !== "string") return null;
  const t = s.trim();
  const parts = t.includes("/") ? t.split("/") : t.split("-");
  if (parts.length !== 3) return null;
  const [y, m, d] = parts;
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(
    d
  ).padStart(2, "0")}`;
}
function toNumOrNull(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function sanitizeItem(raw, dateKey) {
  return {
    date: raw.date ? normalizeDateStr(raw.date) : dateKey,
    time: (raw.time || "").trim(),
    person: (raw.person || "").trim(),
    content: (raw.content || "").trim(),
    engineSpeed: toNumOrNull(raw.engineSpeed),
    voltageRS: toNumOrNull(raw.voltageRS),
    voltageST: toNumOrNull(raw.voltageST),
    voltageTR: toNumOrNull(raw.voltageTR),
    loadKW: toNumOrNull(raw.loadKW),
    loadPercent: toNumOrNull(raw.loadPercent),
    frequency: toNumOrNull(raw.frequency),
    coolantTemp: toNumOrNull(raw.coolantTemp),
    oilPressure: toNumOrNull(raw.oilPressure),
    oilUsage: toNumOrNull(raw.oilUsage),
    engineRuntime: (raw.engineRuntime || "").trim(),
    note: (raw.note || "").trim(),
  };
}

/** ============== READ ============== */
// GET /api/generator?date=YYYY-MM-DD   |   GET /api/generator?all=true[&days=90]
router.get(
  "/",
  /*auth(),*/ async (req, res) => {
    try {
      const { date, all, days } = req.query;

      if (all === "true") {
        const maxDays = Math.min(Number(days) || 90, 365);
        const since = new Date(Date.now() - maxDays * 24 * 3600 * 1000);
        const sinceKey = since.toISOString().slice(0, 10);

        const docs = await GeneratorReport.find({ dateKey: { $gte: sinceKey } })
          .sort({ dateKey: 1 })
          .lean();

        const flat = [];
        for (const doc of docs) {
          for (const it of doc.items || []) {
            flat.push({ ...it, date: it.date || doc.dateKey });
          }
        }
        return res.json({ items: flat });
      }

      const dateKey = normalizeDateStr(date);
      if (!dateKey) return res.status(400).json({ error: "Thiếu/sai ?date" });

      const doc = await GeneratorReport.findOne({ dateKey }).lean();
      return res.json({ items: doc?.items || [] });
    } catch (err) {
      console.error("[generator][GET] error:", err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

/** ============== REPLACE (tương thích submit hiện tại) ============== */
// POST /api/generator?date=YYYY-MM-DD   body:{items:[...]}
router.post(
  "/",
  /*auth(),*/ async (req, res) => {
    try {
      const dateKey = normalizeDateStr(req.query.date);
      if (!dateKey) return res.status(400).json({ error: "Thiếu/sai ?date" });

      const itemsRaw = Array.isArray(req.body?.items) ? req.body.items : null;
      if (!itemsRaw)
        return res.status(400).json({ error: "Body {items:[]} thiếu" });

      const items = itemsRaw.map((x) => sanitizeItem(x, dateKey));
      const doc = await GeneratorReport.findOneAndUpdate(
        { dateKey },
        { $set: { items } },
        { upsert: true, new: true }
      ).lean();

      res.json({ ok: true, dateKey: doc.dateKey, count: doc.items.length });
    } catch (err) {
      console.error("[generator][POST replace] error:", err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

/** ============== APPEND 1 ITEM ============== */
// POST /api/generator/items?date=YYYY-MM-DD   body:{...item}
router.post(
  "/items",
  /*auth(),*/ async (req, res) => {
    try {
      const dateKey = normalizeDateStr(req.query.date);
      if (!dateKey) return res.status(400).json({ error: "Thiếu/sai ?date" });

      const payload = sanitizeItem(req.body || {}, dateKey);
      const doc = await GeneratorReport.findOneAndUpdate(
        { dateKey },
        { $push: { items: payload } },
        { upsert: true, new: true }
      );
      res.json({ ok: true, item: doc.items[doc.items.length - 1] });
    } catch (err) {
      console.error("[generator][POST item] error:", err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

/** ============== UPDATE 1 ITEM ============== */
// PUT /api/generator/:dateKey/items/:itemId
router.put(
  "/:dateKey/items/:itemId",
  /*auth(),*/ async (req, res) => {
    try {
      const dateKey = normalizeDateStr(req.params.dateKey);
      const { itemId } = req.params;
      if (!dateKey || !itemId)
        return res.status(400).json({ error: "Thiếu dateKey/itemId" });

      const payload = sanitizeItem(req.body || {}, dateKey);
      const setExpr = {};
      for (const [k, v] of Object.entries(payload)) {
        if (v !== undefined) setExpr[`items.$.${k}`] = v;
      }

      const updated = await GeneratorReport.findOneAndUpdate(
        { dateKey, "items._id": itemId },
        { $set: setExpr },
        { new: true }
      ).lean();

      if (!updated)
        return res.status(404).json({ error: "Không tìm thấy item" });
      const item = updated.items.find(
        (it) => String(it._id) === String(itemId)
      );
      res.json({ ok: true, item });
    } catch (err) {
      console.error("[generator][PUT item] error:", err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

/** ============== DELETE 1 ITEM ============== */
// DELETE /api/generator/:dateKey/items/:itemId
router.delete(
  "/:dateKey/items/:itemId",
  /*auth(),*/ async (req, res) => {
    try {
      const dateKey = normalizeDateStr(req.params.dateKey);
      const { itemId } = req.params;
      if (!dateKey || !itemId)
        return res.status(400).json({ error: "Thiếu dateKey/itemId" });

      const updated = await GeneratorReport.findOneAndUpdate(
        { dateKey },
        { $pull: { items: { _id: itemId } } },
        { new: true }
      ).lean();

      if (!updated)
        return res.status(404).json({ error: "Không tìm thấy ngày" });
      res.json({ ok: true, remaining: updated.items.length });
    } catch (err) {
      console.error("[generator][DELETE item] error:", err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

/** ============== DELETE CẢ NGÀY ============== */
// DELETE /api/generator/:dateKey
router.delete(
  "/:dateKey",
  /*auth(),*/ async (req, res) => {
    try {
      const dateKey = normalizeDateStr(req.params.dateKey);
      if (!dateKey)
        return res.status(400).json({ error: "Sai định dạng dateKey" });

      const result = await GeneratorReport.deleteOne({ dateKey });
      res.json({ ok: true, deleted: result.deletedCount || 0 });
    } catch (err) {
      console.error("[generator][DELETE day] error:", err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

export default router;
