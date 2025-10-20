// routes/info.js
import express from "express";
import InfoSheet from "../models/InfoSheet.js";
import { normalizeImageCell, deleteLocalByUrl } from "../utils/imageStore.js";

const router = express.Router();

/* ===== Helpers ===== */
function extractImageUrlsFromDevices(devices = []) {
  const set = new Set();
  for (const d of devices) {
    const cell = d?.image;
    if (!cell) continue;
    String(cell)
      .split("|")
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((u) => set.add(u));
  }
  return set;
}

// Tên file trần (không có "/") và có đuôi ảnh
function isBareFilename(s) {
  return (
    typeof s === "string" &&
    !s.includes("/") &&
    /\.(webp|png|jpe?g|gif|svg)$/i.test(s)
  );
}

// Đổi filename trần -> /uploads/<sheet>/<filename> (không tạo file mới)
function upgradeLegacyImageFilenames(devices = [], sheetName = "THIET_BI") {
  return (Array.isArray(devices) ? devices : []).map((d) => {
    if (!d) return d;
    const img = d.image;
    if (!img) return d;
    const parts = String(img)
      .split("|")
      .map((s) => s.trim())
      .filter(Boolean);

    const upgraded = parts.map((p) =>
      isBareFilename(p) ? `/uploads/${sheetName}/${p}` : p
    );
    return { ...d, image: upgraded.join("|") };
  });
}

/* ===== GET tổng hợp danh sách ===== */
router.get("/", async (req, res) => {
  try {
    const name = (req.query.name || "").trim();
    const latest = req.query.latest == "1" || req.query.latest === "true";
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const pageSize = Math.min(
      200,
      Math.max(1, parseInt(req.query.pageSize || "50", 10))
    );

    if (latest && name) {
      const doc = await InfoSheet.findOne({ sheetName: name })
        .sort({ createdAt: -1 })
        .lean();
      if (!doc) return res.status(404).json({ message: "Not found" });

      const devices = upgradeLegacyImageFilenames(
        doc.devices || [],
        doc.sheetName || "THIET_BI"
      );
      return res.json({ ...doc, devices });
    }

    if (latest && !name) {
      const items = await InfoSheet.aggregate([
        { $sort: { createdAt: -1 } },
        { $group: { _id: "$sheetName", doc: { $first: "$$ROOT" } } },
        { $replaceWith: "$doc" },
        { $sort: { sheetName: 1 } },
      ]);
      return res.json({ items });
    }

    if (name) {
      const [items, total] = await Promise.all([
        InfoSheet.find({ sheetName: name })
          .sort({ createdAt: -1 })
          .skip((page - 1) * pageSize)
          .limit(pageSize)
          .lean(),
        InfoSheet.countDocuments({ sheetName: name }),
      ]);
      return res.json({ items, page, pageSize, total });
    }

    const [items, total] = await Promise.all([
      InfoSheet.find({})
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      InfoSheet.countDocuments({}),
    ]);
    return res.json({ items, page, pageSize, total });
  } catch (e) {
    console.error("[GET /api/info]", e);
    res.status(500).json({ message: "Server error" });
  }
});

/* GET /api/info/latest?name=...  */
router.get("/latest", async (req, res) => {
  try {
    const name = req.query.name;
    const query = name ? { sheetName: String(name) } : {};
    const doc = await InfoSheet.findOne(query).sort({ createdAt: -1 }).lean();
    if (!doc) return res.status(404).json({ message: "Not found" });

    // chỉ nâng đường dẫn ảnh để FE xem được
    const devices = upgradeLegacyImageFilenames(
      doc.devices || [],
      doc.sheetName || "THIET_BI"
    );
    return res.json({ ...doc, devices });
  } catch (e) {
    console.error("[GET /api/info/latest]", e);
    res.status(500).json({ message: "Server error" });
  }
});

/* GET /api/info/:index  (index là SỐ) -> trả về device theo index trong doc mới nhất */
router.get(/^\/(\d+)$/, async (req, res) => {
  try {
    const sheetName = (req.query.name || "THIET_BI").trim();
    const index = parseInt(req.params[0], 10);

    const doc = await InfoSheet.findOne({ sheetName })
      .sort({ createdAt: -1 })
      .lean();
    if (!doc || !Array.isArray(doc.devices)) {
      return res.status(404).json({ message: "Sheet not found or empty" });
    }

    const devices = upgradeLegacyImageFilenames(doc.devices, sheetName);
    if (index < 0 || index >= devices.length) {
      return res.status(404).json({ message: `Device ${index} not found` });
    }

    return res.json({ sheetName, index, device: devices[index] });
  } catch (e) {
    console.error("[GET /api/info/:index(NUM)]", e);
    res.status(500).json({ message: "Server error" });
  }
});

/* GET /api/info/:name  -> latest by sheetName (đặt SAU route số) */
router.get("/:name", async (req, res) => {
  try {
    const name = String(req.params.name || "");
    const doc = await InfoSheet.findOne({ sheetName: name })
      .sort({ createdAt: -1 })
      .lean();
    if (!doc) return res.status(404).json({ message: "Not found" });
    const devices = upgradeLegacyImageFilenames(doc.devices || [], name);
    return res.json({ ...doc, devices });
  } catch (e) {
    console.error("[GET /api/info/:name]", e);
    res.status(500).json({ message: "Server error" });
  }
});

/* POST: tạo mới */
router.post("/", async (req, res) => {
  try {
    let { sheetName = "THIET_BI", devices, merged } = req.body || {};
    if (!Array.isArray(devices) || devices.length === 0) {
      return res.status(400).json({ message: "devices is required" });
    }

    // Chuẩn hóa ảnh cho từng device
    for (let i = 0; i < devices.length; i++) {
      const d = devices[i] || {};
      d.image = await normalizeImageCell(d.image, {
        type: sheetName,
        field: "img",
        no: i + 1,
      });
      devices[i] = d;
    }

    const doc = await InfoSheet.create({
      sheetName,
      devices,
      merged: Array.isArray(merged) ? merged : [],
    });

    return res.json({ ok: true, id: doc._id, created: true });
  } catch (e) {
    console.error("[POST /api/info]", e);
    res.status(500).json({ message: e?.message || "Server error" });
  }
});

/* PUT: upsert theo sheetName + dọn ảnh không còn tham chiếu */
router.put("/", async (req, res) => {
  try {
    let { sheetName = "THIET_BI", devices, merged } = req.body || {};
    if (!Array.isArray(devices) || devices.length === 0) {
      return res.status(400).json({ message: "devices is required" });
    }

    for (let i = 0; i < devices.length; i++) {
      const d = devices[i] || {};
      d.image = await normalizeImageCell(d.image, {
        type: sheetName,
        field: "img",
        no: i + 1,
      });
      devices[i] = d;
    }

    let doc = await InfoSheet.findOne({ sheetName });

    if (doc) {
      const oldUrls = extractImageUrlsFromDevices(doc.devices || []);
      const newUrls = extractImageUrlsFromDevices(devices || []);
      const toDelete = [...oldUrls].filter(
        (u) => !newUrls.has(u) && /\/uploads\//.test(u)
      );
      await Promise.allSettled(toDelete.map((u) => deleteLocalByUrl(u)));

      doc.devices = devices;
      doc.merged = Array.isArray(merged) ? merged : [];
      await doc.save();

      return res.json({ ok: true, id: doc._id, replaced: true });
    } else {
      doc = await InfoSheet.create({
        sheetName,
        devices,
        merged: Array.isArray(merged) ? merged : [],
      });
      return res.json({ ok: true, id: doc._id, created: true });
    }
  } catch (e) {
    console.error("[PUT /api/info]", e);
    res.status(500).json({ message: e?.message || "Server error" });
  }
});

/* DELETE theo id + xoá ảnh liên quan */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await InfoSheet.findById(id);
    if (!doc) return res.status(404).json({ message: "Not found" });

    const urls = extractImageUrlsFromDevices(doc.devices || []);
    await Promise.allSettled(
      [...urls]
        .filter((u) => /\/uploads\//.test(u))
        .map((u) => deleteLocalByUrl(u))
    );

    await doc.deleteOne();
    return res.json({ ok: true });
  } catch (e) {
    console.error("[DELETE /api/info/:id]", e);
    res.status(500).json({ message: "Server error" });
  }
});

/* DELETE doc mới nhất theo sheetName (hoặc bất kỳ nếu không truyền name) */
router.delete("/latest", async (req, res) => {
  try {
    const name = req.query.name;
    const query = name ? { sheetName: String(name) } : {};
    const doc = await InfoSheet.findOne(query).sort({ createdAt: -1 });
    if (!doc) return res.status(404).json({ message: "Not found" });

    const urls = extractImageUrlsFromDevices(doc.devices || []);
    await Promise.allSettled(
      [...urls]
        .filter((u) => /\/uploads\//.test(u))
        .map((u) => deleteLocalByUrl(u))
    );

    await doc.deleteOne();
    return res.json({ ok: true });
  } catch (e) {
    console.error("[DELETE /api/info/latest]", e);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
