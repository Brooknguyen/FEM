// assets/js/pages/info/tabs.js
import { INFO_TABS } from "./config.js";

export function renderInfoTabs(active) {
  const tab = (k, l) =>
    `<a class="tab ${
      active === k ? "active" : ""
    }" href="#/info/${k}">${l}</a>`;

  return `
  <div class="tabs">
    <div class="tabset">
      ${INFO_TABS.map((t) => tab(t.key, t.label)).join("")}
    </div>
  </div>`;
}
