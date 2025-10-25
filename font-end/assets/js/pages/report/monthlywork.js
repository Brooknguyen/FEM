// monthlywork.js
// ======================================================================
//  TABLE OF CONTENTS / MỤC LỤC  (KHÔNG ĐỔI LOGIC, CHỈ SẮP XẾP LẠI)
//  [CONFIG]            : API config
//  [TEMPLATE]          : HTML bảng + Modal (string template)
//  [BOOTSTRAP]         : renderMonthlyWorkReport(date) -> gắn HTML + init events
//  [SETUP/EVENTS]      : setupInspectionEvents(date) (fetch, modal, thêm/sửa/xoá)
//  [ROW HELPERS]       : đọc/ghi form <-> hàng bảng, header/cột Thao tác, “No data”
//  [FETCH]             : fetchJson, fetchInspection
//  [SUBMIT]            : submitInspectionReport(date)
//  [PUBLIC API]        : window.__setInspectionEditMode(enabled)
// ======================================================================

/* ======================================================================
 * [CONFIG] — API cấu hình
 * ----------------------------------------------------------------------
 * - 🔧 EDIT HERE khi đổi IP/route BE
 * ==================================================================== */
const API_BASE = "http://10.100.201.25:4000/api/device-inspection"; // 🔧 EDIT HERE

/* ======================================================================
 * [TEMPLATE] — HTML table + modal (giữ nguyên id/tên cũ)
 * ----------------------------------------------------------------------
 * - buildReportHTML(): trả ra full HTML của bảng + modal
 * - KHÔNG đổi id: #inspection-tbody, #inspect-modal, #ins-save, ...
 * ==================================================================== */
function buildReportHTML() {
  return `
    <table class="table-report" style="width:100%; border-collapse:collapse;">
      <style>
        .table-report {
          border-collapse: collapse;
          width: max-content;
          min-width: 100%;
          text-align: center;
          line-height: 1.35;
          min-height: 34px;
          border: 1px solid var(--fg);
        }
        .table-report td, .table-report th {
          vertical-align: middle;
          border: 1px solid var(--fg);
          padding: 8px;
        }
        .table-report .cell-input {
          display: block;
          width: 100%;
          min-width: 0;
          box-sizing: border-box;
          padding: 6px 8px;
          border: none;
          border-radius: 6px;
          background: transparent;
          color: var(--fg);
          outline: none;
        }
        .table-report tr:last-child td { border-bottom: none; }
        .table-report td:last-child   { border-right: none; }
      </style>
      <thead>
        <tr>
          <th>STT</th>
          <th>Tên thiết bị</th>
          <th>Ngày</th>
          <th>Người kiểm tra</th>
          <th>Vấn đề tìm thấy</th>
          <!-- KHÔNG thêm th 'Thao tác' cố định; sẽ thêm động -->
        </tr>
      </thead>
      <tbody id="inspection-tbody"></tbody>
    </table>

    <!-- Modal -->
    <div id="inspect-modal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,.45); z-index:1000; justify-content:center; align-items:center;">
      <div style="background:#fff; color:#111; padding:18px; border-radius:8px; width:520px; max-width:92%;">
        <h3 style="text-align:center; margin-top:0;">Thêm/Cập nhật kiểm tra thiết bị</h3>

        <label style="display:block; margin:10px 0 6px;">Tên thiết bị</label>
        <input id="ins-name" type="text" style="width:100%; padding:8px;" placeholder="VD: Máy nén khí 9">

        <div style="display:flex; gap:12px; margin-top:10px;">
          <div style="flex:1;">
            <label>Ngày</label>
            <input id="ins-date" type="date" style="width:100%; padding:8px;">
          </div>
          <div style="flex:1;">
            <label>Người kiểm tra</label>
            <input id="ins-checker" type="text" style="width:100%; padding:8px;" placeholder="Nguyễn Văn A">
          </div>
        </div>

        <label style="display:block; margin:12px 0 6px;">Vấn đề tìm thấy</label>
        <textarea id="ins-issue" style="width:100%; height:90px; padding:8px;" placeholder="Không phát hiện bất thường / Mô tả lỗi..."></textarea>

        <div style="text-align:right; margin-top:14px;">
          <button id="ins-save"   style="padding:6px 12px; background:#16a34a; color:#fff; border:none; border-radius:4px;">Lưu</button>
          <button id="ins-cancel" style="padding:6px 12px; margin-left:8px; border:none; background:#ef4444; color:#fff; border-radius:4px;">Thoát</button>
        </div>
      </div>
    </div>
  `;
}

/* ======================================================================
 * [BOOTSTRAP] — Render + khởi tạo
 * ----------------------------------------------------------------------
 * - API giữ nguyên: export async function renderMonthlyWorkReport(date)
 * - Thêm delay ngắn để DOM sẵn sàng trước khi bind
 * ==================================================================== */
export async function renderMonthlyWorkReport(date) {
  const html = buildReportHTML();
  setTimeout(() => setupInspectionEvents(date), 0); // giữ nguyên hành vi
  return html;
}

/* ======================================================================
 * [SETUP/EVENTS] — Fetch dữ liệu, Modal, Thêm/Sửa/Xoá hàng
 * ----------------------------------------------------------------------
 * - Không đổi id hoặc text các nút/ô input
 * ==================================================================== */
function setupInspectionEvents(date) {
  const tbody = document.getElementById("inspection-tbody");
  const addBtn = document.getElementById("add-task-btn"); // dùng nút chung của SPA
  const modal = document.getElementById("inspect-modal");
  const saveBtn = document.getElementById("ins-save");
  const cancelBtn = document.getElementById("ins-cancel");

  let currentIndex = 1;
  let editingRow = null;

  // ====== FETCH ban đầu ======
  fetchInspection(date)
    .then((items) => {
      (items || []).forEach((it, idx) => {
        const row = makeRow(
          {
            name: it.name ?? it.deviceName ?? "",
            date: it.date ?? it.checkDate ?? "",
            checker: it.checker ?? it.person ?? "",
            issue: it.issue ?? it.problem ?? "",
          },
          idx + 1
        );
        tbody.appendChild(row);
        currentIndex = idx + 2;
      });
      updateNoDataRow();
    })
    .catch((err) => {
      console.error(err);
      alert(err?.message || "Không thể tải dữ liệu kiểm tra.");
    });

  // ====== Modal helpers ======
  function openModal() {
    modal.style.display = "flex";
  }
  function closeModal() {
    modal.style.display = "none";
    clearForm();
  }

  // ====== Form helpers ======
  function getVal(id) {
    return document.getElementById(id)?.value.trim() || "";
  }
  function setVal(id, v) {
    const el = document.getElementById(id);
    if (el) el.value = v ?? "";
  }
  function clearForm() {
    ["ins-name", "ins-date", "ins-checker", "ins-issue"].forEach((id) =>
      setVal(id, "")
    );
  }

  function loadRowToForm(row) {
    setVal("ins-name", row.children[1].textContent);
    setVal("ins-date", row.children[2].textContent);
    setVal("ins-checker", row.children[3].textContent);
    setVal("ins-issue", row.children[4].textContent);
  }

  // ====== Numbering ======
  function renumber() {
    [...tbody.querySelectorAll("tr")].forEach(
      (r, i) => (r.children[0].textContent = i + 1)
    );
    currentIndex = tbody.querySelectorAll("tr").length + 1;
  }

  // ====== Row builders ======
  function makeRow(data, no) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${no}</td>
      <td>${data.name || ""}</td>
      <td>${data.date || ""}</td>
      <td>${data.checker || ""}</td>
      <td style="white-space:pre-wrap;">${data.issue || ""}</td>
    `;
    if (isEditMode()) appendActions(tr);
    return tr;
  }

  // ====== Action column (Edit/Delete) ======
  function appendActions(row) {
    if (row.querySelector("td.actions-col")) return;
    const td = document.createElement("td");
    td.className = "actions-col";
    td.innerHTML = `
      <button class="btn primary edit-btn"   style="margin-right:8px; background:#43ff64d9; color:black; border-radius:5px; border:none; height:30px; width:50px">Edit</button>
      <button class="btn primary delete-btn" style="margin-right:8px; background:red;          color:black; border-radius:5px; border:none; height:30px; width:60px;">Delete</button>
    `;
    row.appendChild(td);

    td.querySelector(".edit-btn")?.addEventListener("click", () => {
      editingRow = row;
      loadRowToForm(row);
      openModal();
    });
    td.querySelector(".delete-btn")?.addEventListener("click", () => {
      if (confirm("Xóa dòng này?")) {
        row.remove();
        renumber();
        updateNoDataRow();
        if (editingRow === row) editingRow = null;
      }
    });
  }

  function removeActions() {
    tbody.querySelectorAll("td.actions-col").forEach((td) => td.remove());
  }

  function ensureHeaderActions(show) {
    const tr = document.querySelector(".table-report thead tr");
    const has = tr.querySelector("th.actions-col");
    if (show && !has) {
      const th = document.createElement("th");
      th.className = "actions-col";
      th.textContent = "Thao tác";
      tr.appendChild(th);
    } else if (!show && has) {
      has.remove();
    }
  }

  // ====== “No data” helper ======
  function updateNoDataRow() {
    const rows = tbody.querySelectorAll("tr");
    const noDataRow = tbody.querySelector(".no-data-row");
    if (rows.length === 0) {
      if (!noDataRow) {
        const tr = document.createElement("tr");
        tr.className = "no-data-row";
        const colspan = isEditMode() ? 6 : 5;
        tr.innerHTML = `<td colspan="${colspan}" style="text-align:center; color:#999;">Không có dữ liệu</td>`;
        tbody.appendChild(tr);
      }
    } else if (noDataRow) {
      noDataRow.remove();
    }
  }

  /* ===================== [PUBLIC API] ===================== */
  // ——— Edit mode state ———
  let _editMode = false;
  function isEditMode() {
    return _editMode;
  }

  // Public: bật/tắt edit mode (được gọi từ file khác, ví dụ report.js)
  window.__setInspectionEditMode = (enabled) => {
    _editMode = !!enabled;
    ensureHeaderActions(_editMode);
    if (_editMode) {
      tbody.querySelectorAll("tr").forEach((r) => {
        if (r.children.length === 5) appendActions(r);
      });
    } else {
      removeActions();
      ensureHeaderActions(false);
    }
    updateNoDataRow();
  };

  // ====== gắn sự kiện cho nút chung “Thêm nội dung” ======
  addBtn?.addEventListener("click", () => {
    editingRow = null;
    clearForm();
    openModal();
  });

  cancelBtn?.addEventListener("click", closeModal);
  modal?.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  saveBtn?.addEventListener("click", () => {
    const data = {
      name: getVal("ins-name"),
      date: getVal("ins-date"),
      checker: getVal("ins-checker"),
      issue: getVal("ins-issue"),
    };
    if (!data.name || !data.date) {
      alert("Vui lòng nhập Tên thiết bị và Ngày.");
      return;
    }
    if (editingRow) {
      editingRow.children[1].textContent = data.name;
      editingRow.children[2].textContent = data.date;
      editingRow.children[3].textContent = data.checker;
      editingRow.children[4].textContent = data.issue;
    } else {
      const row = makeRow(data, currentIndex++);
      tbody.appendChild(row);
    }
    updateNoDataRow();
    closeModal();
  });
}

/* ======================================================================
 * [FETCH] — lấy dữ liệu từ server
 * ----------------------------------------------------------------------
 * - fetchJson(url)
 * - fetchInspection(dateStr): ?date=YYYY-MM-DD hoặc ?all=true
 * ==================================================================== */
async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    const err = new Error(`HTTP ${res.status} - ${t || res.statusText}`);
    err.status = res.status;
    err.url = url;
    throw err;
  }
  return res.json();
}

/** FE logic: có date thì ?date=YYYY-MM-DD, không có thì ?all=true */
async function fetchInspection(dateStr) {
  const safe =
    dateStr && String(dateStr).trim() ? String(dateStr).trim() : null;
  const url = safe
    ? `${API_BASE}?date=${encodeURIComponent(safe)}`
    : `${API_BASE}?all=true`;
  const json = await fetchJson(url);
  return Array.isArray(json?.items)
    ? json.items
    : Array.isArray(json)
    ? json
    : [];
}

/* ======================================================================
 * [SUBMIT] — gửi dữ liệu bảng hiện tại
 * ----------------------------------------------------------------------
 * - API giữ nguyên: export async function submitInspectionReport(date)
 * - Đọc dữ liệu trực tiếp từ tbody (kể cả khi có/không có cột thao tác)
 * ==================================================================== */
export async function submitInspectionReport(date) {
  const tbody = document.getElementById("inspection-tbody");
  if (!tbody) throw new Error("Không tìm thấy bảng kiểm tra thiết bị.");

  const rows = tbody.querySelectorAll("tr");
  if (rows.length === 0) {
    alert("Không có dữ liệu để gửi");
    return;
  }

  const data = [];
  rows.forEach((r, i) => {
    const c = r.children;
    data.push({
      no: i + 1,
      name: c[1].textContent.trim(),
      date: c[2].textContent.trim(),
      checker: c[3].textContent.trim(),
      issue: c[4].textContent.trim(),
    });
  });

  const safe = date && String(date).trim() ? String(date).trim() : null;
  if (!safe) throw new Error("Chọn ngày để lưu báo cáo.");

  const endpoint = `${API_BASE}?date=${encodeURIComponent(safe)}`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items: data }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Lỗi server: ${res.status} - ${txt}`);
  }
}
