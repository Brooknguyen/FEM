// assets/js/pages/info/tank.js
// Demo: Import/Export Excel + giữ merge + freeze header 2 hàng
import { renderInfoTabs } from "./crud.tabs.js";

const TANK_STATE = { sheetName: "", rows: [], merges: [] };

// ======= cấu hình =======
const FREEZE_HEADER_ROWS = 2; // số hàng header cố định
const FREEZE_FIRST_COL = false; // nếu muốn cố định cột đầu -> true

export function renderCompressorPage() {
  return `
  <section class="card">
    <div class="card-h">
      <div class="title"><span class="title-lg">Danh mục thiết bị Utility —  High Pressure Air Compressor</span></div>
    </div>

    <div class="p-4">
      ${renderInfoTabs("compressor")}

      <div class="toolbar" style="margin:8px 0;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <input type="file" id="tnk-file" accept=".xlsx,.xls" style="display:none" />
        <button class="btn" id="tnk-import">📥 Import</button>
        <button class="btn" id="tnk-export" disabled>📤 Export</button>
        <button class="btn primary" id="tnk-save" disabled>Save</button>
      </div>

      <div id="tnk-tip" class="muted">Chọn file Excel (.xlsx/.xls) — bảng sẽ hiển thị giữ nguyên vùng gộp ô (merge) như file gốc.</div>
      <div id="tnk-preview" class="table-wrap"></div>
    </div>
  </section>

  <style>
    /* vùng preview có scroll riêng, để sticky hoạt động */
    #tnk-preview {
      margin-top: 12px;
      max-height: 72vh;
      overflow: auto;
      border: 1px solid var(--line);
      border-radius: 10px;
      background: var(--card);
      /* biến CSS dùng để đặt top cho hàng header 2 */
      --hdr1: 42px; /* fallback nếu JS chưa đo được */
    }

    #tnk-preview table {
      border-collapse: collapse;
      width: max-content;
      background: var(--card);
      color: var(--fg);
    }
    #tnk-preview th,
    #tnk-preview td {
      border: 1px solid var(--line);
      padding: 10px 12px; /* tăng chiều cao cho dễ đọc */
      white-space: nowrap;
      line-height: 1.5;
      box-sizing: border-box;
    }

    /* ===== Freeze 2 hàng header ===== */
    /* Hàng header 1 cố định trên cùng */
    #tnk-preview thead tr:nth-child(1) th {
      position: sticky;
      top: 0;
      z-index: 6; /* lớn hơn hàng 2 */
      background: #f1f5f9; /* nền khác để phân biệt */
    }
    /* Hàng header 2 cố định ngay dưới hàng 1 */
    #tnk-preview thead tr:nth-child(2) th {
      position: sticky;
      top: var(--hdr1); /* = chiều cao thực của hàng 1 */
      z-index: 5;
      background: #f1f5f9;
    }

    /* Dark theme */
    body.dark-theme #tnk-preview thead tr:nth-child(1) th,
    body.dark-theme #tnk-preview thead tr:nth-child(2) th {
      background: #1f2937;
    }

    /* (Tuỳ chọn) Freeze cột đầu */
    ${
      FREEZE_FIRST_COL
        ? `
    #tnk-preview th:first-child,
    #tnk-preview td:first-child {
      position: sticky;
      left: 0;
      z-index: 7; /* cao hơn phần header để không bị che */
      background: #f9fafb;
    }
    body.dark-theme #tnk-preview th:first-child,
    body.dark-theme #tnk-preview td:first-child {
      background: #111827;
    }
  `
        : ""
    }
  </style>
  `;
}

export function bindCompressorEvents() {
  const fileInput = document.getElementById("tnk-file");
  const btnImport = document.getElementById("tnk-import");
  const btnExport = document.getElementById("tnk-export");
  const btnSave = document.getElementById("tnk-save");
  const tip = document.getElementById("tnk-tip");
  const preview = document.getElementById("tnk-preview");

  if (!fileInput) return;

  btnImport.onclick = () => fileInput.click();

  fileInput.onchange = async (ev) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const wsName = wb.SheetNames[0];
      const ws = wb.Sheets[wsName];

      const { matrix, merges } = sheetToMatrixAndMerges(ws);
      TANK_STATE.sheetName = wsName;
      TANK_STATE.rows = matrix;
      TANK_STATE.merges = merges;

      preview.innerHTML = renderMergedTable(matrix, merges);
      tip.textContent = `Sheet: ${wsName} — ${matrix.length} hàng × ${
        (matrix[0] || []).length
      } cột. Merge: ${merges.length}`;

      // đo lại chiều cao header 1 để set top cho header 2
      adjustFreezeOffsets(preview);

      btnExport.disabled = false;
      btnSave.disabled = false;
    } catch (e) {
      console.error(e);
      alert("Không đọc được file Excel");
    } finally {
      ev.target.value = "";
    }
  };

  btnExport.onclick = () => {
    if (!TANK_STATE.rows.length) return;
    const ws = XLSX.utils.aoa_to_sheet(TANK_STATE.rows);
    ws["!merges"] = TANK_STATE.merges;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, TANK_STATE.sheetName || "Tank");
    XLSX.writeFile(wb, `Tank_${TANK_STATE.sheetName || "sheet"}.xlsx`);
  };

  btnSave.onclick = () => {
    alert(
      "Demo: dữ liệu đã sẵn sàng để gửi API.\nHàng: " +
        TANK_STATE.rows.length +
        " — Merges: " +
        TANK_STATE.merges.length
    );
  };

  // re-calc khi đổi kích thước cửa sổ
  window.addEventListener("resize", () => adjustFreezeOffsets(preview), {
    passive: true,
  });
}

/* Helpers */
function sheetToMatrixAndMerges(sheet) {
  const ref = sheet["!ref"] || "A1";
  const range = XLSX.utils.decode_range(ref);
  const R = range.e.r - range.s.r + 1;
  const C = range.e.c - range.s.c + 1;

  let matrix = Array.from({ length: R }, () => Array(C).fill(""));
  for (let r = range.s.r; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = sheet[addr];
      matrix[r - range.s.r][c - range.s.c] = (cell && (cell.w ?? cell.v)) ?? "";
    }
  }

  const merges = (sheet["!merges"] || []).map((m) => ({
    s: { r: m.s.r - range.s.r, c: m.s.c - range.s.c },
    e: { r: m.e.r - range.s.r, c: m.e.c - range.s.c },
  }));

  // bỏ các hàng rỗng cuối bảng
  while (
    matrix.length > 0 &&
    matrix[matrix.length - 1].every((v) => v === "" || v == null)
  ) {
    matrix.pop();
  }

  return { matrix, merges };
}

function renderMergedTable(matrix, merges) {
  const R = matrix.length;
  const C = (matrix[0] || []).length;

  const hidden = Array.from({ length: R }, () => Array(C).fill(false));
  const spanMap = new Map();
  merges.forEach((m) => {
    for (let r = m.s.r; r <= m.e.r; r++)
      for (let c = m.s.c; c <= m.e.c; c++)
        if (!(r === m.s.r && c === m.s.c)) hidden[r][c] = true;
    spanMap.set(`${m.s.r}:${m.s.c}`, {
      rowspan: m.e.r - m.s.r + 1,
      colspan: m.e.c - m.s.c + 1,
    });
  });

  const headerRows = Math.min(FREEZE_HEADER_ROWS, R);

  let html = `<table><thead>`;
  for (let r = 0; r < headerRows; r++) {
    html += `<tr>`;
    for (let c = 0; c < C; c++) {
      if (hidden[r][c]) continue;
      const span = spanMap.get(`${r}:${c}`);
      const attrs = [];
      if (span?.rowspan > 1) attrs.push(`rowspan="${span.rowspan}"`);
      if (span?.colspan > 1) attrs.push(`colspan="${span.colspan}"`);
      html += `<th ${attrs.join(" ")}>${escapeHtml(matrix[r][c] ?? "")}</th>`;
    }
    html += `</tr>`;
  }
  html += `</thead><tbody>`;

  for (let r = headerRows; r < R; r++) {
    html += `<tr>`;
    for (let c = 0; c < C; c++) {
      if (hidden[r][c]) continue;
      const span = spanMap.get(`${r}:${c}`);
      const attrs = [];
      if (span?.rowspan > 1) attrs.push(`rowspan="${span.rowspan}"`);
      if (span?.colspan > 1) attrs.push(`colspan="${span.colspan}"`);
      html += `<td ${attrs.join(" ")}>${escapeHtml(matrix[r][c] ?? "")}</td>`;
    }
    html += `</tr>`;
  }
  html += `</tbody></table>`;
  return html;
}

function adjustFreezeOffsets(previewEl) {
  const tbl = previewEl.querySelector("table");
  const thead = tbl?.querySelector("thead");
  const r1 = thead?.rows?.[0];
  if (!r1) return;
  const h1 = Math.ceil(r1.getBoundingClientRect().height); // chiều cao hàng 1
  previewEl.style.setProperty("--hdr1", h1 + "px");
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
