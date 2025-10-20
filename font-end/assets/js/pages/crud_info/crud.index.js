// routes/crud.info.route.js (ví dụ)
// Import từ view.js
import { renderCrudInfoPage, bindCrudInfoEvents } from "./crud.view.js";

export function renderCrudInfoRoute(path) {
  // Chuẩn hoá path: bỏ #, / đầu; cắt bỏ query/hash
  const cleaned = String(path || "")
    .replace(/^[#\/]+/, "")
    .split(/[?#]/)[0];

  // Tách segment
  const segs = cleaned.split("/").filter(Boolean);
  let active;
  if (segs[0]?.toLowerCase() === "info") {
    active = segs[1] || "THIET_BI";
  } else {
    active = segs[0] || "THIET_BI";
  }

  // Render HTML
  const html = renderCrudInfoPage(active);

  // Bind sau khi HTML được gắn vào DOM bởi caller
  // (caller gọi: container.innerHTML = renderCrudInfoRoute(location.hash);)
  setTimeout(() => bindCrudInfoEvents(active), 0);

  return html;
}
