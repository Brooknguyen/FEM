// Exhaust Fan (placeholder, bạn bổ sung cột tuỳ nhu cầu)
import { InfoStore as S } from "../../stores/info.store.js";
import { renderAdvancedTable } from "./table-advanced.js";

export function renderExhaustPage() {
  const headerRows = [[
    { label: "Tên quạt", key: "name" },
    { label: "Model", key: "model" },
    { label: "Lưu lượng (CMM)", key: "capa" },
    { label: "Công suất (KW)", key: "power" },
    { label: "Vị trí", key: "position" },
    { label: "Ghi chú", key: "note" },
  ]];
  const rows = (S.filtered?.() || S.items || []).map((x) => ({ data: x }));
  return renderAdvancedTable({ title: "Exhaust Fan", active: "exhaust", headerRows, rows });
}
