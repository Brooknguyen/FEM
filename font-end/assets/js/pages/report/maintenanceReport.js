// maintenanceReport.js
const API_BASE = "http://10.100.201.25:4000/api/mainreport";

export async function renderMaintenanceReport(date) {
  const html = `

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
        <label style="color:black">Nội dung công việc: <input type="text" id="task-content" style="width:100%" placeholder="Sửa máy nén khí 9"/></label><br/><br/>
        <div style="display: flex; gap: 16px; align-items: center; margin-bottom: 16px;">
          <label style="color:black">Ngày thực hiện: 
            <input type="date" id="task-date" style="width: 200px" />
          </label>
          <label style="color:black">Thời gian thực hiện (giờ): 
            <input type="text" id="task-duration" placeholder="VD: 2" style="width: 200px;" />
          </label>
        </div>
        <label style="color:black">Nội dung chi tiết: <br/><textarea id="task-detail" style="width: 100%; height: 80px;"  placeholder="Thay thế controller máy nén khí 9"></textarea></label><br/><br/>
        <label style="color:black">Kết quả: <br/><input type="text" id="task-result" placeholder="OK/NG"/></label><br/><br/>
        <div style="display: flex; gap:16px; align-items: center; margin-bottom: 16px">
          <label style="color:black">Người thực hiện:
            <input type="text" id="task-person" placeholder="Mosantech" style="width: 200px"/>
          </label>
          <label style="color:black">Người giám sát: 
            <input type="text" id="task-supervisor" style="width: 200px" placeholder="Nguyễn Văn A"/>
          </label>
        </div>
        <label style="color:black">Ghi chú: <br/><textarea id="task-note" style="width:100%; height:60px" placeholder="Máy hoạt động bình thường"></textarea></label><br/><br/>

        <div style="text-align:right;">
          <button id="save-task-btn" style="background-color: green; color: white; padding: 6px 12px; border: none; border-radius: 4px;">Thêm</button>
          <button id="cancel-task-btn" style="margin-left: 10px; padding: 6px 12px; border: none; background: #f12a2aff; border-radius: 4px;">Thoát</button>
        </div>
      </div>
    </div>
  `;
  setTimeout(() => setupMaintenanceEvents(date), 50);
  return html;
}

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
        row.innerHTML = `
          <td>${idx + 1}</td>
          <td>${task.content}</td>
          <td>${task.date || task.taskDate || ""}</td>
          <td>${task.duration ?? ""}</td>
          <td style="white-space: pre-wrap;">${task.detail ?? ""}</td>
          <td>${task.result ?? ""}</td>
          <td>${task.person ?? ""}</td>
          <td>${task.supervisor ?? ""}</td>
          <td style="white-space: pre-wrap;">${task.note ?? ""}</td>
        `;
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
    const task = {
      content: getVal("task-content"),
      date: getVal("task-date"),
      duration: getVal("task-duration"),
      detail: getVal("task-detail"),
      result: getVal("task-result"),
      person: getVal("task-person"),
      supervisor: getVal("task-supervisor"),
      note: getVal("task-note"),
    };

    if (!task.content || !task.date) {
      alert("Vui lòng nhập Nội dung công việc và Ngày thực hiện.");
      return;
    }

    if (editingRow) {
      editingRow.children[1].textContent = task.content;
      editingRow.children[2].textContent = task.date;
      editingRow.children[3].textContent = task.duration;
      editingRow.children[4].textContent = task.detail;
      editingRow.children[5].textContent = task.result;
      editingRow.children[6].textContent = task.person;
      editingRow.children[7].textContent = task.supervisor;
      editingRow.children[8].textContent = task.note;
      closeModal();
    } else {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${currentIndex++}</td>
        <td>${task.content}</td>
        <td>${task.date}</td>
        <td>${task.duration}</td>
        <td style="white-space: pre-wrap;">${task.detail}</td>
        <td>${task.result}</td>
        <td>${task.person}</td>
        <td>${task.supervisor}</td>
        <td style="white-space: pre-wrap;">${task.note}</td>
      `;
      tbody.appendChild(row);

      // Nếu đang ở edit mode, thêm cột thao tác cho dòng mới
      if (isEditMode()) appendActionCell(row);

      closeModal();
    }
  });

  // ---------- Helpers ----------
  function getVal(id) {
    return document.getElementById(id)?.value.trim() || "";
  }
  function setVal(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val;
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
    // Nếu đã có cột thao tác thì thôi
    if (row.querySelector("td.actions-col")) return;

    const td = document.createElement("td");
    td.className = "actions-col";
    td.innerHTML = `
      <button  class="btn primary edit-btn" style="margin-right:8px; background:#43ff64d9; color:black; border-radius: 5px; border:none; height: 30px; width:50px">Edit</button>
      <button class="btn primary delete-btn" style="margin-right:8px; background:red; color:black; border-radius: 5px; border:none; height: 30px; width:60px;">Delete</button>
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

  // ——— Edit Mode state ———
  let _editMode = false;
  function isEditMode() {
    return _editMode;
  }

  // Expose 1 hàm công khai để report.js gọi bật/tắt edit mode
  window.__setMaintenanceEditMode = function (enabled) {
    _editMode = !!enabled;
    if (_editMode) {
      ensureActionsHeader(true);
      // Thêm cột thao tác cho tất cả dòng chưa có
      tbody.querySelectorAll("tr").forEach((row) => {
        // chỉ thêm nếu đang thiếu
        if (row.children.length === 9) appendActionCell(row);
      });
    } else {
      // Gỡ sạch cột thao tác
      ensureActionsHeader(false);
      removeActionCells();
    }
  };
}

// ================== FETCH ==================
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

// ================== SUBMIT ==================
export async function submitMaintenanceReport(date) {
  const tbody = document.getElementById("maintenance-tbody");
  if (!tbody) throw new Error("Không tìm thấy bảng báo cáo bảo dưỡng");

  const rows = tbody.querySelectorAll("tr");
  const data = [];

  rows.forEach((row, idx) => {
    const cells = row.children;
    // Lưu ý: khi có edit mode thì có 10 ô (ô cuối là thao tác); khi tắt thì 9 ô.
    data.push({
      no: idx + 1,
      content: cells[1].textContent.trim(),
      date: cells[2].textContent.trim(),
      duration: cells[3].textContent.trim(),
      detail: cells[4].textContent.trim(),
      result: cells[5].textContent.trim(),
      person: cells[6].textContent.trim(),
      supervisor: cells[7].textContent.trim(),
      note: cells[8].textContent.trim(),
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
