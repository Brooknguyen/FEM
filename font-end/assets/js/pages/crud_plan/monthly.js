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

// Ghi chú cố định
const NOTE = {
  DONE: "Hoàn thành",
  LATE: "Trễ hạn",
  TODO: "Chưa thực hiện",
};
function normalizeNote(n) {
  const s = String(n || "").toLowerCase();
  if (s.includes("hoàn") || s.includes("đúng")) return NOTE.DONE;
  if (s.includes("trễ")) return NOTE.LATE;
  if (s.includes("chưa")) return NOTE.TODO;
  return NOTE.TODO;
}

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
async function jreq(u, method, body) {
  const r = await fetch(u, {
    method,
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(
      `${method} ${u} -> ${r.status} ${r.statusText} :: ${text.slice(0, 150)}`
    );
  }
  // có thể trả về object sau khi tạo/sửa
  const ct = r.headers.get("content-type") || "";
  return ct.includes("application/json") ? r.json() : { ok: true };
}
async function jdel(u) {
  const r = await fetch(u, {
    method: "DELETE",
    headers: { Accept: "application/json" },
  });
  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(
      `DELETE ${u} -> ${r.status} ${r.statusText} :: ${text.slice(0, 150)}`
    );
  }
  const ct = r.headers.get("content-type") || "";
  return ct.includes("application/json") ? r.json() : { ok: true };
}

export async function renderMaintenance() {
  return `
  <section class="card p-4" id="maintenance-section">
    <h2 class="text-xl font-bold mb-4" style="text-align:center">Bảng bảo trì theo tháng</h2>

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
            <th style="text-align:left;padding:10px;border-bottom:1px solid #eee">Ghi chú</th>
            <th style="text-align:left;padding:10px;border-bottom:1px solid #eee">Hành động</th>
          </tr>
        </thead>
        <tbody id="mt-tbody"></tbody>
      </table>
    </div>

    <dialog id="mt-dialog" style="border:none;border-radius:14px;max-width:720px;width:92vw;padding:0;box-shadow:0 20px 50px rgba(0,0,0,.25)">
      <form method="dialog" id="mt-form" style="padding:18px">
        <h3 id="mt-title" class="text-lg" style="margin:0 0 12px;font-weight:700">Thêm bản ghi</h3>
        <input type="hidden" id="mt-id"/>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <label>Hạng mục bảo trì
            <input id="mt-task" required placeholder="VD: Bảo dưỡng định kỳ tủ điện" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:10px"/>
          </label>
          <label>Bộ phận liên quan
            <input id="mt-equipment" required placeholder="VD: Electric cabinet #1, #2" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:10px"/>
          </label>
          <label>Kế hoạch
            <input id="mt-planned" type="date" required style="width:100%;padding:10px;border:1px solid #ddd;border-radius:10px"/>
          </label>
          <label>Đã thực hiện
            <input id="mt-actual" type="date" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:10px"/>
          </label>
          <label>Ghi chú
            <select id="mt-note" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:10px">
              <option value="Hoàn thành">Hoàn thành</option>
              <option value="Trễ hạn">Trễ hạn</option>
              <option value="Chưa thực hiện" selected>Chưa thực hiện</option>
            </select>
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
    note: $("#mt-note"),
  };

  function renderNote(n) {
    const note = normalizeNote(n);
    const base =
      "display:inline-block;padding:2px 8px;border-radius:999px;font-weight:600;";
    if (note === NOTE.DONE)
      return `<span style="${base}background:#e7f8ee;color:#058f3e">${NOTE.DONE}</span>`;
    if (note === NOTE.LATE)
      return `<span style="${base}background:#ffe6e3;color:#c92408">${NOTE.LATE}</span>`;
    return `<span style="${base}background:#e5e7eb;color:#111827">${NOTE.TODO}</span>`;
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

    // Tạo danh sách năm từ (currentYear - 5) đến (currentYear + 1)
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

      // ⬇️ Auto tính "Ghi chú" nếu chưa có actualDate
      const today = new Date();
      for (const r of rows) {
        if (!r.actualDate) {
          const planned = new Date(r.plannedDate);
          r.note = planned < today ? NOTE.LATE : NOTE.TODO;
        }
      }

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
        <td style="padding:10px;border-bottom:1px solid #eee">${renderNote(
          r.note
        )}</td>
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
      tbody.innerHTML = `<tr><td colspan="7" style="padding:10px;text-align:center;color:#ef4444">Lỗi tải dữ liệu</td></tr>`;
    }
  }

  const openAdd = () => {
    title.textContent = "Thêm bản ghi";
    fld.id.value = "";
    form.reset();
    // mặc định “Chưa thực hiện”
    fld.note.value = NOTE.TODO;
    dlg.showModal?.();
  };
  const openEdit = (r) => {
    title.textContent = "Sửa bản ghi";
    fld.id.value = r._id || "";
    fld.task.value = r.task || "";
    fld.eq.value = r.equipment || "";
    fld.planned.value = d(r.plannedDate);
    fld.actual.value = d(r.actualDate);
    fld.note.value = normalizeNote(r.note);
    dlg.showModal?.();
  };
  const closeDlg = () => {
    if (dlg.open) dlg.close();
  };

  document.getElementById("mt-add")?.addEventListener("click", openAdd);
  document.getElementById("mt-cancel")?.addEventListener("click", (e) => {
    e.preventDefault();
    closeDlg();
  });
  document.getElementById("mt-refresh")?.addEventListener("click", loadTable);
  monthSelect?.addEventListener("change", loadTable);
  yearSelect?.addEventListener("change", loadTable);

  tbody.addEventListener("click", async (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    try {
      if (t.dataset.edit) {
        openEdit(JSON.parse(decodeURIComponent(t.dataset.edit)));
      } else if (t.dataset.del) {
        if (!confirm("Bạn có chắc muốn xóa bản ghi này?")) return;
        await jdel(`${API_BASE}/${t.dataset.del}`);
        await loadTable();
      }
    } catch (err) {
      console.error(err);
      alert("Thao tác thất bại.\n" + err.message);
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      task: fld.task.value.trim(),
      equipment: fld.eq.value.trim(),
      plannedDate: fld.planned.value ? new Date(fld.planned.value) : null,
      actualDate: fld.actual.value ? new Date(fld.actual.value) : null,
      note: fld.note.value, // lấy đúng 1 trong 3 giá trị cố định
    };
    const id = fld.id.value;
    try {
      if (id) {
        await jreq(`${API_BASE}/${id}`, "PUT", payload);
      } else {
        await jreq(API_BASE, "POST", payload);
      }
      closeDlg();
      // đồng bộ tháng và năm mới tạo/sửa
      const month = ym(payload.plannedDate || new Date()); // "YYYY-MM"
      const [year, mon] = month.split("-");

      // Thêm năm nếu chưa có trong select
      if (![...yearSelect.options].some((o) => o.value === year)) {
        yearSelect.insertAdjacentHTML(
          "afterbegin",
          `<option value="${year}">${year}</option>`
        );
      }
      yearSelect.value = year;

      // Cập nhật tháng (chuyển "09" thành số 9)
      monthSelect.value = String(parseInt(mon, 10));

      await loadTable();
    } catch (err) {
      console.error(err);
      alert("Lưu thất bại.\n" + err.message);
    }
  });

  await initMonthYearSelectors();
  await loadTable();
}
