// assets/js/pages/info/index.js
import { renderInfoPage, bindInfoEvents } from "./view.js";
import { INFO_KEYS } from "./config.js";

export function renderInfoRoute(path) {
  const tab = path.split("/")[2] || "air";
  const active = INFO_KEYS.has(tab) ? tab : "air";


  // Lên lịch bind sau khi DOM cập nhật
  setTimeout(() => bindInfoEvents(active), 0);

  return renderInfoPage(active);
}
