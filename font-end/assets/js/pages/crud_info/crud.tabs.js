import { CRUD_INFO_TABS } from "./crud.config.js";

export function renderCrudInfoTabs(active) {
  const tab = (k, l) =>
    `<a class="tab ${active === k ? "active" : ""}" href="#/crud_info/${k}">${l}</a>`;

  return `
  <div class="tabs">
    <div class="tabset">
      ${CRUD_INFO_TABS.map((t) => tab(t.key, t.label)).join("")}
    </div>
  </div>`;
}
