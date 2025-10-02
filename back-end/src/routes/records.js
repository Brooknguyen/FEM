//Lịch sử thay thế OA filter
import express from "express";
import multer from "multer";
import sharp from "sharp";
import path from "path";
import fs from "fs";
import ReportFilter from "../models/filterReport.js";

const router = express.Router();

const UPLOAD_DIR =
  process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({ storage: multer.memoryStorage() });

function urlToFilePath(url) {
  try {
    let pathname = url || "";
    if (/^https?:\/\//i.test(pathname)) pathname = new URL(pathname).pathname;
    // pathname: /uploads/TYPE/DATE/FILE
    const rel = pathname.replace(/^\/?uploads[\/\\]?/, "");
    return path.join(UPLOAD_DIR, rel);
  } catch {
    return "";
  }
}
async function deleteFileByUrl(url) {
  const full = urlToFilePath(url);
  if (!full) return;
  try {
    await fs.promises.unlink(full);
  } catch (_) {
    /* ignore */
  }
}

async function saveCompressedImage(
  buffer,
  { type, date, field, no, originalName }
) {
  const safeDate = String(date || "").replace(/\//g, "-");
  const folder = path.join(UPLOAD_DIR, type, safeDate);
  fs.mkdirSync(folder, { recursive: true });

  const filename = `${Date.now()}-${field}-${no}.webp`;
  const fullPath = path.join(folder, filename);

  try {
    await sharp(buffer)
      .rotate()
      .resize({
        width: 1600,
        height: 1600,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 70 })
      .toFile(fullPath);
    const baseUrl = process.env.BASE_URL || "";
    const urlPath = `/uploads/${type}/${safeDate}/${filename}`;
    return baseUrl ? `${baseUrl}${urlPath}` : urlPath;
  } catch (err) {
    // fallback raw
    const ext = (originalName && path.extname(originalName)) || ".bin";
    const rawName = `${Date.now()}-${field}-${no}${ext}`;
    await fs.promises.writeFile(path.join(folder, rawName), buffer);
    const baseUrl = process.env.BASE_URL || "";
    const urlPath = `/uploads/${type}/${safeDate}/${rawName}`;
    return baseUrl ? `${baseUrl}${urlPath}` : urlPath;
  }
}

// GET /api/records/:type?date=YYYY-MM-DD
router.get("/:type", async (req, res) => {
  try {
    const { type } = req.params;
    let { date } = req.query;
    if (!date) return res.status(400).json({ error: "Missing date" });
    date = String(date).replace(/\//g, "-");

    const items = await ReportFilter.find({ type, date })
      .sort({ no: 1 })
      .lean();
    return res.json({ type, date, items });
  } catch (e) {
    console.error("[GET /api/records/:type]", e);
    return res.status(500).json({ error: e?.message || "Server error" });
  }
});

// POST /api/records/:type?date=YYYY-MM-DD
router.post("/:type", upload.any(), async (req, res) => {
  try {
    const { type } = req.params;
    let { date } = req.query;
    if (!date) return res.status(400).json({ error: "Missing date" });
    date = String(date).replace(/\//g, "-");

    // Parse items
    let parsed = [];
    try {
      parsed = JSON.parse(req.body.items || "[]");
      if (!Array.isArray(parsed)) throw new Error("items must be array");
    } catch {
      return res.status(400).json({ error: "Invalid items JSON" });
    }

    // Map files
    const fileMap = new Map();
    for (const f of req.files || []) fileMap.set(f.fieldname, f);

    // Load existing docs once
    const nos = parsed
      .map((it) => Number(it.no))
      .filter((n) => Number.isFinite(n));
    const existingDocs = await ReportFilter.find({
      type,
      date,
      no: { $in: nos },
    }).lean();
    const existByNo = new Map(existingDocs.map((d) => [d.no, d]));

    // Build bulk ops
    const ops = [];

    for (const it of parsed) {
      const no = Number(it.no);
      if (!Number.isFinite(no)) continue;

      const exists = existByNo.get(no);
      const beforeFile =
        fileMap.get(`before-${no}`) ||
        fileMap.get(`file-${no}-pictureBefore`) ||
        fileMap.get(`file-${no - 1}-pictureBefore`);

      const afterFile =
        fileMap.get(`after-${no}`) ||
        fileMap.get(`file-${no}-pictureAfter`) ||
        fileMap.get(`file-${no - 1}-pictureAfter`);

      let pictureBeforeUrl, pictureAfterUrl;

      // Nếu upload file mới -> lưu & xoá file cũ (nếu có)
      if (beforeFile?.buffer) {
        pictureBeforeUrl = await saveCompressedImage(beforeFile.buffer, {
          type,
          date,
          field: "before",
          no,
          originalName: beforeFile.originalname,
        });
        if (exists?.pictureBeforeUrl)
          await deleteFileByUrl(exists.pictureBeforeUrl);
      }
      if (afterFile?.buffer) {
        pictureAfterUrl = await saveCompressedImage(afterFile.buffer, {
          type,
          date,
          field: "after",
          no,
          originalName: afterFile.originalname,
        });
        if (exists?.pictureAfterUrl)
          await deleteFileByUrl(exists.pictureAfterUrl);
      }

      // Nếu người dùng bấm xoá ảnh (removeBefore/removeAfter)
      if (!beforeFile && it.removeBefore && exists?.pictureBeforeUrl) {
        await deleteFileByUrl(exists.pictureBeforeUrl);
        pictureBeforeUrl = ""; // ghi rỗng DB
      }
      if (!afterFile && it.removeAfter && exists?.pictureAfterUrl) {
        await deleteFileByUrl(exists.pictureAfterUrl);
        pictureAfterUrl = ""; // ghi rỗng DB
      }

      const $set = {
        machineName: it.machineName ?? "",
        room: it.room ?? "",
        content: it.content ?? "",
        result: it.result ?? "OK",
        personInCharge: it.personInCharge ?? "",
      };
      if (pictureBeforeUrl !== undefined)
        $set.pictureBeforeUrl = pictureBeforeUrl;
      if (pictureAfterUrl !== undefined) $set.pictureAfterUrl = pictureAfterUrl;

      ops.push({
        updateOne: {
          filter: { type, date, no },
          update: { $setOnInsert: { type, date, no }, $set },
          upsert: true,
        },
      });
    }

    if (ops.length) await ReportFilter.bulkWrite(ops, { ordered: false });
    return res.json({ ok: true });
  } catch (e) {
    console.error("[POST /api/records/:type]", e);
    const msg =
      (e?.code === 11000 && "Duplicate key (type,date,no).") ||
      e?.message ||
      "Server error";
    return res.status(500).json({ error: msg });
  }
});

export default router;
