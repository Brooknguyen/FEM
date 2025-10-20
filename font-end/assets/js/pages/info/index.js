// assets/js/pages/info/index.js
import { renderInfoPage, bindInfoEvents } from "./view.js";

export function renderInfoRoute(path) {
  // chuẩn hóa path: bỏ # hoặc / đầu, cắt phần ?query / #hash
  const cleaned = String(path || "")
    .replace(/^[#\/]+/, "")
    .split(/[?#]/)[0];          // ✅ sửa: [?#]/)[0] thay vì [?#]/[0]

  const segs = cleaned.split("/").filter(Boolean);

  // /info/<SHEET> hoặc /<SHEET>
  let active;
  if ((segs[0] || "").toLowerCase() === "info") {
    active = segs[1] || "THIET_BI";
  } else {
    active = segs[0] || "THIET_BI";
  }

  // nếu có encode (ví dụ "AHU%201") thì decode
  try { active = decodeURIComponent(active); } catch {}

  // render HTML + bind sự kiện load dữ liệu
  const html = renderInfoPage(active);

  // lên lịch bind sau khi DOM đã gắn html vào container của router
  setTimeout(() => bindInfoEvents(active), 0);

  // ✅ Quan trọng: trả về HTML để router chèn vào DOM
  return html;
}
