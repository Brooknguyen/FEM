// assets/js/pages/info/indexplan.js
import { renderPlanPage, bindPlanEvents } from "./view_plan.js";
import { PLAN_KEYS } from "./config_plan.js";

export function renderPlanRoute(path) {
  const tab = path.split("/")[2] || "air";
  const active = PLAN_KEYS.has(tab) ? tab : "air";

  // Bind sau khi DOM cập nhật
  setTimeout(() => bindPlanEvents(active), 0);

  return renderPlanPage(active);
}
