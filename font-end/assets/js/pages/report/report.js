// report.js
import { renderFilterReport } from "./filterAHU.js";
import {
  renderMonthlyWorkReport,
  submitInspectionReport,
} from "./monthlywork.js";
import {
  rendergeneratorReport,
  submitGeneratorData,
} from "./generatorReport.js";
import {
  renderMaintenanceReport,
  submitMaintenanceReport,
} from "./maintenanceReport.js";

/* --------------------------- UI KHUNG CHÍNH --------------------------- */
export async function renderMaintenance() {
  return `
    <section class="card p-4" id="report-section">
      <h2 id="report-title" class="text-xl font-bold mb-4" style="text-align:center; font-weight:700">BÁO CÁO</h2>

      <div class="toolbar" style="display:flex;gap:12px;align-items:center;margin-bottom:12px">
        <label style="font-weight:600">Loại báo cáo:
          <select id="report-type" style="padding:8px 10px;border:1px solid #ddd;border-radius:8px">
            <option value="filterAHU">Báo cáo thay thế OA filter</option>
            <option value="monthlywork">Báo cáo kiểm tra thiết bị định kỳ</option>
            <option value="generatorReport">Nhật ký vận hành máy phát</option>
            <option value="maintenanceReport">Lịch sử sửa chữa bảo dưỡng</option>
          </select>
        </label>
        
        <label style="font-weight:600">Ngày:
          <input type="date" id="filter-date" style="padding:8px 10px; border:1px solid #ddd; border-radius:8px" />
        </label>

        <button id="add-task-btn" class="btn primary" style="padding:8px 12px; background-color:#1976d2; color:white; border:none; border-radius:6px; cursor:pointer; display:none">
          ➕ Thêm nội dung
        </button>

        <div id="switch-btn" style="display:flex; gap:10px; margin-left:auto">
          <button id="edit-report" class="btn primary" style="padding:8px 20px;border-radius:8px;background:#e17eee;color:black;border:none;display:inline-flex;align-items:center;gap:8px;white-space:nowrap;height:36px">
            <img src="assets/pictures/edit.png" alt="" width="20" height="20" />Report
          </button>
          <button id="update-report" class="btn primary" style="padding:8px 20px;border-radius:8px;background:#7eee8b;color:black;border:none;display:none;align-items:center;gap:8px;white-space:nowrap;height:36px">
            <img src="assets/pictures/update.png" alt="" width="20" height="20" />Update
          </button>
          <button id="exit" class="btn primary" style="padding:8px 20px;border-radius:8px;background:#f25a34;color:black;border:none;display:none;align-items:center;gap:8px;white-space:nowrap;height:36px">
            <img src="assets/pictures/remove.png" alt="" width="20" height="15" />Exit
          </button>

          <button id="preview-report" class="btn primary" style="padding:8px 20px;border-radius:8px;background:#ffa500;color:black;border:none;display:inline-flex;align-items:center;gap:8px;white-space:nowrap;height:36px">
            👁️ Preview
          </button>
        </div>
      </div>

      <div id="report-container"></div>

      <!-- PREVIEW MODAL (không set width/height cứng ở đây; JS sẽ tính cho 160x600) -->
      <div id="preview-modal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,.6); z-index:2000; justify-content:center; align-items:center; overflow:hidden;">
        <div id="preview-shell" style="background:#fff; padding:12px 16px; border-radius:12px; display:flex; flex-direction:column; align-items:center; gap:8px;">
          <div id="preview-toolbar" style="display:flex; gap:8px; align-items:center; width:100%; justify-content:flex-end;">
            <button id="export-img-btn" style="background:#4caf50; color:#fff; padding:6px 12px; border:none; border-radius:6px;">📷 Export</button>
            <button id="close-preview-btn" style="background:#f44336; color:#fff; padding:6px 12px; border:none; border-radius:6px;">Exit</button>
          </div>
          <div id="preview-viewport" style="display:flex; align-items:center; justify-content:center; background:#fff; border-radius:10px; color: black"></div>
        </div>
      </div>
    </section>
  `;
}

/* ========== EXPORT UTILS (dùng chung) ========== */
function fixTableAlignment(root) {
  const tables = root.querySelectorAll("table");
  tables.forEach((tbl) => {
    const thead = tbl.querySelector("thead");
    const ths = thead ? Array.from(thead.querySelectorAll("th")) : [];
    if (!ths.length) return;

    const widths = ths.map((th) => Math.ceil(th.getBoundingClientRect().width));

    let colgroup = tbl.querySelector("colgroup");
    if (!colgroup) {
      colgroup = document.createElement("colgroup");
      tbl.insertBefore(colgroup, tbl.firstChild);
    }
    colgroup.innerHTML = "";
    widths.forEach((w) => {
      const col = document.createElement("col");
      col.style.width = w + "px";
      colgroup.appendChild(col);
    });

    tbl.style.tableLayout = "fixed";
    tbl.style.borderCollapse = "separate";
    tbl.style.borderSpacing = "0";

    tbl.querySelectorAll("th, td").forEach((cell) => {
      cell.style.whiteSpace = "nowrap";
      cell.style.wordBreak = "normal";
      cell.style.verticalAlign = "middle";
      cell.style.textAlign = "center";
      cell.style.padding = "8px 10px";
      cell.style.lineHeight = "1.6";
      cell.style.overflow = "visible";
      cell.style.display = "table-cell";
      cell.style.boxSizing = "border-box";
    });
  });
}

function stripProblemStyles(root) {
  root.querySelectorAll("*").forEach((el) => {
    const cs = getComputedStyle(el);
    if (cs.filter && cs.filter !== "none") el.style.filter = "none";
    if (cs.mixBlendMode && cs.mixBlendMode !== "normal")
      el.style.mixBlendMode = "normal";
    if (cs.backdropFilter && cs.backdropFilter !== "none")
      el.style.backdropFilter = "none";
  });
}

async function waitImagesAndFonts(root) {
  const imgs = Array.from(root.querySelectorAll("img"));
  imgs.forEach((img) => {
    const src = img.getAttribute("src") || "";
    if (!/^data:|^blob:/i.test(src)) img.crossOrigin = "anonymous";
    else img.removeAttribute("crossorigin");
    if (img.complete && img.naturalWidth === 0) {
      const s = img.src;
      img.src = "";
      img.src = s;
    }
    img.style.background = "#fff";
  });
  await Promise.all(
    imgs.map((img) =>
      img.complete && img.naturalWidth > 0
        ? Promise.resolve()
        : new Promise((res) => (img.onload = img.onerror = res))
    )
  );
  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch {}
  }
}

/**
 * Chụp ảnh: ưu tiên preview nếu đang mở; nếu không thì dựng bản export từ DOM thật.
 */
async function exportReportImage({
  select,
  dateInput,
  previewModal,
  previewViewport,
  ensureHtml2Canvas,
  buildFixedPage,
}) {
  const loading = document.createElement("div");
  let exportRoot = null;

  try {
    // Overlay
    loading.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,.7);color:#fff;
      display:flex;align-items:center;justify-content:center;
      font-size:1.2rem;z-index:1000000000;`;
    loading.textContent = "Đang xử lý xuất ảnh, vui lòng chờ...";
    document.body.appendChild(loading);

    const html2canvas = await ensureHtml2Canvas();
    const type = select.value;
    const date = dateInput.value;

    // 1) Ưu tiên chụp preview nếu đang mở
    const previewPage = previewViewport?.querySelector(".preview-page");
    if (previewModal.style.display === "flex" && previewPage) {
      const canvas = await html2canvas(previewPage, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
        letterRendering: true,
        foreignObjectRendering: false,
        removeContainer: false,
        scrollX: 0,
        scrollY: 0,
        windowWidth: previewPage.scrollWidth,
        windowHeight: previewPage.scrollHeight,
      });
      const a = document.createElement("a");
      a.download = `BaoCao-${type}-${date || "all"}-preview.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
      return;
    }

    // 2) Fallback: chụp toàn nội dung (không cần mở preview)
    const containerEl = document.getElementById("report-container");
    const liveClone = containerEl.cloneNode(true);

    // (Tuỳ trang) AHU có normalize ảnh: nếu đã gắn global thì gọi
    if (
      type === "filterAHU" &&
      typeof window.normalizeAHUImageCells === "function"
    ) {
      try {
        window.normalizeAHUImageCells(liveClone);
      } catch {}
    }

    // staging offscreen
    exportRoot = document.createElement("div");
    exportRoot.style.cssText = `position:absolute;top:-9999px;left:-9999px;z-index:-1;background:#fff;`;
    document.body.appendChild(exportRoot);

    // build fixed page
    const { page } = buildFixedPage(type, date, liveClone, { forExport: true });
    page.style.background = "#fff";
    exportRoot.appendChild(page);

    // style vá export
    const styleFix = document.createElement("style");
    styleFix.textContent = `
      html, body, .preview-page { background:#fff !important; }
      .preview-page, .preview-page * {
        -webkit-font-smoothing: antialiased;
        text-rendering: optimizeLegibility;
        color:#000 !important;
        background-clip: border-box !important;
      }
      table { border-collapse:separate!important; border-spacing:0!important; }
      th, td { overflow:visible!important; height:auto!important; max-height:none!important; }
    `;
    page.appendChild(styleFix);

    stripProblemStyles(page);
    fixTableAlignment(page);

    // chờ layout ổn định
    await new Promise((r) => requestAnimationFrame(r));
    page.__applyScale?.();
    await new Promise((r) => requestAnimationFrame(r));

    await waitImagesAndFonts(page);
    await new Promise((r) => setTimeout(r, 60));

    const canvas = await html2canvas(page, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
      letterRendering: true,
      foreignObjectRendering: false,
      removeContainer: false,
      scrollX: 0,
      scrollY: 0,
      windowWidth: page.scrollWidth,
      windowHeight: page.scrollHeight,
    });

    const a = document.createElement("a");
    a.download = `BaoCao-${type}-${date || "all"}.png`;
    a.href = canvas.toDataURL("image/png");
    a.click();
  } finally {
    if (document.body.contains(loading)) document.body.removeChild(loading);
    if (exportRoot && exportRoot.parentNode)
      exportRoot.parentNode.removeChild(exportRoot);
  }
}

/* ------------------------ SỰ KIỆN + LOGIC CHUNG ------------------------ */
export function setupReportEvents() {
  const select = document.getElementById("report-type");
  const dateInput = document.getElementById("filter-date");
  const container = document.getElementById("report-container");
  const title = document.getElementById("report-title");
  const updateBtn = document.getElementById("update-report");
  const editBtn = document.getElementById("edit-report");
  const exitBtn = document.getElementById("exit");

  if (!select || !container || !dateInput || !title || !updateBtn) return;

  // ====== CONFIG: kích thước trang cố định trong preview & export ======
  const PAGE_W = 600; // px
  const PAGE_H = 850; // px

  /* ---------- Helpers cho Preview cố định 160x600 ---------- */
  const titleFor = (type) => {
    switch (type) {
      case "filterAHU":
        return "BÁO CÁO THAY THẾ OA FILTER AHU";
      case "monthlywork":
        return "BÁO CÁO KIỂM TRA THIẾT BỊ ĐỊNH KỲ";
      case "generatorReport":
        return "NHẬT KÝ VẬN HÀNH MÁY PHÁT";
      case "maintenanceReport":
        return "LỊCH SỬ SỬA CHỮA BẢO DƯỠNG";
      default:
        return "BÁO CÁO";
    }
  };

  function buildHeaderEl(type, dateStr) {
    const wrap = document.createElement("div");
    wrap.style.cssText = `
      display: flex; flex-direction: column; align-items: center; justify-content: center; padding-top: 6px;
      margin-bottom: 12px; width: 100%; text-align: center; color: #000000ff; position: relative; z-index: 2;
    `;

    const titleDiv = document.createElement("div");
    titleDiv.textContent = titleFor(type);
    titleDiv.style.cssText = `
      font-size: 20px; font-weight: 800; letter-spacing: 0.3px; color: #000; line-height:1.25; transform: translateZ(0);
    `;
    wrap.appendChild(titleDiv);

    if (dateStr) {
      const dateDiv = document.createElement("div");
      dateDiv.textContent = `Ngày: ${String(dateStr).replace(/-/g, "/")}`;
      dateDiv.style.cssText = `margin-top: 6px; font-weight: 600; color: #000; line-height:1.2`;
      wrap.appendChild(dateDiv);
    }

    return wrap;
  }

  // Gỡ sticky/overflow + text đen, tắt tương tác upload trong preview
  function cleanupPreviewDom(root) {
    root.querySelectorAll("td *").forEach((el) => {
      el.style.color = "#000";
      el.style.setProperty("-webkit-text-fill-color", "#000");
    });

    root.querySelectorAll("[style]").forEach((el) => {
      const s = el.style;
      if (s.overflow || s.overflowY || s.overflowX) {
        s.overflow = "visible";
        s.overflowY = "visible";
        s.overflowX = "visible";
      }
      if (s.maxHeight) s.maxHeight = "";
      if (s.position === "sticky" || /sticky/.test(s.position)) {
        s.position = "static";
        s.top = "auto";
        s.zIndex = "auto";
      }
      s.color = "#000";
      s.setProperty("-webkit-text-fill-color", "#000");
    });

    root
      .querySelectorAll("thead, thead *, .sticky, [data-sticky='true']")
      .forEach((el) => {
        el.style.textAlign = "center";
        el.style.position = "static";
        el.style.top = "auto";
        el.style.zIndex = "auto";
        el.style.color = "#000";
        el.style.setProperty("-webkit-text-fill-color", "#000");
      });

    root.querySelectorAll("th, td").forEach((el) => {
      el.style.textAlign = "center";
      el.style.verticalAlign = "middle";
      el.style.display = "table-cell";
      el.style.lineHeight = "1.5";
    });

    root.querySelectorAll(".file-upload-box").forEach((el) => {
      el.style.pointerEvents = "none";
      el.style.cursor = "default";
    });
  }

  // Tạo "page" cố định và scale inner để lọt trọn
  function buildFixedPage(
    type,
    date,
    containerHTML,
    { forExport = false } = {}
  ) {
    const page = document.createElement("div");
    page.className = "preview-page";

    let pageCss = `
      position: relative; background: #fff; border: none;
      box-shadow: 0 10px 30px rgba(0,0,0,.08); padding: 12px 20px 16px;
    `;

    if (forExport) {
      pageCss += `display: inline-block; overflow: visible; width: 1150px;`;
    } else {
      pageCss += `width: 1150px; overflow: hidden;`;
    }

    const inner = document.createElement("div");
    inner.style.cssText = `position:absolute; left:0; top:0; transform-origin: top left; display:inline-block`;

    const wrap = document.createElement("div");
    wrap.appendChild(buildHeaderEl(type, date));

    const bodyWrap = document.createElement("div");
    if (containerHTML instanceof Node) bodyWrap.appendChild(containerHTML);
    else bodyWrap.innerHTML = containerHTML;

    cleanupPreviewDom(bodyWrap);
    wrap.appendChild(bodyWrap);

    inner.appendChild(wrap);
    page.appendChild(inner);

    const style = document.createElement("style");
    style.textContent = `
    .preview-page table {
      border: 1px solid #000;
    }

    .preview-page th {
      border: 1px solid #000;
      background-color: transparent;

    }
    .preview-page td {
      border: 1px solid #000;

    }

 
  `;
    page.appendChild(style);

    page.__applyScale = () => {
      if (forExport) {
        inner.style.transform = "none";
        page.style.height = wrap.scrollHeight + "px";
        return;
      }
      inner.style.transform = "none";
      const w = wrap.offsetWidth;
      const h = wrap.offsetHeight;
      const scale = Math.min(PAGE_W / w, PAGE_H / h, 1);
      inner.style.transform = `scale(${scale})`;
      const usedW = w * scale;
      inner.style.left = `${Math.max(0, (PAGE_W - usedW) / 2)}px`;
      page.style.height = `${PAGE_H}px`;
    };

    return { page, inner };
  }

  // Set kích thước shell/viewport ôm đúng 160x600
  function sizePreviewShellToFixedPage() {
    const shell = document.getElementById("preview-shell");
    const viewport = document.getElementById("preview-viewport");
    const toolbar = document.getElementById("preview-toolbar");

    if (viewport) {
      viewport.style.width = PAGE_W + "px";
      viewport.style.height = PAGE_H + "px";
      viewport.style.cursor = "grab";
      viewport.style.userSelect = "none";
      viewport.style.position = "relative";
    }
    const padSide = 16 * 2; // padding trái/phải
    const padTB = 12 * 2; // padding trên/dưới
    const toolbarH = toolbar?.offsetHeight || 0;

    if (shell) {
      shell.style.width = PAGE_W + padSide + "px";
      shell.style.height = PAGE_H + padTB + toolbarH + "px";
    }
  }

  async function ensureHtml2Canvas() {
    if (window.html2canvas) return window.html2canvas;
    await new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src =
        "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js";
      s.onload = resolve;
      s.onerror = () => reject(new Error("Không tải được html2canvas"));
      document.head.appendChild(s);
    });
    return window.html2canvas;
  }

  /* --------------------- Ngày mặc định & render báo cáo --------------------- */
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  if (select.value == "filterAHU") dateInput.value = `${yyyy}-${mm}-${dd}`;
  else dateInput.value = "";

  const map = {
    filterAHU: renderFilterReport,
    monthlywork: renderMonthlyWorkReport,
    generatorReport: rendergeneratorReport,
    maintenanceReport: renderMaintenanceReport,
  };
  const titles = {
    filterAHU: "BÁO CÁO THAY THẾ OA FILTER",
    monthlywork: "BÁO CÁO KIỂM TRA THIẾT BỊ ĐỊNH KỲ",
    generatorReport: "NHẬT KÝ VẬN HÀNH MÁY PHÁT",
    maintenanceReport: "LỊCH SỬ SỬA CHỮA BẢO DƯỠNG",
  };
  const formatDateToSlash = (s) => (s ? String(s).replace(/-/g, "/") : "");

  async function renderSelectedReport() {
    const type = select.value;
    const date = dateInput.value;
    const titleText = titles[type] || "";
    const formattedDate = formatDateToSlash(date);
    title.textContent =
      type === "maintenanceReport"
        ? titleText
        : titleText + (formattedDate ? ` - ${formattedDate}` : "");

    document.getElementById("add-task-btn").style.display = "none";
    document.getElementById("edit-report").style.display = "inline-flex";
    document.getElementById("update-report").style.display = "none";
    document.getElementById("exit").style.display = "none";

    container.innerHTML = `<div style="padding:16px; text-align:center; opacity:0.8;">Đang tải báo cáo...</div>`;

    const fn = map[type];
    try {
      if (typeof fn === "function") {
        const html = await fn(date);
        container.innerHTML = html;
        // tắt edit-mode mặc định theo loại
        if (type === "maintenanceReport") {
          window.__setMaintenanceEditMode?.(false);
        } else if (type === "monthlywork") {
          window.__setInspectionEditMode?.(false);
        } else if (type === "generatorReport") {
          window.__setGeneratorEditMode?.(false);
        }
      } else {
        container.innerHTML = "<p style='padding:12px'>Không có dữ liệu</p>";
      }
    } catch (err) {
      console.error("[renderSelectedReport] error:", err);
      container.innerHTML = `<div style="padding:12px; color:#b00020;">Lỗi khi tải báo cáo. Vui lòng thử lại.</div>`;
    }
  }

  select.addEventListener("change", () => {
    if (select.value !== "filterAHU") {
      dateInput.value = "";
    } else {
      const t = new Date();
      dateInput.value = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(t.getDate()).padStart(2, "0")}`;
    }
    renderSelectedReport();
  });
  dateInput.addEventListener("change", renderSelectedReport);

  editBtn.addEventListener("click", () => {
    document.getElementById("edit-report").style.display = "none";
    document.getElementById("update-report").style.display = "inline-flex";
    document.getElementById("exit").style.display = "inline-flex";
    if (select.value === "maintenanceReport") {
      document.getElementById("add-task-btn").style.display = "flex";
      window.__setMaintenanceEditMode?.(true);
    } else if (select.value === "monthlywork") {
      document.getElementById("add-task-btn").style.display = "flex";
      window.__setInspectionEditMode?.(true);
    } else if (select.value === "generatorReport") {
      document.getElementById("add-task-btn").style.display = "flex";
      window.__setGeneratorEditMode?.(true);
    } else {
      document.getElementById("add-task-btn").style.display = "none";
    }
    window.currentReportEnableEdit?.();
  });

  updateBtn.addEventListener("click", async () => {
    const type = select.value;
    const date = dateInput.value;
    try {
      updateBtn.disabled = true;
      updateBtn.textContent = "Đang lưu...";
      if (type === "filterAHU") {
        await window.currentReportCollectAndSubmit(date);
      } else if (type === "maintenanceReport") {
        await submitMaintenanceReport(date);
      } else if (type === "monthlywork") {
        await submitInspectionReport(date);
      } else if (type === "generatorReport") {
        await submitGeneratorData(date);
      } else {
        alert("Chưa gắn submit cho loại báo cáo này.");
        return;
      }
      alert("Update Successfully!");
      document.getElementById("update-report").style.display = "none";
      document.getElementById("exit").style.display = "none";
      document.getElementById("edit-report").style.display = "inline-flex";
      document.getElementById("add-task-btn").style.display = "none";
      if (type === "maintenanceReport")
        window.__setMaintenanceEditMode?.(false);
      dateInput.dispatchEvent(new Event("change"));
    } catch (e) {
      alert(`Có lỗi khi lưu: ${e?.message || "Vui lòng thử lại."}`);
    } finally {
      updateBtn.disabled = false;
      updateBtn.textContent = "Cập nhật";
    }
  });

  exitBtn.addEventListener("click", async () => {
    document.getElementById("update-report").style.display = "none";
    document.getElementById("exit").style.display = "none";
    document.getElementById("edit-report").style.display = "inline-flex";
    document.getElementById("add-task-btn").style.display = "none";
    if (select.value === "maintenanceReport")
      window.__setMaintenanceEditMode?.(false);
    if (select.value === "monthlywork") window.__setInspectionEditMode?.(false);
    if (select.value === "generatorReport")
      window.__setGeneratorEditMode?.(false);
    await renderSelectedReport();
  });

  /* ----------------------------- PREVIEW 160×600 ----------------------------- */
  const previewBtn = document.getElementById("preview-report");
  const previewModal = document.getElementById("preview-modal");
  const previewViewport = document.getElementById("preview-viewport");
  const closePreviewBtn = document.getElementById("close-preview-btn");
  const exportImgBtn = document.getElementById("export-img-btn");

  let resizeListener = null;

  const openPreview = () => {
    previewModal.style.display = "flex";
    let scale = 1;
    let isDragging = false;
    let startX, startY;
    let panX = 0;
    let panY = 0;

    const zoomStep = 0.1;
    const type = select.value;
    const date = dateInput.value;

    if (resizeListener) {
      window.removeEventListener("resize", resizeListener);
      resizeListener = null;
    }

    previewViewport.innerHTML = "";
    sizePreviewShellToFixedPage();

    const { page, inner } = buildFixedPage(type, date, container.innerHTML, {
      forExport: false,
    });
    previewViewport.appendChild(page);

    // Ẩn scroll — chỉ pan bằng transform
    previewViewport.style.overflow = "hidden";
    previewViewport.style.cursor = "grab";
    previewViewport.style.userSelect = "none";
    previewViewport.style.position = "relative";

    // Hàm áp dụng pan + scale
    const applyTransform = () => {
      inner.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
      inner.style.transformOrigin = "top left";
    };

    requestAnimationFrame(() => {
      page.__applyScale();
    });
    resizeListener = () => sizePreviewShellToFixedPage();
    window.addEventListener("resize", resizeListener);

    // Zoom giữ nguyên
    previewViewport.addEventListener("wheel", (e) => {
      if (e.ctrlKey) {
        e.preventDefault();
        scale += e.deltaY < 0 ? zoomStep : -zoomStep;
        scale = Math.max(0.2, Math.min(scale, 5));
        applyTransform();
      }
    });

    // Pan
    previewViewport.addEventListener("mousedown", (e) => {
      isDragging = true;
      previewViewport.style.cursor = "grabbing";
      startX = e.clientX;
      startY = e.clientY;
    });

    window.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      e.preventDefault();
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      startX = e.clientX;
      startY = e.clientY;
      panX += dx;
      panY += dy;
      applyTransform();
    });

    window.addEventListener("mouseup", () => {
      isDragging = false;
      previewViewport.style.cursor = "grab";
    });
  };

  const closePreview = () => {
    if (resizeListener) window.removeEventListener("resize", resizeListener);
    resizeListener = null;
    previewModal.style.display = "none";
    previewViewport.innerHTML = "";
  };

  previewBtn?.addEventListener("click", openPreview);
  closePreviewBtn?.addEventListener("click", closePreview);

  /* ------------------------------ EXPORT PNG ------------------------------ */
  // ——— GỌN: handler chỉ gọi util exportReportImage ———
  exportImgBtn?.addEventListener("click", async () => {
    try {
      const type = select.value;
      const date = dateInput.value || "TẤT CẢ NGÀY";

      if (
        type === "filterAHU" &&
        typeof window.exportFilterAHUToPNG === "function"
      ) {
        const fileName = `BaoCao-${type}-${date}.png`;
        const title = "BÁO CÁO THAY THẾ OA FILTER AHU";
        const dateText = date;

        await window.exportFilterAHUToPNG({
          fileName,
          titleText: title,
          dateStr: dateText,
        });
        return;
      }

      // Trường hợp khác
      await exportReportImage({
        select,
        dateInput,
        previewModal,
        previewViewport,
        ensureHtml2Canvas,
        buildFixedPage,
      });
    } catch (e) {
      console.error("Export error:", e);
      alert("Đã xảy ra lỗi khi xuất ảnh. Vui lòng thử lại.");
    }
  });

  // Render lần đầu
  renderSelectedReport();
}
