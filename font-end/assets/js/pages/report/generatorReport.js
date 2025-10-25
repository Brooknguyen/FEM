// generatorReport.js
// ======================================================================
//  TABLE OF CONTENTS / MỤC LỤC  (KHÔNG ĐỔI LOGIC, CHỈ SẮP XẾP LẠI)
//  [CONFIG]            : API config
//  [TEMPLATE]          : HTML bảng + Modal (string template)
//  [BOOTSTRAP]         : rendergeneratorReport(date) -> gắn HTML + init events
//  [SETUP/EVENTS]      : setupGeneratorEvents(date) (fetch, modal, thêm/sửa/xoá hàng)
//  [ROW HELPERS]       : đọc/ghi giá trị form <-> hàng bảng, cột thao tác
//  [FETCH]             : fetchJson, fetchGeneratorData
//  [SUBMIT]            : submitGeneratorData(date)
//  [EXPORT]            : exportGeneratorReportAsImage(), exportPreviewAsImage()
//  [PUBLIC API]        : window.__setGeneratorEditMode(enabled)
// ======================================================================

/* ======================================================================
 * [CONFIG] — API cấu hình
 * ----------------------------------------------------------------------
 * - 🔧 EDIT HERE khi đổi IP/route BE
 * ==================================================================== */
const API_BASE = "http://10.100.201.25:4000/api/generator"; // 🔧 EDIT HERE

/* ======================================================================
 * [TEMPLATE] — HTML table + modal nhập liệu (giữ nguyên id/tên cũ)
 * ----------------------------------------------------------------------
 * - buildReportHTML(): trả ra full HTML vùng report + modal
 * - Lưu ý: KHÔNG đổi id: #generator-report-wrapper, #generator-tbody, ...
 * ==================================================================== */
function buildReportHTML() {
  return `
  <!-- Vùng bọc để export -->
  <div id="generator-report-wrapper" style="overflow-x: auto; width: 100%;">
    <style>
      .table-report {
        border-collapse: collapse;
        width: max-content;
        min-width: 100%;
        text-align: center;
        border: 1px solid var(--fg);
      }
      .table-report th,
      .table-report td {
        border: 1px solid var(--fg);
        padding: 4px;
      }
    </style>
    <table class="table-report" cellspacing="0" cellpadding="4">
      <thead>
        <tr>
          <th rowspan="2">No</th>
          <th rowspan="2">Ngày</th>
          <th rowspan="2">Thời gian</th>
          <th rowspan="2">Người vận hành</th>
          <th rowspan="2">Nội dung vận hành</th>
          <th rowspan="2">Engine speed (RPM)</th>
          <th colspan="3">Voltage</th>
          <th rowspan="2">Load (kW)</th>
          <th rowspan="2">Load (%)</th>
          <th rowspan="2">Frequency (Hz)</th>
          <th rowspan="2">Coolant temp (°C)</th>
          <th rowspan="2">Oil pressure (bar)</th>
          <th rowspan="2">Lượng sử dụng dầu (L)</th>
          <th rowspan="2">Engine run time</th>
          <th rowspan="2">Ghi chú/ Sự cố</th>
        </tr>
        <tr>
          <th>RS (V)</th>
          <th>ST (V)</th>
          <th>TR (V)</th>
        </tr>
      </thead>
      <tbody id="generator-tbody"></tbody>
    </table>
  </div>

  <!-- Modal nhập liệu -->
  <div id="modal-overlay" style="display:none; position: fixed; top:0; left:0; width:100%; height:100%; background: rgba(0,0,0,0.5); z-index:1000; justify-content: center; align-items:center;">
    <div style="background: white; padding:20px; border-radius: 8px; width:700px; max-width:90%; overflow-y: auto; max-height: 90vh;">
      <h3 style="color:black; text-align:center">Nội dung vận hành</h3>

      <form id="generator-form" onsubmit="return false;">
        <div style="display:flex; gap:16px; margin-bottom:10px">
          <label style="flex:1; color:black">Ngày:
            <input type="date" id="task-date" required style="width:100%"/>
          </label>
          <label style="flex:1; color:black">Thời gian:
            <input type="time" id="task-time" required style="width:100%"/>
          </label>
          <label style="flex:1; color:black">Người vận hành:
            <input type="text" id="task-person" required style="width:100%" placeholder="Nguyễn Văn A"/>
          </label>
        </div>

        <label style="color:black">Nội dung vận hành:
          <input type="text" id="task-content" required style="width:100%" placeholder="Chạy test máy..."/>
        </label><br/><br/>

        <div style="display:flex; gap:10px; margin-bottom:10px">
          <label style="flex:1; color:black">Engine speed (RPM):
            <input type="number" id="engine-speed" style="width:100%"/>
          </label>
          <label style="flex:1; color:black">Voltage RS:
            <input type="number" id="voltage-rs" style="width:100%"/>
          </label>
          <label style="flex:1; color:black">Voltage ST:
            <input type="number" id="voltage-st" style="width:100%"/>
          </label>
          <label style="flex:1; color:black">Voltage TR:
            <input type="number" id="voltage-tr" style="width:100%"/>
          </label>
        </div>

        <div style="display:flex; gap:10px; margin-bottom:10px">
          <label style="flex:1; color:black">Load (kW):
            <input type="number" id="load-kw" style="width:100%"/>
          </label>
          <label style="flex:1; color:black">Load (%):
            <input type="number" id="load-percent" style="width:100%"/>
          </label>
          <label style="flex:1; color:black">Frequency (Hz):
            <input type="number" id="frequency" style="width:100%"/>
          </label>
        </div>

        <div style="display:flex; gap:10px; margin-bottom:10px">
          <label style="flex:1; color:black">Coolant temp (°C):
            <input type="number" id="coolant-temp" style="width:100%"/>
          </label>
          <label style="flex:1; color:black">Oil pressure (bar):
            <input type="number" id="oil-pressure" style="width:100%"/>
          </label>
          <label style="flex:1; color:black">Dầu sử dụng (L):
            <input type="number" id="oil-usage" style="width:100%"/>
          </label>
          <label style="flex:1; color:black">Engine run time:
            <input type="text" id="engine-runtime" style="width:100%" placeholder="00:45:00"/>
          </label>
        </div>

        <label style="color:black">Ghi chú / Sự cố:
          <textarea id="task-note" style="width:100%; height:60px;" placeholder="Ghi chú nếu có..."></textarea>
        </label><br/><br/>

        <div style="text-align:right">
          <button type="button" id="save-task-btn" class="btn primary" style="padding:8px 30px; background-color:green; color:white; border:none; height:36px">Lưu</button>
          <button type="button" id="cancel-task-btn" class="btn primary" style="padding:10px 30px; margin-left: 4px; background-color:#f12a2a; height:36px; border:none; color:white">Thoát</button>
        </div>
      </form>
    </div>
  </div>
  `;
}

/* ======================================================================
 * [BOOTSTRAP] — Render + khởi tạo
 * ----------------------------------------------------------------------
 * - API giữ nguyên: export function rendergeneratorReport(date)
 * - Thêm delay ngắn để DOM có thời gian gắn vào document trước khi bind
 * ==================================================================== */
export function rendergeneratorReport(date) {
  const html = buildReportHTML();
  setTimeout(() => setupGeneratorEvents(date), 50); // giữ nguyên hành vi
  return html;
}

/* ======================================================================
 * [SETUP/EVENTS] — Fetch dữ liệu, mở/đóng modal, thêm/sửa/xoá dòng
 * ----------------------------------------------------------------------
 * - setupGeneratorEvents(date): gắn toàn bộ sự kiện cần thiết
 * - Không đổi id hoặc text các nút/ô input
 * ==================================================================== */
function setupGeneratorEvents(date) {
  const addBtn = document.getElementById("add-task-btn");
  const modal = document.getElementById("modal-overlay");
  const saveBtn = document.getElementById("save-task-btn");
  const cancelBtn = document.getElementById("cancel-task-btn");
  const tbody = document.getElementById("generator-tbody");

  let currentIndex = 1;
  let editingRow = null;

  // ---------- FETCH DATA ----------
  fetchGeneratorData(date)
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
      console.error("Lỗi khi fetch dữ liệu generator:", err);
      alert(err?.message || "Không thể tải dữ liệu báo cáo từ server.");
    });

  // ---------- Modal ----------
  addBtn?.addEventListener("click", () => {
    editingRow = null;
    clearForm();
    setSaveBtnText("Lưu");
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
    if (!task.date || !task.time || !task.person || !task.content) {
      alert(
        "Vui lòng nhập Ngày, Thời gian, Người vận hành và Nội dung vận hành."
      );
      return;
    }

    if (editingRow) {
      assignRowFromTask(editingRow, task);
      closeModal();
    } else {
      const row = document.createElement("tr");
      row.innerHTML = rowInnerHTMLFromTask(task, currentIndex++);
      tbody.appendChild(row);
      if (isEditMode()) appendActionCell(row);
      closeModal();
    }
  });

  // ---------- Helpers (form + modal) ----------
  function getVal(id) {
    return document.getElementById(id)?.value.trim() || "";
  }
  function setVal(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val ?? "";
  }
  function setSaveBtnText(text) {
    const btn = document.getElementById("save-task-btn");
    if (btn) btn.textContent = text;
  }

  function clearForm() {
    [
      "task-date",
      "task-time",
      "task-person",
      "task-content",
      "engine-speed",
      "voltage-rs",
      "voltage-st",
      "voltage-tr",
      "load-kw",
      "load-percent",
      "frequency",
      "coolant-temp",
      "oil-pressure",
      "oil-usage",
      "engine-runtime",
      "task-note",
    ].forEach((id) => setVal(id, ""));
  }

  function collectFormData() {
    return {
      date: getVal("task-date"),
      time: getVal("task-time"),
      person: getVal("task-person"),
      content: getVal("task-content"),
      engineSpeed: getVal("engine-speed"),
      voltageRS: getVal("voltage-rs"),
      voltageST: getVal("voltage-st"),
      voltageTR: getVal("voltage-tr"),
      loadKW: getVal("load-kw"),
      loadPercent: getVal("load-percent"),
      frequency: getVal("frequency"),
      coolantTemp: getVal("coolant-temp"),
      oilPressure: getVal("oil-pressure"),
      oilUsage: getVal("oil-usage"),
      engineRuntime: getVal("engine-runtime"),
      note: getVal("task-note"),
    };
  }

  function loadRowToForm(row) {
    setVal("task-date", row.children[1].textContent);
    setVal("task-time", row.children[2].textContent);
    setVal("task-person", row.children[3].textContent);
    setVal("task-content", row.children[4].textContent);
    setVal("engine-speed", row.children[5].textContent);
    setVal("voltage-rs", row.children[6].textContent);
    setVal("voltage-st", row.children[7].textContent);
    setVal("voltage-tr", row.children[8].textContent);
    setVal("load-kw", row.children[9].textContent);
    setVal("load-percent", row.children[10].textContent);
    setVal("frequency", row.children[11].textContent);
    setVal("coolant-temp", row.children[12].textContent);
    setVal("oil-pressure", row.children[13].textContent);
    setVal("oil-usage", row.children[14].textContent);
    setVal("engine-runtime", row.children[15].textContent);
    setVal("task-note", row.children[16].textContent);
  }

  function assignRowFromTask(row, t) {
    row.children[1].textContent = t.date;
    row.children[2].textContent = t.time;
    row.children[3].textContent = t.person;
    row.children[4].textContent = t.content;
    row.children[5].textContent = t.engineSpeed;
    row.children[6].textContent = t.voltageRS;
    row.children[7].textContent = t.voltageST;
    row.children[8].textContent = t.voltageTR;
    row.children[9].textContent = t.loadKW;
    row.children[10].textContent = t.loadPercent;
    row.children[11].textContent = t.frequency;
    row.children[12].textContent = t.coolantTemp;
    row.children[13].textContent = t.oilPressure;
    row.children[14].textContent = t.oilUsage;
    row.children[15].textContent = t.engineRuntime;
    row.children[16].textContent = t.note;
  }

  function rowInnerHTMLFromTask(t, no) {
    return `
      <td>${no}</td>
      <td>${t.date || ""}</td>
      <td>${t.time || ""}</td>
      <td>${t.person || ""}</td>
      <td style="white-space: pre-wrap;">${t.content || ""}</td>
      <td>${t.engineSpeed ?? ""}</td>
      <td>${t.voltageRS ?? ""}</td>
      <td>${t.voltageST ?? ""}</td>
      <td>${t.voltageTR ?? ""}</td>
      <td>${t.loadKW ?? ""}</td>
      <td>${t.loadPercent ?? ""}</td>
      <td>${t.frequency ?? ""}</td>
      <td>${t.coolantTemp ?? ""}</td>
      <td>${t.oilPressure ?? ""}</td>
      <td>${t.oilUsage ?? ""}</td>
      <td>${t.engineRuntime ?? ""}</td>
      <td style="white-space: pre-wrap">${t.note ?? ""}</td>
    `;
  }

  function attachRowActions(row) {
    const edit = row.querySelector(".edit-btn");
    const del = row.querySelector(".delete-btn");
    edit?.addEventListener("click", () => {
      editingRow = row;
      loadRowToForm(row);
      setSaveBtnText("Cập nhật");
      modal.style.display = "flex";
    });
    del?.addEventListener("click", () => {
      if (confirm("Bạn có chắc muốn xóa dòng này không?")) {
        row.remove();
        updateRowIndices();
        if (editingRow === row) editingRow = null;
      }
    });
  }

  function appendActionCell(row) {
    // Đã có cột thao tác? bỏ qua
    if (row.querySelector("td.actions-col")) return;
    const td = document.createElement("td");
    td.className = "actions-col";
    td.innerHTML = `
      <button class="btn primary edit-btn" style="margin-right:8px; background:#43ff64d9; color:black; border-radius: 5px; border:none; height: 30px; width:50px">Edit</button>
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
    const headerRows = table?.querySelectorAll("thead tr");
    if (!headerRows || headerRows.length < 2) return;

    const mainHeader = headerRows[0];
    const has = mainHeader.querySelector("th.actions-col");

    if (exist && !has) {
      const th = document.createElement("th");
      th.className = "actions-col";
      th.textContent = "Thao tác";
      th.setAttribute("rowspan", "2");
      mainHeader.appendChild(th);
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

  // ====== Edit Mode state & Public API ======
  let _editMode = false;
  function isEditMode() {
    return _editMode;
  }

  // Public: bật/tắt edit mode (được gọi từ file khác)
  window.__setGeneratorEditMode = function (enabled) {
    _editMode = !!enabled;
    if (_editMode) {
      ensureActionsHeader(true);
      tbody.querySelectorAll("tr").forEach((row) => {
        // Bảng dữ liệu có 17 cột; thêm 1 cột thao tác => 18
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
 * - fetchGeneratorData(dateStr): ?date=YYYY-MM-DD hoặc ?all=true
 * ==================================================================== */
async function fetchJson(url) {
  console.info("[generator] TRY:", url);
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
async function fetchGeneratorData(dateStr) {
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
 * - API giữ nguyên: export async function submitGeneratorData(date)
 * - Đọc dữ liệu trực tiếp từ tbody (kể cả khi có/không có cột thao tác)
 * ==================================================================== */
export async function submitGeneratorData(date) {
  const tbody = document.getElementById("generator-tbody");
  if (!tbody) throw new Error("Không tìm thấy tbody để cập nhật");

  const rows = tbody.querySelectorAll("tr");
  const data = [];
  rows.forEach((row, idx) => {
    const c = row.children;
    // Bảng dữ liệu có 17 cột dữ liệu cố định (0..16). Nếu có thêm cột thao tác sẽ là 18.
    data.push({
      no: idx + 1,
      date: c[1].textContent.trim(),
      time: c[2].textContent.trim(),
      person: c[3].textContent.trim(),
      content: c[4].textContent.trim(),
      engineSpeed: c[5].textContent.trim(),
      voltageRS: c[6].textContent.trim(),
      voltageST: c[7].textContent.trim(),
      voltageTR: c[8].textContent.trim(),
      loadKW: c[9].textContent.trim(),
      loadPercent: c[10].textContent.trim(),
      frequency: c[11].textContent.trim(),
      coolantTemp: c[12].textContent.trim(),
      oilPressure: c[13].textContent.trim(),
      oilUsage: c[14].textContent.trim(),
      engineRuntime: c[15].textContent.trim(),
      note: c[16].textContent.trim(),
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
  } catch (error) {
    alert(`Lỗi: ${error.message}`);
    throw error;
  }
}

/* ======================================================================
 * [EXPORT] — Xuất ảnh báo cáo
 * ----------------------------------------------------------------------
 * - exportGeneratorReportAsImage({ fileName, fitWidth, renderScale, minScale })
 *   → Chụp toàn bảng (kể cả phần overflow-x)
 * - exportPreviewAsImage(selector, { fileName, renderScale })
 *   → Chụp đúng khung preview đang hiển thị
 * - Yêu cầu html2canvas đã được load trước
 * ==================================================================== */
export async function exportGeneratorReportAsImage({
  fileName = "generator-report.png",
  fitWidth = 1400, // null để giữ kích thước thật; nếu có -> scale vừa khung
  renderScale = 2,
  minScale = 0.5,
} = {}) {
  if (typeof html2canvas !== "function") {
    alert("Thiếu html2canvas. Hãy import thư viện trước khi xuất ảnh.");
    return;
  }

  const src = document.getElementById("generator-report-wrapper");
  if (!src) {
    alert("Không tìm thấy vùng bảng để xuất ảnh");
    return;
  }

  // Clone để không ảnh hưởng UI và bỏ overflow
  const clone = src.cloneNode(true);
  clone.id = "";
  clone.style.overflow = "visible";
  clone.style.width = "auto";
  clone.style.maxWidth = "none";

  // Stage tạm ngoài viewport
  const stage = document.createElement("div");
  stage.style.position = "fixed";
  stage.style.left = "-100000px";
  stage.style.top = "0";
  stage.style.background = "white";
  stage.appendChild(clone);
  document.body.appendChild(stage);

  await new Promise((r) => requestAnimationFrame(r));

  const table = clone.querySelector(".table-report") || clone;
  const fullW = table.scrollWidth;
  const fullH = table.scrollHeight;

  let scale = 1;
  if (fitWidth && fullW > fitWidth) {
    scale = Math.max(minScale, fitWidth / fullW);
  }
  clone.style.transformOrigin = "top left";
  clone.style.transform = `scale(${scale})`;

  stage.style.width = Math.ceil(fullW * scale) + "px";
  stage.style.height = Math.ceil(fullH * scale) + "px";

  try {
    const canvas = await html2canvas(stage, {
      backgroundColor: "#ffffff",
      scale: renderScale,
      useCORS: true,
      logging: false,
    });
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
  } finally {
    document.body.removeChild(stage);
  }
}

export async function exportPreviewAsImage(
  selector = "#generator-preview",
  { fileName = "generator-preview.png", renderScale = 2 } = {}
) {
  if (typeof html2canvas !== "function") {
    alert("Thiếu html2canvas. Hãy import thư viện trước khi xuất ảnh.");
    return;
  }

  const el =
    typeof selector === "string" ? document.querySelector(selector) : selector;
  if (!el) {
    alert("Không tìm thấy phần tử preview để xuất ảnh");
    return;
  }

  const canvas = await html2canvas(el, {
    backgroundColor: "#ffffff",
    scale: renderScale,
    useCORS: true,
    logging: false,
  });

  const url = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
}

// (Tùy chọn) gán global test nhanh:
// window.__exportGenFull    = (opts)          => exportGeneratorReportAsImage(opts);
// window.__exportGenPreview = (sel, opts)     => exportPreviewAsImage(sel, opts);
