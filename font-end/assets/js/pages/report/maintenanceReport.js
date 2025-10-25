// maintenanceReport.js
// ======================================================================
//  TABLE OF CONTENTS / MỤC LỤC  (KHÔNG ĐỔI LOGIC, CHỈ SẮP XẾP LẠI)
//  [CONFIG]            : API config
//  [TEMPLATE]          : HTML bảng + Modal (string template)
//  [BOOTSTRAP]         : renderMaintenanceReport(date) -> gắn HTML + init events
//  [SETUP/EVENTS]      : setupMaintenanceEvents(date) (fetch, modal, thêm/sửa/xoá)
//  [ROW HELPERS]       : đọc/ghi form <-> hàng bảng, header/cột Thao tác
//  [FETCH]             : fetchJson, fetchMainReport
//  [SUBMIT]            : submitMaintenanceReport(date)
//  [PUBLIC API]        : window.__setMaintenanceEditMode(enabled)
// ======================================================================

/* ======================================================================
 * [CONFIG] — API cấu hình
 * ----------------------------------------------------------------------
 * - 🔧 EDIT HERE khi đổi IP/route BE
 * ==================================================================== */
const API_BASE = "http://10.100.201.25:4000/api/mainreport"; // 🔧 EDIT HERE

/* ======================================================================
 * [TEMPLATE] — HTML table + modal (giữ nguyên id/tên cũ)
 * ----------------------------------------------------------------------
 * - buildReportHTML(): trả về full HTML của bảng + modal
 * - KHÔNG đổi id: #maintenance-tbody, #modal-overlay, #save-task-btn, ...
 * ==================================================================== */
function buildReportHTML() {
  return `
    <table class="table-report">
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
          <th>No</th>
          <th>Nội dung công việc</th>
          <th>Ngày thực hiện</th>
          <th>Thời gian (h)</th>
          <th>Nội dung chi tiết</th>
          <th>Kết quả</th>
          <th>Người thực hiện</th>
          <th>Người giám sát</th>
          <th>Ghi chú</th>
          <!-- KHÔNG thêm th "Thao tác" ở đây; sẽ thêm/đổi động bằng code -->
        </tr>
      </thead>
      <tbody id="maintenance-tbody"></tbody>
    </table>

    <!-- Modal -->
    <div id="modal-overlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:1000; justify-content:center; align-items:center;">
      <div style="background:white; padding:20px; border-radius:8px; width:500px; max-width:90%;">
        <h3 style="color:black; text-align:center;">Thêm nội dung</h3>

        <label style="color:black">Nội dung công việc:
          <input type="text" id="task-content" style="width:100%" placeholder="Sửa máy nén khí 9"/>
        </label><br/><br/>

        <div style="display:flex; gap:16px; align-items:center; margin-bottom:16px;">
          <label style="color:black">Ngày thực hiện:
            <input type="date" id="task-date" style="width:200px"/>
          </label>
          <label style="color:black">Thời gian thực hiện (giờ):
            <input type="text" id="task-duration" placeholder="VD: 2" style="width:200px;"/>
          </label>
        </div>

        <label style="color:black">Nội dung chi tiết:
          <br/><textarea id="task-detail" style="width:100%; height:80px;" placeholder="Thay thế controller máy nén khí 9"></textarea>
        </label><br/><br/>

        <label style="color:black">Kết quả:
          <br/><input type="text" id="task-result" placeholder="OK/NG"/>
        </label><br/><br/>

        <div style="display:flex; gap:16px; align-items:center; margin-bottom:16px;">
          <label style="color:black">Người thực hiện:
            <input type="text" id="task-person" placeholder="Mosantech" style="width:200px"/>
          </label>
          <label style="color:black">Người giám sát:
            <input type="text" id="task-supervisor" style="width:200px" placeholder="Nguyễn Văn A"/>
          </label>
        </div>

        <label style="color:black">Ghi chú:
          <br/><textarea id="task-note" style="width:100%; height:60px" placeholder="Máy hoạt động bình thường"></textarea>
        </label><br/><br/>

        <div style="text-align:right;">
          <button id="save-task-btn" style="background-color:green; color:white; padding:6px 12px; border:none; border-radius:4px;">Thêm</button>
          <button id="cancel-task-btn" style="margin-left:10px; padding:6px 12px; border:none; background:#f12a2a; border-radius:4px; color:white;">Thoát</button>
        </div>
      </div>
    </div>
  `;
}

/* ======================================================================
 * [BOOTSTRAP] — Render + khởi tạo
 * ----------------------------------------------------------------------
 * - API giữ nguyên: export async function renderMaintenanceReport(date)
 * - Thêm delay ngắn để DOM sẵn sàng trước khi bind
 * ==================================================================== */
export async function renderMaintenanceReport(date) {
  const html = buildReportHTML();
  setTimeout(() => setupMaintenanceEvents(date), 50); // giữ nguyên hành vi
  return html;
}

/* ======================================================================
 * [SETUP/EVENTS] — Fetch dữ liệu, Modal, Thêm/Sửa/Xoá hàng
 * ----------------------------------------------------------------------
 * - Không đổi id hoặc text các nút/ô input
 * ==================================================================== */
function setupMaintenanceEvents(date) {
  const addBtn = document.getElementById("add-task-btn");
  const modal = document.getElementById("modal-overlay");
  const saveBtn = document.getElementById("save-task-btn");
  const cancelBtn = document.getElementById("cancel-task-btn");
  const tbody = document.getElementById("maintenance-tbody");

  let currentIndex = 1;
  let editingRow = null;

  // ---------- FETCH DATA ----------
  fetchMainReport(date)
    .then((items) => {
      if (!Array.isArray(items)) return;
      items.forEach((task, idx) => {
        const row = document.createElement("tr");
        row.innerHTML = rowInnerHTMLFromTask(task, idx + 1);
        tbody.appendChild(row);
        currentIndex = idx + 2;
      });
    })
    .catch((err) => {
      console.error("Lỗi khi fetch dữ liệu:", err);
      alert(err?.message || "Không thể tải dữ liệu báo cáo từ server.");
    });

  // ---------- Modal ----------
  addBtn?.addEventListener("click", () => {
    editingRow = null;
    clearForm();
    saveBtn.textContent = "Thêm";
    modal.style.display = "flex";
  });

  cancelBtn?.addEventListener("click", closeModal);
  modal?.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  function closeModal() {
    modal.style.display = "none";
    clearForm();
  }

  // ---------- Save (Thêm/Cập nhật) ----------
  saveBtn?.addEventListener("click", () => {
    const task = collectFormData();
    if (!task.content || !task.date) {
      alert("Vui lòng nhập Nội dung công việc và Ngày thực hiện.");
      return;
    }

    if (editingRow) {
      // cập nhật dòng đang chỉnh
      assignRowFromTask(editingRow, task);
      closeModal();
    } else {
      // thêm dòng mới
      const row = document.createElement("tr");
      row.innerHTML = rowInnerHTMLFromTask(task, currentIndex++);
      tbody.appendChild(row);
      if (isEditMode()) appendActionCell(row); // nếu đang edit-mode
      closeModal();
    }
  });

  /* ===================== [ROW HELPERS] ===================== */

  function rowInnerHTMLFromTask(task, no) {
    return `
      <td>${no}</td>
      <td>${task.content ?? ""}</td>
      <td>${task.date || task.taskDate || ""}</td>
      <td>${task.duration ?? ""}</td>
      <td style="white-space: pre-wrap;">${task.detail ?? ""}</td>
      <td>${task.result ?? ""}</td>
      <td>${task.person ?? ""}</td>
      <td>${task.supervisor ?? ""}</td>
      <td style="white-space: pre-wrap;">${task.note ?? ""}</td>
    `;
  }

  // ---- Form helpers ----
  function getVal(id) {
    return document.getElementById(id)?.value.trim() || "";
  }
  function setVal(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val ?? "";
  }
  function clearForm() {
    [
      "task-content",
      "task-date",
      "task-duration",
      "task-detail",
      "task-result",
      "task-person",
      "task-supervisor",
      "task-note",
    ].forEach((id) => setVal(id, ""));
  }
  function collectFormData() {
    return {
      content: getVal("task-content"),
      date: getVal("task-date"),
      duration: getVal("task-duration"),
      detail: getVal("task-detail"),
      result: getVal("task-result"),
      person: getVal("task-person"),
      supervisor: getVal("task-supervisor"),
      note: getVal("task-note"),
    };
  }
  function loadRowToForm(row) {
    setVal("task-content", row.children[1].textContent);
    setVal("task-date", row.children[2].textContent);
    setVal("task-duration", row.children[3].textContent);
    setVal("task-detail", row.children[4].textContent);
    setVal("task-result", row.children[5].textContent);
    setVal("task-person", row.children[6].textContent);
    setVal("task-supervisor", row.children[7].textContent);
    setVal("task-note", row.children[8].textContent);
  }
  function assignRowFromTask(row, t) {
    row.children[1].textContent = t.content;
    row.children[2].textContent = t.date;
    row.children[3].textContent = t.duration;
    row.children[4].textContent = t.detail;
    row.children[5].textContent = t.result;
    row.children[6].textContent = t.person;
    row.children[7].textContent = t.supervisor;
    row.children[8].textContent = t.note;
  }

  // ---- Action column (Edit/Delete) ----
  function attachRowActions(row) {
    const edit = row.querySelector(".edit-btn");
    const del = row.querySelector(".delete-btn");
    edit?.addEventListener("click", () => {
      editingRow = row;
      loadRowToForm(row);
      const btn = document.getElementById("save-task-btn");
      if (btn) btn.textContent = "Cập nhật";
      modal.style.display = "flex";
    });
    del?.addEventListener("click", () => {
      if (confirm("Bạn có chắc muốn xóa công việc này không?")) {
        row.remove();
        updateRowIndices();
        if (editingRow === row) editingRow = null;
      }
    });
  }
  function appendActionCell(row) {
    if (row.querySelector("td.actions-col")) return; // tránh trùng
    const td = document.createElement("td");
    td.className = "actions-col";
    td.innerHTML = `
      <button class="btn primary edit-btn" style="margin-right:8px; background:#43ff64d9; color:black; border-radius:5px; border:none; height:30px; width:50px">Edit</button>
      <button class="btn primary delete-btn" style="margin-right:8px; background:red; color:black; border-radius:5px; border:none; height:30px; width:60px;">Delete</button>
    `;
    row.appendChild(td);
    attachRowActions(row);
  }
  function removeActionCells() {
    tbody.querySelectorAll("td.actions-col").forEach((td) => td.remove());
  }
  function ensureActionsHeader(exist) {
    const table = document.querySelector(".table-report");
    const tr = table?.querySelector("thead tr");
    if (!tr) return;

    const has = tr.querySelector("th.actions-col");
    if (exist && !has) {
      const th = document.createElement("th");
      th.className = "actions-col";
      th.textContent = "Thao tác";
      tr.appendChild(th);
    } else if (!exist && has) {
      has.remove();
    }
  }
  function updateRowIndices() {
    const rows = tbody.querySelectorAll("tr");
    let idx = 1;
    rows.forEach((r) => {
      r.children[0].textContent = idx++;
    });
    currentIndex = idx;
  }

  /* ===================== [PUBLIC API] ===================== */
  // ——— Edit Mode state ———
  let _editMode = false;
  function isEditMode() {
    return _editMode;
  }

  // Public: bật/tắt edit mode (được gọi từ file khác, ví dụ report.js)
  window.__setMaintenanceEditMode = function (enabled) {
    _editMode = !!enabled;
    if (_editMode) {
      ensureActionsHeader(true);
      tbody.querySelectorAll("tr").forEach((row) => {
        if (!row.querySelector("td.actions-col")) appendActionCell(row);
      });
    } else {
      ensureActionsHeader(false);
      removeActionCells();
    }
  };
}

/* ======================================================================
 * [FETCH] — lấy dữ liệu từ server
 * ----------------------------------------------------------------------
 * - fetchJson(url)
 * - fetchMainReport(dateStr): ?date=YYYY-MM-DD hoặc ?all=true
 * ==================================================================== */
async function fetchJson(url) {
  console.info("[mainreport] TRY:", url);
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(`HTTP ${res.status} - ${text || res.statusText}`);
    err.status = res.status;
    err.url = url;
    throw err;
  }
  return res.json();
}

/**
 * FE logic:
 *  - Nếu có date: GET ?date=YYYY-MM-DD
 *  - Nếu không có date: GET ?all=true (cần BE support)
 */
async function fetchMainReport(dateStr) {
  const safeDate =
    dateStr && String(dateStr).trim() ? String(dateStr).trim() : null;
  const url = safeDate
    ? `${API_BASE}?date=${encodeURIComponent(safeDate)}`
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
 * - API giữ nguyên: export async function submitMaintenanceReport(date)
 * - Đọc dữ liệu trực tiếp từ tbody (kể cả khi có/không có cột thao tác)
 * ==================================================================== */
export async function submitMaintenanceReport(date) {
  const tbody = document.getElementById("maintenance-tbody");
  if (!tbody) throw new Error("Không tìm thấy bảng báo cáo bảo dưỡng");

  const rows = tbody.querySelectorAll("tr");
  const data = [];

  rows.forEach((row, idx) => {
    const c = row.children;
    data.push({
      no: idx + 1,
      content: c[1].textContent.trim(),
      date: c[2].textContent.trim(),
      duration: c[3].textContent.trim(),
      detail: c[4].textContent.trim(),
      result: c[5].textContent.trim(),
      person: c[6].textContent.trim(),
      supervisor: c[7].textContent.trim(),
      note: c[8].textContent.trim(),
    });
  });

  if (data.length === 0) {
    alert("Không có dữ liệu để gửi");
    return;
  }

  const safeDate = date && String(date).trim() ? String(date).trim() : null;
  if (!safeDate) {
    alert("Chọn ngày thực hiện");
    return;
  }

  const endpoint = `${API_BASE}?date=${encodeURIComponent(safeDate)}`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: data }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Lỗi server: ${response.status} - ${errorText}`);
    }

    alert("Cập nhật thành công!");
  } catch (error) {
    alert(`Lỗi: ${error.message}`);
    throw error;
  }
}
