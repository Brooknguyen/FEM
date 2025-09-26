// report/maintenance.js
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

// Fetch helpers
const jget = (u) =>
  fetch(u, { headers: { Accept: "application/json" } }).then(async (r) => {
    if (!r.ok)
      throw new Error(
        `GET ${u} -> ${r.status} ${r.statusText} :: ${(await r.text()).slice(
          0,
          150
        )}`
      );
    return r.json();
  });
const jreq = (u, m, b) =>
  fetch(u, {
    method: m,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(b),
  });

export async function renderMaintenance() {
  return `
  <section class="card p-4" id="maintenance-section">
    <h2 class="text-xl font-bold mb-4" style="text-align:center; font-weight:700">Kế hoạch bảo trì tháng</h2>

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

      <button id="mt-add" class="btn primary">Thêm mới</button>
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
            <th style="text-align:left;padding:10px;border-bottom:1px solid #eee">Hành động</th>
          </tr>
        </thead>
        <tbody id="mt-tbody"></tbody>
      </table>
    </div>

    <!-- Dialog Thêm/Sửa -->
    <dialog id="mt-dialog" style="border:none;border-radius:14px;max-width:760px;width:92vw;padding:0;box-shadow:0 20px 50px rgba(0,0,0,.25)">
      <form method="dialog" id="mt-form" style="padding:18px">
        <h3 id="mt-title" class="text-lg" style="margin:0 0 12px;font-weight:700">Thêm bản ghi</h3>
        <input type="hidden" id="mt-id"/>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <label>Hạng mục bảo trì
            <input id="mt-task" required placeholder="VD: Bảo dưỡng trạm điện" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:10px"/>
          </label>
          <label>Bộ phận liên quan
            <input id="mt-equipment" required placeholder="VD: Utility / Electric cabinet #1,#2" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:10px"/>
          </label>
          <label>Kế hoạch
            <input id="mt-planned" type="date" required style="width:100%;padding:10px;border:1px solid #ddd;border-radius:10px"/>
          </label>
          <label>Đã thực hiện
            <input id="mt-actual" type="date" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:10px"/>
          </label>
          <label>Trạng thái
            <select id="mt-status" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:10px">
              <option value="${STATUS.DONE}">${STATUS.DONE}</option>
              <option value="${STATUS.LATE}">${STATUS.LATE}</option>
              <option value="${STATUS.TODO}" selected>${STATUS.TODO}</option>
            </select>
          </label>
          <label>Ghi chú
            <input id="mt-note" placeholder="VD: thay filter, bôi mỡ, kiểm tra tiếp địa..." style="width:100%;padding:10px;border:1px solid #ddd;border-radius:10px"/>
          </label>
        </div>

        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:14px">
          <button type="submit" class="btn primary" id="mt-save">Lưu</button>
          <button type="button" class="btn" id="mt-cancel">Hủy</button>
        </div>
      </form>
    </dialog>
  </section>`;
}

export async function initMaintenance() {
  const $ = (s) => document.querySelector(s);
  const monthSelect = $("#mt-month"),
    yearSelect = $("#mt-year"),
    tbody = $("#mt-tbody");

  const dlg = $("#mt-dialog"),
    form = $("#mt-form"),
    title = $("#mt-title");
  const fld = {
    id: $("#mt-id"),
    task: $("#mt-task"),
    eq: $("#mt-equipment"),
    planned: $("#mt-planned"),
    actual: $("#mt-actual"),
    status: $("#mt-status"),
    note: $("#mt-note"),
  };

  // badge trạng thái
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
    const m = String(monthSelect.value || "").padStart(2, "0");
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
        tbody.innerHTML = `<tr><td colspan="8" style="padding:10px;text-align:center;color:#6b7280">Không có dữ liệu</td></tr>`;
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
            r.note ? String(r.note) : ""
          }</td>
          <td style="padding:10px;border-bottom:1px solid #eee">
            <button class="btn" data-edit='${encodeURIComponent(
              JSON.stringify(r)
            )}'>Sửa</button>
            <button class="btn danger" data-del="${r._id}">Xóa</button>
          </td>
        </tr>
      `
        )
        .join("");
    } catch (e) {
      console.error(e);
      alert("Không tải được dữ liệu bảo trì.\n" + e.message);
      tbody.innerHTML = `<tr><td colspan="8" style="padding:10px;text-align:center;color:#ef4444">Lỗi tải dữ liệu</td></tr>`;
    }
  }

  function openAdd() {
    title.textContent = "Thêm bản ghi";
    fld.id.value = "";
    form.reset();
    fld.status.value = STATUS.TODO;
    dlg.showModal?.();
  }
  function openEdit(r) {
    title.textContent = "Sửa bản ghi";
    fld.id.value = r._id || "";
    fld.task.value = r.task || "";
    fld.eq.value = r.equipment || "";
    fld.planned.value = d(r.plannedDate);
    fld.actual.value = d(r.actualDate);
    fld.status.value = r.status || STATUS.TODO;
    fld.note.value = r.note || "";
    dlg.showModal?.();
  }
  function closeDlg() {
    if (dlg.open) dlg.close();
  }

  // events
  document.getElementById("mt-add")?.addEventListener("click", openAdd);
  document.getElementById("mt-cancel")?.addEventListener("click", (e) => {
    e.preventDefault();
    closeDlg();
  });

  monthSelect?.addEventListener("change", loadTable);
  yearSelect?.addEventListener("change", loadTable);

  tbody.addEventListener("click", async (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    if (t.dataset.edit)
      openEdit(JSON.parse(decodeURIComponent(t.dataset.edit)));
    if (t.dataset.del) {
      if (!confirm("Bạn có chắc muốn xóa bản ghi này?")) return;
      const ok = (
        await fetch(`${API_BASE}/${t.dataset.del}`, { method: "DELETE" })
      ).ok;
      if (!ok) return alert("Không xóa được.");
      loadTable();
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      task: fld.task.value.trim(),
      equipment: fld.eq.value.trim(),
      plannedDate: fld.planned.value ? new Date(fld.planned.value) : null,
      actualDate: fld.actual.value ? new Date(fld.actual.value) : null,
      status: fld.status.value,
      note: fld.note.value.trim(),
    };
    const id = fld.id.value;
    const res = await jreq(
      id ? `${API_BASE}/${id}` : API_BASE,
      id ? "PUT" : "POST",
      payload
    );
    if (!res.ok) return alert("Lỗi: " + (await res.text()));
    closeDlg();

    // set selector về đúng tháng mới thêm/sửa
    const month = ym(payload.plannedDate || new Date());
    const [yy, mm] = month.split("-");
    yearSelect.value = yy;
    monthSelect.value = Number(mm);
    await loadTable();
  });

  initMonthYearSelectors();
  await loadTable();
}
