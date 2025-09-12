// Renderer chung cho bảng: hỗ trợ header nhiều hàng (rowspan/colspan) + "section row"
import { renderInfoTabs } from "./tabs.js";

export function renderAdvancedTable({ title, active, headerRows, rows }) {
  const thead = headerRows
    .map(
      (r) => `
      <tr>
        ${r
          .map(
            (c) =>
              `<th ${c.colspan ? `colspan="${c.colspan}"` : ""} ${c.rowspan ? `rowspan="${c.rowspan}"` : ""}>${c.label}</th>`
          )
          .join("")}
      </tr>`
    )
    .join("");

  const last = headerRows.at(-1);
  const colCount = last.reduce((s, c) => s + (c.colspan || 1), 0);

  const tbody = rows
    .map((r) => {
      if (r.type === "section") {
        return `<tr class="tr-section"><td colspan="${colCount}">${r.label}</td></tr>`;
      }
      return `<tr>${last
        .map((c) => `<td>${c.render ? c.render(r.data) : r.data?.[c.key] ?? ""}</td>`)
        .join("")}</tr>`;
    })
    .join("");

  return `
  <section class="card">
    <div class="card-h"><div class="title"><span class="title-lg">${title}</span></div></div>
    <div class="p-4">
      ${renderInfoTabs(active)}
      <div class="table-wrap">
        <div class="scroll">
          <table id="grid" class="table-adv">
            <thead>${thead}</thead>
            <tbody>${tbody}</tbody>
          </table>
        </div>
      </div>
    </div>
  </section>`;
}

/* Một ít helper CSS bạn đã có thể thêm trong layout.css:
.table-adv thead th { background:#f1f5f9; text-align:center; vertical-align:middle; }
.table-adv td, .table-adv th { padding:8px 10px; border-bottom:1px solid var(--line); white-space:nowrap }
.tr-section td { background:#eef2ff; font-weight:700 }
.table-wrap { overflow-x:auto } .scroll{ max-height:80vh; overflow:auto }
*/
