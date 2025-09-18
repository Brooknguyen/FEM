import { renderCrudInfoPage, bindCrudInfoEvents } from "./crud.view.js";
import { CRUD_INFO_KEYS } from "./crud.config.js";

export function renderCrudInfoRoute(path) {
  const cleaned = String(path || "")
    .replace(/^#?\/?/, "")
    .split(/[?#]/)[0];

  const segs = cleaned.split("/").filter(Boolean);
  const candidate = segs[1] || "air"; // "crud_info/<tab>"
  const active = CRUD_INFO_KEYS.has(candidate) ? candidate : "air";

  setTimeout(() => bindCrudInfoEvents(active), 0);
  return renderCrudInfoPage(active);
}
