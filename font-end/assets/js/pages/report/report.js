//report.js
import { renderFilterReport } from "./filterAHU.js";
import { renderDailyWorkReport } from "./dailywork.js";
import { renderInnovateReport } from "./innovateReport.js";
import {
  renderMaintenanceReport,
  submitMaintenanceReport,
} from "./maintenanceReport.js";

export async function renderMaintenance() {
  return `
    <section class="card p-4" id="report-section">
      <h2 id="report-title" class="text-xl font-bold mb-4" style="text-align:center; font-weight:700">BÁO CÁO</h2>

      <div class="toolbar" style="display:flex;gap:12px;align-items:center;margin-bottom:12px">
        <label style="font-weight:600">Loại báo cáo:
          <select id="report-type" style="padding:8px 10px;border:1px solid #ddd;border-radius:8px">
            <option value="filterAHU">Báo cáo thay thế OA filter</option>
            <option value="dailywork">Báo cáo công việc hàng ngày</option>
            <option value="innovateReport">Báo cáo cải tiến</option>
            <option value="maintenanceReport">Lịch sử sửa chữa bảo dưỡng</option>
          </select>
        </label>
        
        <label style="font-weight:600">Ngày:
          <input type="date" id="filter-date" style="padding:8px 10px; border:1px solid #ddd; border-radius:8px" />
        </label>
        <button id="add-task-btn" class="btn primary" style="padding:8px 12px; background-color: #1976d2; color:white; border:none; border-radius: 4px; cursor:pointer; display:none">
          ➕ Thêm nội dung
        </button>

        <div id="switch-btn" style="display: flex; gap: 10px; margin-left: 900px">
          <button id="edit-report" class="btn primary" style="
            padding: 8px 20px; 
            border-radius: 8px; 
            background: #e17eeeff; 
            color: black; 
            border: none; 
            display: inline-flex; 
            align-items: center; 
            gap: 8px; 
            white-space: nowrap;
            height: 36px; /* hoặc chiều cao phù hợp */
          ">
            <img src="assets/pictures/edit.png" alt="Mô tả ảnh" width="20" height="20" />
            Báo cáo
          </button>
          <button id="update-report" class="btn primary" style="
            padding: 8px 20px; 
            border-radius:8px; 
            background: #7eee8bff; 
            color: black; 
            border:none; 
            display: none;
            align-items: center;
            gap: 8px;
            white-space: nowrap;
            height:36px;
          ">
            <img src="assets/pictures/update.png" alt="Mô tả ảnh" width="20" height="20" />
            Cập nhật
          </button>
          <button id="exit" class="btn primary" style="
            padding: 8px 20px; 
            border-radius:8px; 
            background: #f25a34ff; 
            color: black; 
            border:none; 
            display: none;
            align-items:center;
            gap:8px;
            white-space:nowrap;
            height:36px
            ">
            <img src="assets/pictures/remove.png" alt="Mô tả ảnh" width="20" height="15" />
            Thoát
          </button>
        </div>

      </div>

      <div id="report-container"></div>
    </section>
  `;
}

export function setupReportEvents() {
  const select = document.getElementById("report-type");
  const dateInput = document.getElementById("filter-date");
  const container = document.getElementById("report-container");
  const title = document.getElementById("report-title");
  const updateBtn = document.getElementById("update-report");
  const editBtn = document.getElementById("edit-report");
  const exitBtn = document.getElementById("exit");

  if (!select || !container || !dateInput || !title || !updateBtn) return;

  // Đặt ngày mặc định là hôm nay (định dạng yyyy-MM-dd để input date hiểu)
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");

  if (select.value !== "maintenanceReport") {
    dateInput.value = `${yyyy}-${mm}-${dd}`;
  } else {
    dateInput.value = ""; // maintenanceReport: không tự set hôm nay
  }

  const map = {
    filterAHU: renderFilterReport,
    dailywork: renderDailyWorkReport,
    innovateReport: renderInnovateReport,
    maintenanceReport: renderMaintenanceReport,
  };

  const titles = {
    filterAHU: "BÁO CÁO THAY THẾ OA FILTER",
    dailywork: "BÁO CÁO CÔNG VIỆC HÀNG NGÀY",
    innovateReport: "BÁO CÁO CẢI TIẾN",
    maintenanceReport: "LỊCH SỬ SỬA CHỮA BẢO DƯỠNG",
  };

  // Hàm format ngày yyyy-MM-dd => yyyy/MM/dd
  function formatDateToSlash(dateStr) {
    if (!dateStr) return "";
    return dateStr.replace(/-/g, "/");
  }

  async function renderSelectedReport() {
    const type = select.value; // filterAHU | dailywork | innovateReport | maintenanceReport

    const date = dateInput.value; // yyyy-MM-dd
    const titleText = titles[type] || "";
    const formattedDate = formatDateToSlash(date); // yyyy/MM/dd

    // 1) Cập nhật tiêu đề
    if (titleText !== "LỊCH SỬ SỬA CHỮA BẢO DƯỠNG") {
      title.textContent =
        titleText + (formattedDate ? ` - ${formattedDate}` : "");
    } else {
      title.textContent = titleText;
    }

    // 2) Reset về chế độ xem (view mode) cho thanh công cụ
    const addBtnEl = document.getElementById("add-task-btn");
    const editBtnEl = document.getElementById("edit-report");
    const updateBtnEl = document.getElementById("update-report");
    const exitBtnEl = document.getElementById("exit");
    const switchWrap = document.getElementById("switch-btn");

    if (addBtnEl) addBtnEl.style.display = "none";
    if (editBtnEl) editBtnEl.style.display = "inline-flex";
    if (updateBtnEl) updateBtnEl.style.display = "none";
    if (exitBtnEl) exitBtnEl.style.display = "none";
    if (switchWrap) switchWrap.style.marginLeft = "900px";

    // 3) Hiển thị trạng thái loading
    container.innerHTML = `
    <div style="padding:16px; text-align:center; opacity:0.8;">
      Đang tải báo cáo...
    </div>
  `;

    // 4) Render báo cáo theo type
    const fn = map[type];
    try {
      if (typeof fn === "function") {
        const html = await fn(date); // truyền yyyy-MM-dd
        container.innerHTML = html;

        // 4.1) Nếu là maintenanceReport: luôn đảm bảo vào view mode (không có cột thao tác)
        //      => gỡ hoàn toàn cột "Thao tác" nếu có
        if (
          type === "maintenanceReport" &&
          typeof window.__setMaintenanceEditMode === "function"
        ) {
          window.__setMaintenanceEditMode(false);
        }
      } else {
        container.innerHTML = "<p style='padding:12px'>Không có dữ liệu</p>";
      }
    } catch (err) {
      console.error("[renderSelectedReport] error:", err);
      container.innerHTML = `
      <div style="padding:12px; color:#b00020;">
        Lỗi khi tải báo cáo. Vui lòng thử lại.
      </div>
    `;
    }
  }

  select.addEventListener("change", () => {
    const type = select.value;

    if (type === "maintenanceReport") {
      // maintenance: không auto điền — để trống để user tự chọn
      dateInput.value = "";
    } else {
      // các loại khác: auto hôm nay
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const dd = String(today.getDate()).padStart(2, "0");
      dateInput.value = `${yyyy}-${mm}-${dd}`;
    }
    renderSelectedReport();
  });
  dateInput.addEventListener("change", renderSelectedReport);

  editBtn.addEventListener("click", async () => {
    document.getElementById("edit-report").style.display = "none";
    document.getElementById("update-report").style.display = "inline-flex";
    document.getElementById("exit").style.display = "inline-flex";

    // Nếu báo cáo đang chọn là maintenanceReport thì hiện nút thêm nội dung
    if (select.value === "maintenanceReport") {
      document.getElementById("add-task-btn").style.display = "flex";
      document.getElementById("switch-btn").style.marginLeft = "744px";
      window.__setMaintenanceEditMode?.(true);
    } else {
      document.getElementById("add-task-btn").style.display = "none";
      document.getElementById("switch-btn").style.marginLeft = "900px";
    }
    window.currentReportEnableEdit();
  });

  updateBtn.addEventListener("click", async () => {
    const startedAt = Date.now();
    const type = select.value; // filterAHU | dailywork | ...
    const date = dateInput.value; // yyyy-MM-dd (vd 2025-10-01)

    // helper log
    const logPrefix = `[UPDATE] type=${type} date=${date}`;
    console.info(`${logPrefix} - begin`);

    try {
      updateBtn.disabled = true;
      updateBtn.textContent = "Đang lưu...";

      if (type === "filterAHU") {
        // LƯU Ý: currentReportCollectAndSubmit nên throw Error(message) có kèm status/text nếu fail
        await window.currentReportCollectAndSubmit(date);
      } else if (type === "maintenanceReport") {
        await submitMaintenanceReport(date);
      } else {
        console.warn(`${logPrefix} - no submit handler for type="${type}"`);
        alert("Chưa gắn submit cho loại báo cáo này.");
        return;
      }

      console.info(`${logPrefix} - success in ${Date.now() - startedAt}ms`);

      document.getElementById("update-report").style.display = "none";
      document.getElementById("exit").style.display = "none";
      document.getElementById("edit-report").style.display = "inline-flex";
      document.getElementById("add-task-btn").style.display = "none";
      document.getElementById("switch-btn").style.marginLeft = "900px";

      // 👉 Tắt edit mode cho bảng bảo dưỡng (gỡ cột Thao tác)
      if (type === "maintenanceReport")
        window.__setMaintenanceEditMode?.(false);

      // Reload lại đúng ngày đang chọn (sẽ hiển thị dữ liệu vừa upsert)
      const changeEvent = new Event("change");
      dateInput.dispatchEvent(changeEvent);
    } catch (e) {
      // ==== LOG CHI TIẾT LỖI TẠI ĐÂY ====
      console.error(`${logPrefix} - failed in ${Date.now() - startedAt}ms`);
      console.error(`${logPrefix} - message:`, e?.message ?? e);
      if (e?.stack) console.error(`${logPrefix} - stack:`, e.stack);

      // Nếu currentReportCollectAndSubmit ném lỗi dạng {status, statusText, body}
      if (e?.status || e?.statusText || e?.body) {
        console.error(`${logPrefix} - status:`, e.status, e.statusText);
        console.error(`${logPrefix} - body:`, e.body);
      }

      // In thêm các biến ngữ cảnh để dễ dò
      console.debug(`${logPrefix} - context`, { type, date });

      alert(`Có lỗi khi lưu: ${e?.message || "Vui lòng thử lại."}`);
    } finally {
      updateBtn.disabled = false;
      updateBtn.textContent = "Cập nhật";
      console.info(`${logPrefix} - end`);
    }
  });

  exitBtn.addEventListener("click", async () => {
    document.getElementById("update-report").style.display = "none";
    document.getElementById("exit").style.display = "none";
    document.getElementById("edit-report").style.display = "inline-flex";
    document.getElementById("add-task-btn").style.display = "none";
    document.getElementById("switch-btn").style.marginLeft = "900px";

    if (select.value === "maintenanceReport")
      window.__setMaintenanceEditMode?.(false);

    await renderSelectedReport();
  });

  // Gọi mặc định khi load trang
  renderSelectedReport();
}
