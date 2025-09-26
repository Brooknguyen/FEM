const API_BASE = "http://10.100.201.25:4000/api/records";

// Helpers thời gian
const d = (v) => (v ? new Date(v).toISOString().slice(0, 10) : "");
const ym = (v) => {
  const x = new Date(v);
  return `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(
    2,
    "0"
  )}`;
};

// Trạng thái cố định
const STATUS = {
  DONE: "Hoàn thành",
  LATE: "Trễ hạn",
  TODO: "Chưa thực hiện",
};

// Fetch helpers an toàn (trả về JSON hoặc throw lỗi rõ ràng)
async function jget(u) {
  const r = await fetch(u, { headers: { Accept: "application/json" } });
  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(
      `GET ${u} -> ${r.status} ${r.statusText} :: ${text.slice(0, 150)}`
    );
  }
  return r.json();
}

export async function renderMaintenance() {
  return `
  <section class="card p-4" id="maintenance-section">
    <h2 class="text-xl font-bold mb-4" style="text-align:center; font-weight: bold; font-size: 16px">Kế hoạch bảo trì tháng</h2>

    <div class="toolbar" style="display:flex;gap:12px;align-items:center;margin-bottom:12px">
      <label style="font-weight:600">Tháng:
        <select id="mt-month" style="padding:8px 10px;border:1px solid #ddd;border-radius:8px">
            ${[...Array(12)]
              .map((_, i) => `<option value="${i + 1}">${i + 1}</option>`)
              .join("")}
        </select>
      </label>

      <label style="font-weight:600">Năm:
        <select id="mt-year" style="padding:8px 10px;border:1px solid #ddd;border-radius:8px"></select>
      </label>
    </div>

    <div style="overflow:auto">
      <table id="mt-table" style="width:100%;border-collapse:collapse">
        <thead style="background:#f1f4ff">
          <tr>
            <th style="text-align:left;padding:10px;border-bottom:1px solid #eee">STT</th>
            <th style="text-align:left;padding:10px;border-bottom:1px solid #eee">Hạng mục bảo trì</th>
            <th style="text-align:left;padding:10px;border-bottom:1px solid #eee">Bộ phận liên quan</th>
            <th style="text-align:left;padding:10px;border-bottom:1px solid #eee">Kế hoạch</th>
            <th style="text-align:left;padding:10px;border-bottom:1px solid #eee">Đã thực hiện</th>
            <th style="text-align:left;padding:10px;border-bottom:1px solid #eee">Trạng thái</th>
            <th style="text-align:left;padding:10px;border-bottom:1px solid #eee">Ghi chú</th>
          </tr>
        </thead>
        <tbody id="mt-tbody"></tbody>
      </table>
    </div>
  </section>`;
}

export async function initMaintenance() {
  const $ = (s) => document.querySelector(s);
  const monthSelect = $("#mt-month"),
    yearSelect = $("#mt-year"),
    tbody = $("#mt-tbody");

  function renderStatus(status) {
    const base =
      "display:inline-block;padding:2px 8px;border-radius:999px;font-weight:600;";
    if (status === STATUS.DONE)
      return `<span style="${base}background:#e7f8ee;color:#058f3e">${STATUS.DONE}</span>`;
    if (status === STATUS.LATE)
      return `<span style="${base}background:#ffe6e3;color:#c92408">${STATUS.LATE}</span>`;
    return `<span style="${base}background:#e5e7eb;color:#111827">${STATUS.TODO}</span>`;
  }

  function ymStr() {
    const y = yearSelect.value;
    const m = monthSelect.value.padStart(2, "0");
    return `${y}-${m}`;
  }

  function initMonthYearSelectors() {
    const current = new Date();
    const currentYear = current.getFullYear();
    const currentMonth = current.getMonth() + 1;
    const years = Array.from({ length: 7 }, (_, i) => currentYear - 5 + i);
    yearSelect.innerHTML = years
      .map((y) => `<option value="${y}">${y}</option>`)
      .join("");
    yearSelect.value = currentYear;
    monthSelect.value = currentMonth;
  }

  async function loadTable() {
    try {
      const monthYear = ymStr();
      const rows = await jget(
        `${API_BASE}?month=${encodeURIComponent(monthYear)}`
      );

      if (!Array.isArray(rows)) throw new Error("Payload không phải mảng.");

      if (rows.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="padding:10px;text-align:center;color:#6b7280">Không có dữ liệu</td></tr>`;
        return;
      }

      tbody.innerHTML = rows
        .map(
          (r, i) => `
      <tr>
        <td style="padding:10px;border-bottom:1px solid #eee">${i + 1}</td>
        <td style="padding:10px;border-bottom:1px solid #eee">${
          r.task ?? ""
        }</td>
        <td style="padding:10px;border-bottom:1px solid #eee">${
          r.equipment ?? ""
        }</td>
        <td style="padding:10px;border-bottom:1px solid #eee">${d(
          r.plannedDate
        )}</td>
        <td style="padding:10px;border-bottom:1px solid #eee">${d(
          r.actualDate
        )}</td>
        <td style="padding:10px;border-bottom:1px solid #eee">${renderStatus(
          r.status
        )}</td>
        <td style="padding:10px;border-bottom:1px solid #eee">${
          r.note || ""
        }</td>
      </tr>
    `
        )
        .join("");
    } catch (e) {
      console.error(e);
      alert("Không tải được dữ liệu bảo trì.\n" + e.message);
      tbody.innerHTML = `<tr><td colspan="7" style="padding:10px;text-align:center;color:#ef4444">Lỗi tải dữ liệu</td></tr>`;
    }
  }

  monthSelect?.addEventListener("change", loadTable);
  yearSelect?.addEventListener("change", loadTable);

  initMonthYearSelectors();
  await loadTable();
}
