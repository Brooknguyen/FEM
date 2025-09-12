// Air Compressor: có "section" I/II
import { InfoStore as S } from "../../stores/info.store.js";
import { renderAdvancedTable } from "./table-advanced.js";

export function renderCompressorPage() {
  const headerRows = [[
    { label: "STT", key: "stt" },
    { label: "Tên máy", key: "name" },
    { label: "Loại đối tượng", key: "object" },
    { label: "Ký hiệu", key: "symbol" },
    { label: "Card no", key: "card" },
    { label: "Model", key: "model" },
    { label: "m3/min (CAPA)", key: "capa" },
    { label: "Công suất (KW)", key: "power" },
    { label: "Điện áp (V)", key: "voltage" },
    { label: "Gas", key: "gas" },
    { label: "Hãng sản xuất", key: "maker" },
    { label: "Xuất xứ", key: "origin" },
    { label: "Năm chế tạo", key: "year" },
    { label: "Vị trí đặt máy", key: "position" },
    { label: "Địa điểm cung cấp", key: "supply" },
    { label: "Ghi chú", key: "note" },
  ]];

  const src = S.filtered?.() || S.items || [];

  const rows = [];
  rows.push({ type: "section", label: "I. Máy nén khí / Air compressor" });
  rows.push(
    ...src
      .filter((x) => x.group === "A" || x.group === undefined) // nếu chưa có group thì vẫn show ở I
      .map((x, i) => ({ data: { stt: i + 1, ...x } }))
  );
  rows.push({ type: "section", label: "II. Máy sấy khí / Air dryer" });
  rows.push(
    ...src
      .filter((x) => x.group === "B")
      .map((x, i) => ({ data: { stt: i + 1, ...x } }))
  );

  return renderAdvancedTable({
    title: "Air Compressor — Bảng tổng hợp",
    active: "compressor",
    headerRows,
    rows,
  });
}
