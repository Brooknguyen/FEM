// assets/js/pages/info/view.js
import {
  CRUD_PLAN_RESOURCES,
  CRUD_PLAN_KEYS,
  FREEZE_FIRST_COL,
  FREEZE_HEADER_ROWS,
} from "./crud.config.plan.js";
import { renderCrudPlanTabs } from "./crud.tabs.plan.js";

// ===== State chung cho mọi trang =====
const STATE = {
  sheetName: "",
  rows: [],
  merges: [],
};

// ===== Helpers Excel/HTML =====
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

  // loại các hàng rỗng cuối
  while (
    matrix.length > 0 &&
    matrix.at(-1).every((v) => v === "" || v == null)
  ) {
    matrix.pop();
  }
  return { matrix, merges };
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderMergedTable(matrix, merges, headerRows) {
  const R = matrix.length;
  const C = (matrix[0] || []).length;
  const hidden = Array.from({ length: R }, () => Array(C).fill(false));
  const spanMap = new Map();

  merges.forEach((m) => {
    for (let r = m.s.r; r <= m.e.r; r++) {
      for (let c = m.s.c; c <= m.e.c; c++) {
        if (!(r === m.s.r && c === m.s.c)) hidden[r][c] = true;
      }
    }
    spanMap.set(`${m.s.r}:${m.s.c}`, {
      rowspan: m.e.r - m.s.r + 1,
      colspan: m.e.c - m.s.c + 1,
    });
  });

  const hdr = Math.min(headerRows, R);
  let html = `<table><thead>`;
  for (let r = 0; r < hdr; r++) {
    html += `<tr>`;
    for (let c = 0; c < C; c++) {
      if (hidden[r][c]) continue;
      const span = spanMap.get(`${r}:${c}`) || {};
      const attrs = [];
      if (span.rowspan > 1) attrs.push(`rowspan="${span.rowspan}"`);
      if (span.colspan > 1) attrs.push(`colspan="${span.colspan}"`);
      html += `<th ${attrs.join(" ")}>${escapeHtml(matrix[r][c] ?? "")}</th>`;
    }
    html += `</tr>`;
  }
  html += `</thead><tbody>`;
  for (let r = hdr; r < R; r++) {
    html += `<tr>`;
    for (let c = 0; c < C; c++) {
      if (hidden[r][c]) continue;
      const span = spanMap.get(`${r}:${c}`) || {};
      const attrs = [];
      if (span.rowspan > 1) attrs.push(`rowspan="${span.rowspan}"`);
      if (span.colspan > 1) attrs.push(`colspan="${span.colspan}"`);
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
  const h1 = Math.ceil(r1.getBoundingClientRect().height);
  previewEl.style.setProperty("--hdr1", h1 + "px");
}

// ===== View/Bind dùng lại =====
export function renderCrudPlanPage(key) {
  const cfg = CRUD_PLAN_RESOURCES[key];
  const ids = {
    file: `${key}-file`,
    import: `${key}-import`,
    export: `${key}-export`,
    save: `${key}-save`,
    tip: `${key}-tip`,
    prev: `${key}-preview`,
  };

  return `
  <section class="card">
    <div class="card-h">
      <div class="title"><span class="title-lg">${cfg.title}</span></div>
      <!-- Search bar -->
      <div class="searchbar2">
        <span class="i-search"></span>
        <input type="search" id="${key}-search" placeholder="Search" />
      </div>
    </div>

    <div class="p-4">
      ${renderCrudPlanTabs(key)}
      <div class="toolbar" style="margin:8px 0;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <input type="file" id="${
          ids.file
        }" accept=".xlsx,.xls" style="display:none" />
        <button class="btn" id="${ids.import}">📥 Import</button>
        <button class="btn" id="${ids.export}" disabled>📤 Export</button>
        <button class="btn primary" id="${ids.save}" disabled>Save</button>
      </div>

      <div id="${ids.tip}" class="muted">Đang tải dữ liệu...</div>
      <div id="${ids.prev}" class="table-wrap"></div>
    </div>
  </section>

  <style>
    /* vùng preview có scroll riêng, để sticky hoạt động */
    #${ids.prev} {
      margin-top: 12px;
      max-height: 72vh;
      overflow: auto;
      border: 1px solid var(--line);
      border-radius: 10px;
      background: var(--card);
      --hdr1: 42px; /* fallback nếu JS chưa đo được */
    }
    #${
      ids.prev
    } table { border-collapse: collapse; width: max-content; background: var(--card); color: var(--fg); }
    #${ids.prev} th, #${
    ids.prev
  } td { border: 1px solid var(--line); padding: 10px 12px; white-space: nowrap; line-height: 1.5; box-sizing: border-box; }

    /* Freeze 2 hàng header */
    #${
      ids.prev
    } thead tr:nth-child(1) th { position: sticky; top: 0; z-index: 6; background: #f1f5f9; }
    #${
      ids.prev
    } thead tr:nth-child(2) th { position: sticky; top: var(--hdr1); z-index: 5; background: #f1f5f9; }
    body.dark-theme #${ids.prev} thead tr:nth-child(1) th,
    body.dark-theme #${
      ids.prev
    } thead tr:nth-child(2) th { background: #1f2937; }

    ${
      FREEZE_FIRST_COL
        ? `
      /* (tùy chọn) Freeze cột đầu */
      #${ids.prev} th:first-child, #${ids.prev} td:first-child {
        position: sticky; left: 0; z-index: 7; background: #f9fafb;
      }
      body.dark-theme #${ids.prev} th:first-child, body.dark-theme #${ids.prev} td:first-child { background: #111827; }
    `
        : ""
    }
  </style>`;
}

export function bindCrudPlanEvents(key) {
  if (!CRUD_PLAN_KEYS.has(key)) return;
  const cfg = CRUD_PLAN_RESOURCES[key];

  const fileInput = document.getElementById(`${key}-file`);
  const btnImport = document.getElementById(`${key}-import`);
  const btnExport = document.getElementById(`${key}-export`);
  const btnSave = document.getElementById(`${key}-save`);
  const tip = document.getElementById(`${key}-tip`);
  const preview = document.getElementById(`${key}-preview`);
  const searchInput = document.getElementById(`${key}-search`); // lấy input search
  if (!fileInput) return;

  let filteredRows = STATE.rows; // lưu mảng rows đã filter

  // Hàm render bảng theo dữ liệu truyền vào (có thể là filtered)
  function renderTable(rows) {
    preview.innerHTML = renderMergedTable(
      rows,
      STATE.merges,
      FREEZE_HEADER_ROWS
    );
    adjustFreezeOffsets(preview);
    tip.textContent = `Sheet: ${STATE.sheetName} — ${rows.length} hàng × ${
      (rows[0] || []).length
    } cột. Merge: ${STATE.merges.length}`;
  }

  // Hàm lọc dữ liệu theo từ khóa search
  function filterRows(keyword) {
    if (!keyword) return STATE.rows;
    const kw = keyword.toLowerCase();
    // Lọc những hàng mà có ít nhất một ô chứa từ khóa
    return STATE.rows.filter((row) =>
      row.some((cell) => String(cell).toLowerCase().includes(kw))
    );
  }

  // ===== Auto load latest khi vào trang =====
  loadLatestAndRender(cfg.defaultSheet).catch((e) => {
    console.warn("Không load được sheet mặc định:", e);
    tip.textContent =
      "Chưa có dữ liệu trong Mongo. Hãy Import Excel rồi Save để lưu lần đầu.";
    btnExport.disabled = true;
    btnSave.disabled = true;
  });

  // ===== Search event =====
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      const query = searchInput.value.trim().toLowerCase();

      if (!query) {
        // Hiển thị lại toàn bộ bảng nếu search rỗng
        preview.innerHTML = renderMergedTable(
          STATE.rows,
          STATE.merges,
          FREEZE_HEADER_ROWS
        );
        adjustFreezeOffsets(preview);
        return;
      }

      // Lấy 2 hàng đầu giữ nguyên
      const headerRows = STATE.rows.slice(0, FREEZE_HEADER_ROWS);

      // Lọc các hàng phía dưới header có chứa query
      const filteredBodyRows = STATE.rows
        .slice(FREEZE_HEADER_ROWS)
        .filter((row) =>
          row.some((cell) =>
            (cell ?? "").toString().toLowerCase().includes(query)
          )
        );

      // Ghép header + filtered body
      const filteredRows = headerRows.concat(filteredBodyRows);

      // Bỏ merge khi filter vì không khớp được
      preview.innerHTML = renderMergedTable(
        filteredRows,
        [],
        FREEZE_HEADER_ROWS
      );
      adjustFreezeOffsets(preview);
    });
  }

  // ===== Import Excel =====
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

      STATE.sheetName = wsName;
      STATE.rows = matrix;
      STATE.merges = merges;

      filteredRows = STATE.rows; // reset filter khi import file mới
      if (searchInput) searchInput.value = "";

      renderTable(filteredRows);
      btnExport.disabled = false;
      btnSave.disabled = false;
    } catch (e) {
      console.error(e);
      alert("Không đọc được file Excel");
    } finally {
      ev.target.value = "";
    }
  };

  // ===== Export Excel =====
  btnExport.onclick = () => {
    if (!STATE.rows.length) return;
    const ws = XLSX.utils.aoa_to_sheet(STATE.rows);
    ws["!merges"] = STATE.merges;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, STATE.sheetName || key.toUpperCase());
    XLSX.writeFile(wb, `${key}_${STATE.sheetName || "sheet"}.xlsx`);
  };

  // ===== Save vào Mongo =====
  btnSave.onclick = async () => {
    if (!STATE.rows.length) return;
    try {
      const res = await fetch(cfg.postPath(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheetName: STATE.sheetName || cfg.defaultSheet,
          rows: STATE.rows,
          merges: STATE.merges,
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

  // Recalc sticky offsets khi resize
  window.addEventListener("resize", () => adjustFreezeOffsets(preview), {
    passive: true,
  });

  // ===== helpers =====
  async function loadLatestAndRender(sheetName) {
    const params = new URLSearchParams(location.search);
    const sheet = params.get("sheet") || sheetName;

    tip.textContent = "Đang tải dữ liệu...";
    let res = await fetch(cfg.latestByName(sheet), {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    // Fallback: lấy bản mới nhất bất kỳ
    if (res.status === 404) {
      const tryAny = await fetch(cfg.latestAny(), {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      if (tryAny.ok) res = tryAny;
      else {
        tip.textContent =
          "Chưa có dữ liệu trong Mongo. Hãy Import rồi bấm Save để tạo bản đầu tiên.";
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
    STATE.sheetName = doc.sheetName || sheet;
    STATE.rows = Array.isArray(doc.rows) ? doc.rows : [];
    STATE.merges = Array.isArray(doc.merges) ? doc.merges : [];

    if (!STATE.rows.length) {
      tip.textContent = `Sheet "${STATE.sheetName}" hiện rỗng.`;
      btnExport.disabled = true;
      btnSave.disabled = true;
      return;
    }

    filteredRows = STATE.rows; // reset filter khi load dữ liệu mới
    if (searchInput) searchInput.value = "";

    renderTable(filteredRows);
    btnExport.disabled = false;
    btnSave.disabled = false;
  }
}
