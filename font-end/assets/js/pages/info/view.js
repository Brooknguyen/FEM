// assets/js/pages/info/view.js
import {
  INFO_RESOURCES,
  INFO_KEYS,
  FREEZE_FIRST_COL,
  FREEZE_HEADER_ROWS,
} from "./config.js";
import { renderInfoTabs } from "./tabs.js";

const STATE = {
  sheetName: "",
  rows: [],
  merges: [],
};

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function generateMergedCellsMap(merges, rowCount, colCount) {
  const hidden = Array.from({ length: rowCount }, () => Array(colCount).fill(false));
  const spanMap = new Map();

  merges.forEach(({ s, e }) => {
    for (let r = s.r; r <= e.r; r++) {
      for (let c = s.c; c <= e.c; c++) {
        if (!(r === s.r && c === s.c)) hidden[r][c] = true;
      }
    }
    spanMap.set(`${s.r}:${s.c}`, {
      rowspan: e.r - s.r + 1,
      colspan: e.c - s.c + 1,
    });
  });

  return { hidden, spanMap };
}

function renderMergedTable(matrix, merges, headerRows) {
  const rowCount = matrix.length;
  const colCount = (matrix[0] || []).length;
  const { hidden, spanMap } = generateMergedCellsMap(merges, rowCount, colCount);

  const renderRow = (rowIdx, tag) =>
    `<tr>` +
    matrix[rowIdx]
      .map((cell, colIdx) => {
        if (hidden[rowIdx][colIdx]) return "";
        const span = spanMap.get(`${rowIdx}:${colIdx}`) || {};
        const attrs = [
          span.rowspan > 1 ? `rowspan="${span.rowspan}"` : "",
          span.colspan > 1 ? `colspan="${span.colspan}"` : "",
        ].filter(Boolean).join(" ");
        return `<${tag} ${attrs}>${escapeHtml(cell ?? "")}</${tag}>`;
      })
      .join("") +
    `</tr>`;

  const thead = matrix.slice(0, headerRows).map((_, r) => renderRow(r, "th")).join("");
  const tbody = matrix.slice(headerRows).map((_, r) => renderRow(r + headerRows, "td")).join("");

  return `<table><thead>${thead}</thead><tbody>${tbody}</tbody></table>`;
}

function adjustFreezeOffsets(previewEl) {
  const firstRow = previewEl.querySelector("thead > tr");
  if (!firstRow) return;
  const height = Math.ceil(firstRow.getBoundingClientRect().height);
  previewEl.style.setProperty("--hdr1", `${height}px`);
}

export function renderInfoPage(key) {
  const cfg = INFO_RESOURCES[key];
  const ids = {
    tip: `${key}-tip`,
    preview: `${key}-preview`,
  };

  return `
    <section class="card">
      <div class="card-h">
        <div class="title"><span class="title-lg">${cfg.title}</span></div>
        <div class="searchbar2">
          <span class="i-search"></span>
          <input type="search" id="${key}-search" placeholder="Search" />
        </div>
      </div>

      <div class="p-4">
        ${renderInfoTabs(key)}
        <div id="${ids.tip}" class="muted">Đang tải dữ liệu...</div>
        <div id="${ids.preview}" class="table-wrap"></div>
      </div>
    </section>

    <style>
      #${ids.preview} {
        margin-top: 12px;
        max-height: 78vh;
        overflow: auto;
        border: 1px solid var(--line);
        border-radius: 10px;
        background: var(--card);
        --hdr1: 42px;
      }

      #${ids.preview} table {
        border-collapse: collapse;
        width: max-content;
        background: var(--card);
        color: var(--fg);
      }

      #${ids.preview} th,
      #${ids.preview} td {
        border: 1px solid var(--line);
        padding: 10px 12px;
        white-space: nowrap;
        line-height: 1.5;
        box-sizing: border-box;
      }

      #${ids.preview} thead tr:nth-child(1) th {
        position: sticky;
        top: 0;
        z-index: 6;
        background: #f1f5f9;
      }

      #${ids.preview} thead tr:nth-child(2) th {
        position: sticky;
        top: var(--hdr1);
        z-index: 5;
        background: #f1f5f9;
      }

      body.dark-theme #${ids.preview} thead tr:nth-child(1) th,
      body.dark-theme #${ids.preview} thead tr:nth-child(2) th {
        background: #1f2937;
      }

      ${
        FREEZE_FIRST_COL
          ? `
        #${ids.preview} th:first-child,
        #${ids.preview} td:first-child {
          position: sticky;
          left: 0;
          z-index: 7;
          background: #f9fafb;
        }

        body.dark-theme #${ids.preview} th:first-child,
        body.dark-theme #${ids.preview} td:first-child {
          background: #111827;
        }
      `
          : ""
      }
    </style>
  `;
}

export function bindInfoEvents(key) {
  if (!INFO_KEYS.has(key)) return;
  const cfg = INFO_RESOURCES[key];

  const tipEl = document.getElementById(`${key}-tip`);
  const previewEl = document.getElementById(`${key}-preview`);
  const searchInput = document.getElementById(`${key}-search`);
  if (!previewEl) return;

  let currentFilter = "";

  async function loadLatestAndRender(defaultSheetName) {
    const params = new URLSearchParams(location.search);
    const sheetName = params.get("sheet") || defaultSheetName;

    tipEl.textContent = "Đang tải dữ liệu...";

    let response = await fetch(cfg.latestByName(sheetName), {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (response.status === 404) {
      const fallback = await fetch(cfg.latestAny(), {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      if (fallback.ok) {
        response = fallback;
      } else {
        tipEl.textContent = "Empty.";
        return;
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || "Không tải được dữ liệu");
    }

    const doc = await response.json();
    STATE.sheetName = doc.sheetName || sheetName;
    STATE.rows = Array.isArray(doc.rows) ? doc.rows : [];
    STATE.merges = Array.isArray(doc.merges) ? doc.merges : [];

    if (!STATE.rows.length) {
      tipEl.textContent = `Sheet "${STATE.sheetName}" hiện rỗng.`;
      return;
    }

    renderFilteredTable();
  }

  function renderFilteredTable() {
    const filterText = currentFilter.trim().toLowerCase();

    const headers = STATE.rows.slice(0, FREEZE_HEADER_ROWS);
    const dataRows = STATE.rows.slice(FREEZE_HEADER_ROWS);

    const filteredRows = !filterText
      ? dataRows
      : dataRows.filter((row) =>
          row.some((cell) => String(cell).toLowerCase().includes(filterText))
        );

    const combinedRows = [...headers, ...filteredRows];
    const merges = filterText ? [] : STATE.merges;

    previewEl.innerHTML = renderMergedTable(combinedRows, merges, FREEZE_HEADER_ROWS);
    adjustFreezeOffsets(previewEl);

    tipEl.textContent = `Sheet: ${STATE.sheetName} — ${
      filteredRows.length
    } hàng ${filterText ? "(đã lọc)" : ""} + ${FREEZE_HEADER_ROWS} hàng header`;
  }

  // Bind events
  searchInput?.addEventListener("input", (e) => {
    currentFilter = e.target.value;
    renderFilteredTable();
  });

  window.addEventListener("resize", () => adjustFreezeOffsets(previewEl), {
    passive: true,
  });

  loadLatestAndRender(cfg.defaultSheet).catch((err) => {
    console.warn("Không load được sheet mặc định:", err);
    tipEl.textContent = "Empty";
  });
}
