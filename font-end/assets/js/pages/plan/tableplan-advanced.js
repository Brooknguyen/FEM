// assets/js/pages/info/tableplan-advanced.js
import { renderPlanTabs } from "./tabs_plan.js";


export function renderAdvancedTable({ title, active, headerRows, rows }) {
  const thead = headerRows
    .map(
      (r) => `
      <tr>
        ${r
          .map(
            (c) =>
              `<th ${c.colspan ? `colspan="${c.colspan}"` : ""} ${
                c.rowspan ? `rowspan="${c.rowspan}"` : ""
              }>${c.label}</th>`
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
        .map(
          (c) =>
            `<td>${c.render ? c.render(r.data) : r.data?.[c.key] ?? ""}</td>`
        )
        .join("")}</tr>`;
    })
    .join("");

  return `
  <section class="card">
    <div class="card-h"><div class="title"><span class="title-lg">${title} </span></div></div>
    <div class="p-4">
      ${renderPlanTabs(active)}
      <div class="table-wrapper">
        <table id="grid" class="table-adv">
          <thead>${thead}</thead>
          <tbody>${tbody}</tbody>
        </table>
      </div>
    </div>
  </section>`;
}
