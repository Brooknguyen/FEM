// assets/js/pages/info/viewPlan.js
import {
  PLAN_RESOURCES,
  PLAN_KEYS,
  FREEZE_FIRST_COL,
  FREEZE_HEADER_ROWS,
} from "./config_plan.js";
import { renderPlanTabs } from "./tabs_plan.js";

const STATE = {
  sheetName: "",
  rows: [],
  merges: [],
  wrapCells: [], // từ BE: danh sách ô cần wrap (tùy cấu trúc, xem chú thích bên dưới)
  lastQuery: "", // lấy từ topbar (ui.js)
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
 * @param {Set<string>} wrapSet - tập key "r:c" cho các ô cần wrap (tùy theo dữ liệu)
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

      const key = `${r}:${c}`;
      const wrapStyle = wrapSet?.has(key)
        ? 'style="white-space:pre-wrap;word-break:break-word;overflow-wrap:anywhere;"'
        : ""; // nếu không trong wrapSet thì theo CSS mặc định

      html += `<td ${attrs.join(" ")} ${wrapStyle}>${escapeHtml(
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
      <!-- ĐÃ GỠ searchbar cục bộ; dùng topbar trong ui.js -->
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

    /* Bạn đang để pre-wrap cho cả th/td — giữ nguyên như hiện tại */
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
  if (!preview) return;

  // ---- Helper: tạo wrapSet từ STATE.wrapCells (nếu BE trả dạng {r,c} hoặc "r:c") ----
  function toWrapSet(rowsCountOffset = 0) {
    // Khi không lọc: dùng chỉ số gốc -> wrapSet theo indices gốc
    // Khi lọc: bỏ merges, và chỉ số thay đổi -> để đơn giản, không áp wrapSet (trả về empty)
    const set = new Set();
    // Hỗ trợ 2 kiểu dữ liệu thường gặp từ BE:
    // - mảng key "r:c"
    // - mảng đối tượng { r, c }
    for (const item of STATE.wrapCells || []) {
      if (typeof item === "string" && item.includes(":")) {
        set.add(item); // ví dụ "12:3"
      } else if (
        item &&
        typeof item === "object" &&
        "r" in item &&
        "c" in item
      ) {
        set.add(`${item.r}:${item.c}`);
      }
    }
    return set;
  }

  // ---- Render theo query hiện tại từ topbar ----
  function renderWithFilter() {
    const q = (STATE.lastQuery || "").trim().toLowerCase();

    if (!STATE.rows.length) {
      preview.innerHTML = "";
      tip.textContent = "Empty.";
      return;
    }

    const headers = STATE.rows.slice(0, FREEZE_HEADER_ROWS);
    const dataRows = STATE.rows.slice(FREEZE_HEADER_ROWS);

    const filteredBody = q
      ? dataRows.filter((row) =>
          row.some((cell) =>
            String(cell ?? "")
              .toLowerCase()
              .includes(q)
          )
        )
      : dataRows;

    const rowsToRender = [...headers, ...filteredBody];

    // Khi có filter -> bỏ merges để tránh lệch; wrapSet cũng bỏ vì index thay đổi
    const mergesToUse = q ? [] : STATE.merges;
    const wrapSet = q ? new Set() : toWrapSet();

    preview.innerHTML = renderMergedTable(
      rowsToRender,
      mergesToUse,
      FREEZE_HEADER_ROWS,
      wrapSet
    );
    adjustFreezeOffsets(preview);

    tip.textContent = `Sheet: ${STATE.sheetName} — ${
      filteredBody.length
    } hàng ${q ? "(đã lọc)" : ""} + ${FREEZE_HEADER_ROWS} hàng header`;
  }

  // ---- Nhận event từ topbar search (ui.js -> 'search-query-changed') ----
  const onGlobalSearch = (e) => {
    STATE.lastQuery = e.detail?.query || "";
    renderWithFilter();
  };
  window.addEventListener("search-query-changed", onGlobalSearch);

  // Nếu topbar đã có sẵn giá trị khi mở trang -> đồng bộ ngay
  const topbarInput = document.getElementById("topbar-search");
  if (topbarInput && topbarInput.value) {
    STATE.lastQuery = topbarInput.value;
  }

  // ===== Auto load latest khi vào trang =====
  loadLatestAndRender(cfg.defaultSheet).catch((e) => {
    console.warn("Không load được sheet mặc định:", e);
    tip.textContent = "Empty";
  });

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

    if (res.status === 404) {
      const tryAny = await fetch(cfg.latestAny(), {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      if (tryAny.ok) res = tryAny;
      else {
        tip.textContent = "Empty.";
        preview.innerHTML = "";
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
      preview.innerHTML = "";
      return;
    }

    // Render lần đầu theo query đang có (live)
    renderWithFilter();
  }

  // (Tuỳ chọn) cleanup khi rời trang:
  // return () => window.removeEventListener("search-query-changed", onGlobalSearch);
}
