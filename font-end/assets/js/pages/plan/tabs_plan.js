// assets/js/pages/info/tabsPlan.js
import { PLAN_TABS } from "./config_plan.js";

export function renderPlanTabs(active) {
  const tab = (k, l) =>
    `<a class="tab ${
      active === k ? "active" : ""
    }" href="#/plan/${k}">${l}</a>`;

  return `
  <div class="tabs">
    <div class="tabset">
      ${PLAN_TABS.map((t) => tab(t.key, t.label)).join("")}
    </div>
  </div>`;
}
