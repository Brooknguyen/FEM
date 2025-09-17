// assets/js/pages/info/tank.js
// Import/Export Excel + giữ merge + freeze header 2 hàng + tự load từ Mongo
import { renderInfoTabs } from "./tabs.js";

// ======= API config =======
const API_BASE = "http://10.100.201.25:4000/api";
const DEFAULT_SHEET = "Pressure tank"; // Sheet mặc định auto-load khi vào trang

// ======= state =======
const TANK_STATE = { sheetName: "", rows: [], merges: [] };

// ======= cấu hình hiển thị =======
const FREEZE_HEADER_ROWS = 2; // số hàng header cố định
const FREEZE_FIRST_COL = false; // nếu muốn cố định cột đầu -> true

export function renderTankPage() {
  return `
  <section class="card">
    <div class="card-h">
      <div class="title"><span class="title-lg">Danh mục thiết bị Utility — Pressure Tank</span></div>
    </div>

    <div class="p-4">
      ${renderInfoTabs("tank")}

      <div class="toolbar" style="margin:8px 0;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <input type="file" id="tnk-file" accept=".xlsx,.xls" style="display:none" />
        <button class="btn" id="tnk-import">📥 Import</button>
        <button class="btn" id="tnk-export" disabled>📤 Export</button>
        <button class="btn primary" id="tnk-save" disabled>Save</button>
      </div>

      <div id="tnk-tip" class="muted">Đang tải dữ liệu...</div>
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
      padding: 10px 12px;
      white-space: nowrap;
      line-height: 1.5;
      box-sizing: border-box;
    }

    /* Freeze 2 hàng header */
    #tnk-preview thead tr:nth-child(1) th {
      position: sticky;
      top: 0;
      z-index: 6;
      background: #f1f5f9;
    }
    #tnk-preview thead tr:nth-child(2) th {
      position: sticky;
      top: var(--hdr1);
      z-index: 5;
      background: #f1f5f9;
    }
    body.dark-theme #tnk-preview thead tr:nth-child(1) th,
    body.dark-theme #tnk-preview thead tr:nth-child(2) th {
      background: #1f2937;
    }

    /* (tùy chọn) Freeze cột đầu */
    ${
      FREEZE_FIRST_COL
        ? `
    #tnk-preview th:first-child,
    #tnk-preview td:first-child {
      position: sticky;
      left: 0;
      z-index: 7;
      background: #f9fafb;
    }
    body.dark-theme #tnk-preview th:first-child,
    body.dark-theme #tnk-preview td:first-child {
      background: #111827;
    }`
        : ""
    }
  </style>
  `;
}

export function bindTankEvents() {
  const fileInput = document.getElementById("tnk-file");
  const btnImport = document.getElementById("tnk-import");
  const btnExport = document.getElementById("tnk-export");
  const btnSave = document.getElementById("tnk-save");
  const tip = document.getElementById("tnk-tip");
  const preview = document.getElementById("tnk-preview");

  if (!fileInput) return;

  // ===== Auto-load bản mới nhất ngay khi vào trang =====
  loadLatestAndRender(DEFAULT_SHEET).catch((e) => {
    console.warn("Không load được sheet mặc định:", e);
    tip.textContent =
      "Chưa có dữ liệu trong Mongo. Hãy Import Excel rồi Save để lưu lần đầu.";
    btnExport.disabled = true;
    btnSave.disabled = true;
  });

  // ===== Import từ file Excel =====
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

  // ===== Export ra Excel từ state hiện tại =====
  btnExport.onclick = () => {
    if (!TANK_STATE.rows.length) return;
    const ws = XLSX.utils.aoa_to_sheet(TANK_STATE.rows);
    ws["!merges"] = TANK_STATE.merges;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, TANK_STATE.sheetName || "Tank");
    XLSX.writeFile(wb, `Tank_${TANK_STATE.sheetName || "sheet"}.xlsx`);
  };

  // ===== Save vào Mongo =====
  btnSave.onclick = async () => {
    if (!TANK_STATE.rows.length) return;
    try {
      const res = await fetch(`${API_BASE}/tanks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheetName: TANK_STATE.sheetName || DEFAULT_SHEET,
          rows: TANK_STATE.rows,
          merges: TANK_STATE.merges,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Lỗi lưu dữ liệu");
      }
      const data = await res.json();
      alert("✅ Đã lưu vào Mongo! ID: " + data.id);
    } catch (e) {
      console.error(e);
      alert("❌ Không lưu được: " + e.message);
    }
  };

  // Recalc sticky offsets khi thay đổi kích thước
  window.addEventListener("resize", () => adjustFreezeOffsets(preview), {
    passive: true,
  });

  // ===== helpers =====
  async function loadLatestAndRender(sheetName) {
    const params = new URLSearchParams(location.search);
    const sheet = params.get("sheet") || sheetName;

    tip.textContent = "Đang tải dữ liệu...";
    let res = await fetch(
      `${API_BASE}/tanks/${encodeURIComponent(sheet)}/latest`,
      {
        method: "GET",
        headers: { Accept: "application/json" },
      }
    );

    // Fallback: nếu không có sheet theo tên, lấy bản mới nhất bất kỳ
    if (res.status === 404) {
      const res2 = await fetch(`${API_BASE}/tanks/latest`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      if (res2.ok) {
        res = res2; // dùng doc mới nhất bất kỳ
      } else {
        tip.textContent = `Chưa có dữ liệu trong Mongo. Hãy Import rồi bấm Save để tạo bản đầu tiên.`;
        btnExport.disabled = true;
        btnSave.disabled = true;
        return;
      }
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Không tải được dữ liệu");
    }

    const doc = await res.json();
    TANK_STATE.sheetName = doc.sheetName || sheet;
    TANK_STATE.rows = Array.isArray(doc.rows) ? doc.rows : [];
    TANK_STATE.merges = Array.isArray(doc.merges) ? doc.merges : [];

    if (!TANK_STATE.rows.length) {
      tip.textContent = `Sheet "${TANK_STATE.sheetName}" hiện rỗng.`;
      btnExport.disabled = true;
      btnSave.disabled = true;
      return;
    }

    preview.innerHTML = renderMergedTable(TANK_STATE.rows, TANK_STATE.merges);
    tip.textContent = `Sheet: ${TANK_STATE.sheetName} — ${
      TANK_STATE.rows.length
    } hàng × ${(TANK_STATE.rows[0] || []).length} cột. Merge: ${
      TANK_STATE.merges.length
    }`;
    adjustFreezeOffsets(preview);
    btnExport.disabled = false;
    btnSave.disabled = false;
  }
}

/* ===== Excel helpers ===== */
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
