//report.js
import { renderFilterReport } from "./filterAHU.js";
import { renderDailyWorkReport } from "./dailywork.js";
import { renderInnovateReport } from "./innovateReport.js";
import { renderIncidentReport } from "./incidentReport.js";

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
            <option value="incidentReport">Báo cáo sự cố</option>
          </select>
        </label>
        
        <label style="font-weight:600">Ngày:
          <input type="date" id="filter-date" style="padding:8px 10px; border:1px solid #ddd; border-radius:8px" />
        </label>

        <div style="display: flex; gap: 10px; margin-left: 900px">
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
  dateInput.value = `${yyyy}-${mm}-${dd}`;

  const map = {
    filterAHU: renderFilterReport,
    dailywork: renderDailyWorkReport,
    innovateReport: renderInnovateReport,
    incidentReport: renderIncidentReport,
  };

  const titles = {
    filterAHU: "BÁO CÁO THAY THẾ OA FILTER",
    dailywork: "BÁO CÁO CÔNG VIỆC HÀNG NGÀY",
    innovateReport: "BÁO CÁO CẢI TIẾN",
    incidentReport: "BÁO CÁO SỰ CỐ",
  };

  // Hàm format ngày yyyy-MM-dd => yyyy/MM/dd
  function formatDateToSlash(dateStr) {
    if (!dateStr) return "";
    return dateStr.replace(/-/g, "/");
  }

  async function renderSelectedReport() {
    const type = select.value;
    const date = dateInput.value; // yyyy-MM-dd hoặc rỗng

    // Format lại ngày thành yyyy/MM/dd
    const formattedDate = formatDateToSlash(date);

    // Cập nhật tiêu đề
    title.textContent =
      titles[type] + (formattedDate ? ` - ${formattedDate}` : "");

    const fn = map[type];
    if (fn) {
      const html = await fn(date); // Gửi ngày định dạng yyyy-MM-dd cho backend hoặc hàm xử lý
      container.innerHTML = html;
    } else {
      container.innerHTML = "<p>Không có dữ liệu</p>";
    }
  }

  select.addEventListener("change", renderSelectedReport);
  dateInput.addEventListener("change", renderSelectedReport);

  editBtn.addEventListener("click", async () => {
    document.getElementById("edit-report").style.display = "none";
    document.getElementById("update-report").style.display = "inline-flex";
    document.getElementById("exit").style.display = "inline-flex";
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
      } else {
        console.warn(`${logPrefix} - no submit handler for type="${type}"`);
        alert("Chưa gắn submit cho loại báo cáo này.");
        return;
      }

      console.info(`${logPrefix} - success in ${Date.now() - startedAt}ms`);
      alert("Cập nhật thành công!");

      document.getElementById("update-report").style.display = "none";
      document.getElementById("exit").style.display = "none";
      document.getElementById("edit-report").style.display = "inline-flex";

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
    await renderSelectedReport();
  });

  // Gọi mặc định khi load trang
  renderSelectedReport();
}
