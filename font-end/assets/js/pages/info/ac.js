// ACU + Aircon (placeholder)
import { InfoStore as S } from "../../stores/info.store.js";
import { renderAdvancedTable } from "./table-advanced.js";

export function renderACPage() {
  const headerRows = [[
    { label: "Tên máy", key: "name" },
    { label: "Công suất (kW)", key: "power" },
    { label: "Điện áp (V)", key: "voltage" },
    { label: "Vị trí", key: "position" },
    { label: "Ghi chú", key: "note" },
  ]];
  const rows = (S.filtered?.() || S.items || []).map((x) => ({ data: x }));
  return renderAdvancedTable({ title: "ACU + Aircon", active: "ac", headerRows, rows });
}
