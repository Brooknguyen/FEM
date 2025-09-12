// Bộ điều phối /info/:tab
import { InfoStore as S } from "../../stores/info.store.js";
import { renderAirPage } from "./air.js";
import { renderCompressorPage } from "./compressor.js";
import { renderAHUPage } from "./ahu.js";
import { renderChillerPage } from "./chiller.js";
import { renderExhaustPage } from "./exhaust.js";
import { renderACPage } from "./ac.js";
import { renderTankPage } from "./tank.js";

export function renderInfoRoute(path) {
  const tab = path.split("/")[2] || "air";

  // Đồng bộ Store nếu người dùng nhảy tab nhanh (main.js cũng đã làm)
  if (S.tab !== tab && S.setTab) S.setTab(tab).then(() => window.render?.());
  else if (!S.items?.length && S.load) S.load().then(() => window.render?.());

  const registry = {
    air: renderAirPage,
    compressor: renderCompressorPage,
    ahu: renderAHUPage,
    chiller: renderChillerPage,
    tank: renderTankPage,
    exhaust: renderExhaustPage,
    ac: renderACPage,
  };

  const fn = registry[tab] || renderAirPage;
  return fn();
}
