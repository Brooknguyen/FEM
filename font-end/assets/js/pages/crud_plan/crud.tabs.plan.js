import { CRUD_PLAN_TABS } from "./crud.config.plan.js";

export function renderCrudPlanTabs(active) {
  const tab = (k, l) =>
    `<a class="tab ${
      active === k ? "active" : ""
    }" href="#/crud_plan/${k}">${l}</a>`;

  return `
  <div class="tabs">
    <div class="tabset">
      ${CRUD_PLAN_TABS.map((t) => tab(t.key, t.label)).join("")}
    </div>
  </div>`;
}
