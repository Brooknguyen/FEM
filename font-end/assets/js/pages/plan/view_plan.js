// assets/js/pages/info/viewPlan.js
import {
  PLAN_RESOURCES,
  PLAN_KEYS,
  FREEZE_FIRST_COL,
  FREEZE_HEADER_ROWS,
} from "./config_plan.js";
import { renderPlanTabs } from "./tabs_plan.js";

let ORIGINAL_ROWS = [];
let ORIGINAL_MERGES = [];
let ORIGINAL_WRAP_CELLS = [];

const STATE = {
  sheetName: "",
  rows: [],
  merges: [],
  wrapCells: [], // ⬅️ danh sách ô có wrapText (từ Excel)
};

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Render table giữ merge + hỗ trợ wrap theo Excel.
 * @param {string[][]} matrix
 * @param {{s:{r:number,c:number},e:{r:number,c:number}}[]} merges
 * @param {number} headerRows
 * @param {Set<string>} wrapSet - tập key "r:c" cho các ô cần wrap
 */
function renderMergedTable(matrix, merges, headerRows, wrapSet) {
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
      // Header: luôn 1 dòng (nowrap)
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

      // Nếu ô này nằm trong wrapSet -> cho phép xuống dòng + bẻ từ
      const key = `${r}:${c}`;
      const cellStyle = wrapSet?.has(key)
        ? 'style="white-space:pre-wrap;word-break:break-word;overflow-wrap:anywhere;"'
        : ""; // mặc định không wrap (1 dòng)

      html += `<td ${attrs.join(" ")} ${cellStyle}>${escapeHtml(
        matrix[r][c] ?? ""
      )}</td>`;
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

export function renderPlanPage(key) {
  const cfg = PLAN_RESOURCES[key];
  const ids = {
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
      ${renderPlanTabs(key)}

      <div id="${ids.tip}" class="muted">Đang tải dữ liệu...</div>
      <div id="${ids.prev}" class="table-wrap"></div>
    </div>
  </section>

  <style>
    /* vùng preview có scroll riêng, để sticky hoạt động */
    #${ids.prev} {
      margin-top: 12px;
      max-height: 78vh;
      overflow: auto;
      border: 1px solid var(--line);
      border-radius: 10px;
      background: var(--card);
      --hdr1: 42px; /* fallback nếu JS chưa đo được */
    }
    #${ids.prev} table {
      border-collapse: collapse;
      width: max-content;
      background: var(--card);
      color: var(--fg);
    }
    /* Mặc định:
       - Header (th) luôn 1 dòng (nowrap)
       - Body (td) cũng một dòng, trừ những ô có wrapSet -> inline style sẽ bật pre-wrap
       => Giữ đúng wrap-text theo Excel khi BE cung cấp wrapCells */
    #${ids.prev} th,
    #${ids.prev} td {
      border: 1px solid var(--line);
      padding: 10px 12px;
      white-space: pre-wrap;
      line-height: 1.5;
      box-sizing: border-box;
    }

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

export function bindPlanEvents(key) {
  if (!PLAN_KEYS.has(key)) return;
  const cfg = PLAN_RESOURCES[key];

  const tip = document.getElementById(`${key}-tip`);
  const preview = document.getElementById(`${key}-preview`);
  const searchInput = document.getElementById(`${key}-search`);
  if (!preview) return;

  let currentFilter = "";

  loadLatestAndRender(cfg.defaultSheet).catch((e) => {
    console.warn("Không load được sheet mặc định:", e);
    tip.textContent = "Empty";
  });

  window.addEventListener("resize", () => adjustFreezeOffsets(preview), {
    passive: true,
  });

  function renderFilteredTable() {
    const filter = currentFilter.trim().toLowerCase();
    if (!filter) {
      // Hiển thị bảng gốc không lọc
      preview.innerHTML = renderMergedTable(
        STATE.rows,
        STATE.merges,
        FREEZE_HEADER_ROWS
      );
      adjustFreezeOffsets(preview);
      tip.textContent = `Sheet: ${STATE.sheetName} — ${
        STATE.rows.length
      } hàng × ${(STATE.rows[0] || []).length} cột. Merge: ${
        STATE.merges.length
      }`;
      return;
    }

    // Lấy 2 dòng đầu tiên giữ nguyên (header)
    const headerRows = STATE.rows.slice(0, FREEZE_HEADER_ROWS);

    // Lọc dữ liệu từ dòng thứ 3 trở đi
    const dataRows = STATE.rows.slice(FREEZE_HEADER_ROWS);
    const filteredDataRows = dataRows.filter((row) =>
      row.some((cell) => String(cell).toLowerCase().includes(filter))
    );

    // Kết hợp lại header + dữ liệu đã lọc
    const combinedRows = [...headerRows, ...filteredDataRows];

    // Cập nhật merges cũng nên xử lý để tránh lỗi (ở đây mình bỏ merges khi filter)
    preview.innerHTML = renderMergedTable(combinedRows, [], FREEZE_HEADER_ROWS);
    adjustFreezeOffsets(preview);
    tip.textContent = `Sheet: ${STATE.sheetName} — ${filteredDataRows.length} hàng (đã lọc) + ${FREEZE_HEADER_ROWS} hàng header`;
  }

  searchInput?.addEventListener("input", (e) => {
    currentFilter = e.target.value;
    renderFilteredTable();
  });

  async function loadLatestAndRender(sheetName) {
    const params = new URLSearchParams(location.search);
    const sheet = params.get("sheet") || sheetName;

    tip.textContent = "Đang tải dữ liệu...";
    let res = await fetch(cfg.latestByName(sheet), {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (res.status === 404) {
      const tryAny = await fetch(cfg.latestAny(), {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      if (tryAny.ok) res = tryAny;
      else {
        tip.textContent = "Empty.";
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
    STATE.wrapCells = Array.isArray(doc.wrapCells) ? doc.wrapCells : [];

    if (!STATE.rows.length) {
      tip.textContent = `Sheet "${STATE.sheetName}" hiện rỗng.`;
      return;
    }

    // Hiển thị dữ liệu gốc lúc đầu
    renderFilteredTable();
  }
}
