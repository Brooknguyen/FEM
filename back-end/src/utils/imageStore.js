// utils/imageStore.js
import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import sharp from "sharp";

/* Dùng đường dẫn tuyệt đối cho UPLOAD_DIR */
export const UPLOAD_DIR = path.resolve(
  process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads")
);
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const DATAURL_RE = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i;

export async function saveImageBuffer(
  buffer,
  { type = "THIET_BI", field = "img", no = 0 } = {}
) {
  // Lưu vào /uploads/<type>/<filename> (không có date)
  const folder = path.join(UPLOAD_DIR, type);
  await fsp.mkdir(folder, { recursive: true });

  const filename = `${Date.now()}-${field}-${no}.webp`;
  const full = path.join(folder, filename);

  try {
    await sharp(buffer)
      .rotate()
      .resize({
        width: 1600,
        height: 1600,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 72 })
      .toFile(full);
  } catch (err) {
    console.error(
      "Sharp processing failed, fallback to raw buffer write: ",
      err
    );
    await fsp.writeFile(full, buffer);
  }

  const baseUrl = (process.env.BASE_URL || "").replace(/\/+$/, "");
  const urlPath = `/uploads/${type}/${filename}`;
  return baseUrl ? baseUrl + urlPath : urlPath;
}

export async function dataUrlToUrl(dataUrl, opts = {}) {
  const m = DATAURL_RE.exec(dataUrl || "");
  if (!m) return null;
  const buf = Buffer.from(m[2], "base64");
  return saveImageBuffer(buf, opts);
}

export async function normalizeImageCell(value, opts = {}) {
  if (!value) return "";
  const parts = String(value)
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
  const out = [];
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (DATAURL_RE.test(p)) {
      const url = await dataUrlToUrl(p, { ...opts, no: i + 1 });
      if (url) out.push(url);
    } else {
      out.push(p);
    }
  }
  return out.join("|");
}

/* Map URL -> local path an toàn (kể cả URL tuyệt đối) */
export function urlToLocalPath(url) {
  try {
    let u = String(url || "");
    if (/^https?:\/\//i.test(u)) {
      try {
        u = new URL(u).pathname;
      } catch {}
    }
    u = decodeURIComponent(u);
    const m = u.match(/\/uploads\/(.+)$/i);
    if (!m) return null;
    const rel = m[1].replace(/^[/\\]+/, "");
    const full = path.normalize(path.join(UPLOAD_DIR, rel));
    if (!full.startsWith(UPLOAD_DIR + path.sep) && full !== UPLOAD_DIR) {
      return null;
    }
    return full;
  } catch {
    return null;
  }
}

export async function deleteLocalByUrl(url) {
  const full = urlToLocalPath(url);
  if (!full) return;
  try {
    await fsp.unlink(full);
  } catch (e) {
    if (e?.code === "ENOENT") return; // đã không tồn tại
    console.error(`Failed to delete file at ${full}:`, e);
  }
}
