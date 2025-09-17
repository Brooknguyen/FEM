// assets/js/pages/info/index.js
import { InfoStore as S } from "../../stores/info.store.js";

import { renderAirPage, bindAirEvents } from "./air.js";
import { renderCompressorPage, bindCompressorEvents } from "./compressor.js";
import { renderAHUPage, bindAhuEvents } from "./ahu.js";
import { renderChillerPage, bindChillerEvents } from "./chiller.js";
import { renderExhaustPage, bindExhaustEvents } from "./exhaust.js";
import { renderACPage, bindACEvents } from "./crud-ac.js";
import { renderTankPage, bindTankEvents } from "./tank.js";

export function renderInfoRoute(path) {
  const tab = path.split("/")[2] || "air";

  // Đồng bộ Store nếu người dùng nhảy tab nhanh (main.js cũng đã làm)
  if (S.tab !== tab && S.setTab) {
    S.setTab(tab).then(() => window.render?.());
  } else if (!S.items?.length && S.load) {
    S.load().then(() => window.render?.());
  }

  // Registry chứa render + bind
  const registry = {
    air: { render: renderAirPage, bind: bindAirEvents },
    compressor: { render: renderCompressorPage, bind: bindCompressorEvents },
    ahu: { render: renderAHUPage, bind: bindAhuEvents },
    chiller: { render: renderChillerPage, bind: bindChillerEvents },
    tank: { render: renderTankPage, bind: bindTankEvents },
    exhaust: { render: renderExhaustPage, bind: bindExhaustEvents },
    ac: { render: renderACPage, bind: bindACEvents },
  };

  const entry = registry[tab] || registry.air;

  // Trả về HTML string và lên lịch gắn sự kiện sau khi DOM cập nhật
  setTimeout(() => {
    entry.bind?.();
  }, 0);

  return entry.render();
}
