// Water Chiller: bảng đơn giản 1 hàng header
import { InfoStore as S } from "../../stores/info.store.js";
import { renderAdvancedTable } from "./table-advanced.js";

export function renderChillerPage() {
  const headerRows = [[
    { label: "Tên Chiller", key: "name" },
    { label: "Vòng", key: "loop" },
    { label: "SET (°C)", key: "setTemp" },
    { label: "RETURN (°C)", key: "returnT" },
    { label: "Bơm", key: "pump" },
    { label: "Compressor", key: "comp" },
    { label: "Ghi chú", key: "note" },
  ]];

  const rows = (S.filtered?.() || S.items || []).map((x) => ({ data: x }));

  return renderAdvancedTable({
    title: "Water Chiller",
    active: "chiller",
    headerRows,
    rows,
  });
}
