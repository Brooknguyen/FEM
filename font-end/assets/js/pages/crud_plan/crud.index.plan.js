import { renderCrudPlanPage, bindCrudPlanEvents } from "./crud.view.plan.js";
import { CRUD_PLAN_KEYS } from "./crud.config.plan.js";

export function renderCrudPlanRoute(path) {
  const cleaned = String(path || "")
    .replace(/^#?\/?/, "")
    .split(/[?#]/)[0];

  const segs = cleaned.split("/").filter(Boolean);
  const candidate = segs[1] || "electric"; // "crud_info/<tab>"
  const active = CRUD_PLAN_KEYS.has(candidate) ? candidate : "electric";

  setTimeout(() => bindCrudPlanEvents(active), 0);
  return renderCrudPlanPage(active);
}
