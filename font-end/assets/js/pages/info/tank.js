// Pressure Tank (placeholder)
import { InfoStore as S } from "../../stores/info.store.js";
import { renderAdvancedTable } from "./table-advanced.js";

export function renderTankPage() {
  const headerRows = [
    [
      { label: "Tên bồn", key: "name" },
      { label: "Dung tích (L)", key: "capacity" },
      { label: "Áp suất (bar)", key: "pressure" },
      { label: "Vị trí", key: "position" },
      { label: "Ghi chú", key: "note" },
    ],
  ];
  const rows = (S.filtered?.() || S.items || []).map((x) => ({ data: x }));
  return renderAdvancedTable({
    title: "Pressure Tank",
    active: "tank",
    headerRows,
    rows,
  });
}
