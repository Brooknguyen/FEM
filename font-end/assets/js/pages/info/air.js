// Air & N2: dùng renderer advanced ở chế độ "header 1 hàng"
import { InfoStore as S } from "../../stores/info.store.js";
import { renderAdvancedTable } from "./table-advanced.js";

export function renderAirPage() {
  const headerRows = [[
    { label: "Tên máy", key: "name" },
    { label: "Loại đối tượng", key: "object" },
    { label: "Ký hiệu", key: "symbol" },
    { label: "Card No", key: "no" },
    { label: "Model", key: "model" },
    { label: "CAPA(m3/min)", key: "capa" },
    { label: "Công suất(KW)", key: "power", render: (r) => `<input type="checkbox" ${r.power ? "checked" : ""} disabled>` },
    { label: "Điện áp(V)", key: "voltage" },
    { label: "Gas", key: "gas" },
    { label: "Hãng sản xuất", key: "maker" },
    { label: "Vị trí đặt máy", key: "position" },
    { label: "Địa điểm cung cấp", key: "load" },
    { label: "Ghi chú", key: "note" },
    { label: "Hình ảnh", key: "img", render: (r) => (r.img ? `<img class="thumb" src="${r.img}">` : "") },
  ]];

  const rows = (S.filtered?.() || S.items || []).map((x) => ({ data: x }));

  return renderAdvancedTable({
    title: "Danh mục thiết bị Utility — Air & N2",
    active: "air",
    headerRows,
    rows,
  });
}
