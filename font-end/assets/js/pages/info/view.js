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

export function renderInfoPage(key) {
  const cfg = INFO_RESOURCES[key];
  const ids = {
    tip: `${key}-tip`,
    prev: `${key}-preview`,
  };

  return `
  <section class="card">
    <div class="card-h">
      <div class="title"><span class="title-lg">${cfg.title}</span></div>
    </div>

    <div class="p-4">
      ${renderInfoTabs(key)}

      <div id="${ids.tip}" class="muted">Đang tải dữ liệu...</div>
      <div id="${ids.prev}" class="table-wrap"></div>
    </div>
  </section>

  <style>
    #${ids.prev} {
      margin-top: 12px;
      max-height: 78vh;
      overflow: auto;
      border: 1px solid var(--line);
      border-radius: 10px;
      background: var(--card);
      --hdr1: 42px;
    }
    #${ids.prev} table {
      border-collapse: collapse;
      width: max-content;
      background: var(--card);
      color: var(--fg);
    }
    #${ids.prev} th, #${ids.prev} td {
      border: 1px solid var(--line);
      padding: 10px 12px;
      white-space: nowrap;
      line-height: 1.5;
      box-sizing: border-box;
    }

    #${ids.prev} thead tr:nth-child(1) th {
      position: sticky; top: 0; z-index: 6; background: #f1f5f9;
    }
    #${ids.prev} thead tr:nth-child(2) th {
      position: sticky; top: var(--hdr1); z-index: 5; background: #f1f5f9;
    }
    body.dark-theme #${ids.prev} thead tr:nth-child(1) th,
    body.dark-theme #${ids.prev} thead tr:nth-child(2) th {
      background: #1f2937;
    }

    ${
      FREEZE_FIRST_COL
        ? `
      #${ids.prev} th:first-child, #${ids.prev} td:first-child {
        position: sticky; left: 0; z-index: 7; background: #f9fafb;
      }
      body.dark-theme #${ids.prev} th:first-child, body.dark-theme #${ids.prev} td:first-child {
        background: #111827;
      }
    `
        : ""
    }
  </style>`;
}

export function bindInfoEvents(key) {
  if (!INFO_KEYS.has(key)) return;
  const cfg = INFO_RESOURCES[key];

  const tip = document.getElementById(`${key}-tip`);
  const preview = document.getElementById(`${key}-preview`);
  if (!preview) return;

  loadLatestAndRender(cfg.defaultSheet).catch((e) => {
    console.warn("Không load được sheet mặc định:", e);
    tip.textContent = "Empty";
  });

  window.addEventListener("resize", () => adjustFreezeOffsets(preview), {
    passive: true,
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

    if (!STATE.rows.length) {
      tip.textContent = `Sheet "${STATE.sheetName}" hiện rỗng.`;
      return;
    }

    preview.innerHTML = renderMergedTable(
      STATE.rows,
      STATE.merges,
      FREEZE_HEADER_ROWS
    );
    tip.textContent = `Sheet: ${STATE.sheetName} — ${
      STATE.rows.length
    } hàng × ${(STATE.rows[0] || []).length} cột. Merge: ${
      STATE.merges.length
    }`;
    adjustFreezeOffsets(preview);
  }
}
