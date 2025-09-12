// AHU: header 2 hàng có nhóm cột
import { InfoStore as S } from "../../stores/info.store.js";
import { renderAdvancedTable } from "./table-advanced.js";

export function renderAHUPage() {
  const headerRows = [
    [
      { label: "Tên máy", rowspan: 2 },
      { label: "Serial", rowspan: 2 },
      { label: "Card no", rowspan: 2 },
      { label: "Model CDU", rowspan: 2 },
      { label: "Compressor", colspan: 3 },
      { label: "Rate flow CMM", rowspan: 2 },
      { label: "Cooling capa (Kcal/h)", rowspan: 2 },
      { label: "Heater KW", rowspan: 2 },
      { label: "Motor fan", colspan: 4 },
      { label: "V", rowspan: 2 },
      { label: "Type", rowspan: 2 },
      { label: "Ghi chú", rowspan: 2 },
    ],
    [
      { label: "KW", key: "compKw" },
      { label: "Model", key: "compModel" },
      { label: "Maker", key: "compMaker" },
      { label: "KW", key: "fanKw" },
      { label: "Model", key: "fanModel" },
      { label: "Bearings", key: "bearings" },
      { label: "Maker", key: "fanMaker" },
    ],
  ];

  // nhúng các cột cố định đầu/cuối vào hàng dưới cùng
  headerRows[1].unshift(
    { label: "Model CDU", key: "cduModel" },
    { label: "Card no", key: "card" },
    { label: "Serial", key: "serial" },
    { label: "Tên máy", key: "name" },
  );
  headerRows[1].push(
    { label: "V", key: "voltage" },
    { label: "Type", key: "type" },
    { label: "Ghi chú", key: "note" },
  );

  const rows = (S.filtered?.() || S.items || []).map((x) => ({
    data: {
      name: x.name, serial: x.serial, card: x.card, cduModel: x.cduModel,
      compKw: x.compKw, compModel: x.compModel, compMaker: x.compMaker,
      rateFlow: x.rateFlow, cooling: x.cooling, heater: x.heaterKw,
      fanKw: x.fanKw, fanModel: x.fanModel, bearings: x.bearings, fanMaker: x.fanMaker,
      voltage: x.voltage, type: x.type, note: x.note,
    },
  }));

  return renderAdvancedTable({
    title: "Thông số kỹ thuật — AHU",
    active: "ahu",
    headerRows,
    rows,
  });
}
