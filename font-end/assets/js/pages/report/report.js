// report.js (refactor - maintain behavior, clearer structure)

/* =========================================================================
 * [CONFIG] — constants & feature maps
 * ========================================================================= */
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

// Fixed page size for preview (canvas viewport)
const PAGE_W = 600; // px
const PAGE_H = 850; // px

const REPORT_RENDERERS = {
  filterAHU: renderFilterReport,
  monthlywork: renderMonthlyWorkReport,
  generatorReport: rendergeneratorReport,
  maintenanceReport: renderMaintenanceReport,
};

const REPORT_TITLES = {
  filterAHU: "BÁO CÁO THAY THẾ OA FILTER",
  monthlywork: "BÁO CÁO KIỂM TRA THIẾT BỊ ĐỊNH KỲ",
  generatorReport: "NHẬT KÝ VẬN HÀNH MÁY PHÁT",
  maintenanceReport: "LỊCH SỬ SỬA CHỮA BẢO DƯỠNG",
};

const PREVIEW_HEADER_TITLES = {
  ...REPORT_TITLES,
  filterAHU: "BÁO CÁO THAY THẾ OA FILTER AHU",
};

const MSG = {
  loading: "Đang tải báo cáo...",
  noData: "Không có dữ liệu",
  saveOk: "Update Successfully!",
  errLoad: "Lỗi khi tải báo cáo. Vui lòng thử lại.",
  errExport: "Đã xảy ra lỗi khi xuất ảnh. Vui lòng thử lại.",
  exporting: "Đang xử lý xuất ảnh, vui lòng chờ...",
  html2canvasError: "Không tải được html2canvas",
};

/* =========================================================================
 * [DOM UTILS] — small helpers to avoid repetition
 * ========================================================================= */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const setText = (el, t) => {
  if (el) el.textContent = t;
};
const show = (el, on = true) => {
  if (el) el.style.display = on ? "" : "none";
};
const showFlex = (el, on = true) => {
  if (el) el.style.display = on ? "flex" : "none";
};
const showInlineFlex = (el, on = true) => {
  if (el) el.style.display = on ? "inline-flex" : "none";
};
const fmtSlash = (s) => (s ? String(s).replace(/-/g, "/") : "");

/* =========================================================================
 * [TEMPLATE] — main scaffold (unchanged ids)
 * ========================================================================= */
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

      <!-- PREVIEW MODAL -->
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

/* =========================================================================
 * [PREVIEW UTILS] — build fixed-size page for preview/export
 * ========================================================================= */
const titleForHeader = (type) => PREVIEW_HEADER_TITLES[type] || "BÁO CÁO";

function buildHeaderEl(type, dateStr) {
  const wrap = document.createElement("div");
  wrap.style.cssText = `
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    padding-top:6px;margin-bottom:12px;width:100%;text-align:center;color:#000;position:relative;z-index:2;
  `;

  const titleDiv = document.createElement("div");
  titleDiv.textContent = titleForHeader(type);
  titleDiv.style.cssText = `font-size:20px;font-weight:800;letter-spacing:.3px;color:#000;line-height:1.25;transform:translateZ(0)`;
  wrap.appendChild(titleDiv);

  if (dateStr) {
    const dateDiv = document.createElement("div");
    dateDiv.textContent = `Ngày: ${fmtSlash(dateStr)}`;
    dateDiv.style.cssText = `margin-top:6px;font-weight:600;color:#000;line-height:1.2`;
    wrap.appendChild(dateDiv);
  }
  return wrap;
}

// cleanup DOM before snapshot
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

  // disable upload boxes inside preview
  root.querySelectorAll(".file-upload-box").forEach((el) => {
    el.style.pointerEvents = "none";
    el.style.cursor = "default";
  });
}

function buildFixedPage(type, date, containerHTML, { forExport = false } = {}) {
  const page = document.createElement("div");
  page.className = "preview-page";
  page.style.cssText = `
    position:relative;background:#fff;border:none;box-shadow:0 10px 30px rgba(0,0,0,.08);
    padding:12px 20px 16px;${
      forExport
        ? "display:inline-block;overflow:visible;width:1150px;"
        : "width:1150px;overflow:hidden;"
    }
  `;

  const inner = document.createElement("div");
  inner.style.cssText = `position:absolute;left:0;top:0;transform-origin:top left;display:inline-block`;

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
    .preview-page table { border:1px solid #000; }
    .preview-page th    { border:1px solid #000; background-color:transparent; }
    .preview-page td    { border:1px solid #000; }
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

function sizePreviewShellToFixedPage() {
  const shell = $("#preview-shell");
  const viewport = $("#preview-viewport");
  const toolbar = $("#preview-toolbar");
  if (viewport) {
    viewport.style.width = PAGE_W + "px";
    viewport.style.height = PAGE_H + "px";
    viewport.style.cursor = "grab";
    viewport.style.userSelect = "none";
    viewport.style.position = "relative";
    viewport.style.overflow = "hidden";
  }
  const padSide = 16 * 2;
  const padTB = 12 * 2;
  const toolbarH = toolbar?.offsetHeight || 0;
  if (shell) {
    shell.style.width = PAGE_W + padSide + "px";
    shell.style.height = PAGE_H + padTB + toolbarH + "px";
  }
}

/* =========================================================================
 * [EXPORT UTILS] — table fixes + html2canvas + export image
 * ========================================================================= */
function fixTableAlignment(root) {
  const tables = root.querySelectorAll("table");
  tables.forEach((tbl) => {
    const ths = $$("thead th", tbl);
    if (!ths.length) return;

    const widths = ths.map((th) => Math.ceil(th.getBoundingClientRect().width));
    let colgroup = $("colgroup", tbl);
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

    Object.assign(tbl.style, {
      tableLayout: "fixed",
      borderCollapse: "separate",
      borderSpacing: "0",
    });

    $$("th, td", tbl).forEach((cell) => {
      Object.assign(cell.style, {
        whiteSpace: "nowrap",
        wordBreak: "normal",
        verticalAlign: "middle",
        textAlign: "center",
        padding: "8px 10px",
        lineHeight: "1.6",
        overflow: "visible",
        display: "table-cell",
        boxSizing: "border-box",
      });
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
  const imgs = $$("img", root);
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
  if (document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {}
  }
}

async function ensureHtml2Canvas() {
  if (window.html2canvas) return window.html2canvas;
  await new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src =
      "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js";
    s.onload = resolve;
    s.onerror = () => reject(new Error(MSG.html2canvasError));
    document.head.appendChild(s);
  });
  return window.html2canvas;
}

async function exportReportImage({
  select,
  dateInput,
  previewModal,
  previewViewport,
}) {
  const overlay = document.createElement("div");
  let exportRoot = null;

  try {
    // Overlay loading
    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      background: "rgba(0,0,0,.7)",
      color: "#fff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "1.2rem",
      zIndex: "1000000000",
    });
    overlay.textContent = MSG.exporting;
    document.body.appendChild(overlay);

    const html2canvas = await ensureHtml2Canvas();
    const type = select.value;
    const date = dateInput.value;

    // 1) Prefer preview page if open
    const previewPage = $(".preview-page", previewViewport);
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

    // 2) Fallback: build export version from live DOM
    const containerEl = $("#report-container");
    const liveClone = containerEl.cloneNode(true);

    // AHU: normalize images if function exists
    if (
      type === "filterAHU" &&
      typeof window.normalizeAHUImageCells === "function"
    ) {
      try {
        window.normalizeAHUImageCells(liveClone);
      } catch {}
    }

    // offscreen staging
    exportRoot = document.createElement("div");
    exportRoot.style.cssText = `position:absolute;top:-9999px;left:-9999px;z-index:-1;background:#fff;`;
    document.body.appendChild(exportRoot);

    const { page } = buildFixedPage(type, date, liveClone, { forExport: true });
    page.style.background = "#fff";
    exportRoot.appendChild(page);

    // export styling patches
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
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    if (exportRoot?.parentNode) exportRoot.parentNode.removeChild(exportRoot);
  }
}

/* =========================================================================
 * [CONTROLLER] — main event wiring & screen logic
 * ========================================================================= */
export function setupReportEvents() {
  // DOM refs
  const select = $("#report-type");
  const dateInput = $("#filter-date");
  const container = $("#report-container");
  const titleEl = $("#report-title");

  const addBtn = $("#add-task-btn");
  const editBtn = $("#edit-report");
  const updateBtn = $("#update-report");
  const exitBtn = $("#exit");

  const previewBtn = $("#preview-report");
  const previewModal = $("#preview-modal");
  const previewViewport = $("#preview-viewport");
  const closePreviewBtn = $("#close-preview-btn");
  const exportImgBtn = $("#export-img-btn");

  if (!select || !container || !dateInput || !titleEl || !updateBtn) return;

  // Default date rule: only filterAHU auto uses today
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  dateInput.value = select.value === "filterAHU" ? `${yyyy}-${mm}-${dd}` : "";

  // Render selected report
  async function renderSelectedReport() {
    const type = select.value;
    const date = dateInput.value;

    // Title: maintenance no date; others show date suffix
    const titleText = REPORT_TITLES[type] || "";
    setText(
      titleEl,
      type === "maintenanceReport"
        ? titleText
        : `${titleText}${date ? ` - ${fmtSlash(date)}` : ""}`
    );

    show(addBtn, false);
    showInlineFlex(editBtn, true);
    showInlineFlex(updateBtn, false);
    showInlineFlex(exitBtn, false);

    container.innerHTML = `<div style="padding:16px; text-align:center; opacity:0.8;">${MSG.loading}</div>`;

    const renderFn = REPORT_RENDERERS[type];
    try {
      if (typeof renderFn === "function") {
        const html = await renderFn(date);
        container.innerHTML = html;

        // disable edit-mode by default per type
        if (type === "maintenanceReport")
          window.__setMaintenanceEditMode?.(false);
        else if (type === "monthlywork")
          window.__setInspectionEditMode?.(false);
        else if (type === "generatorReport")
          window.__setGeneratorEditMode?.(false);
      } else {
        container.innerHTML = `<p style="padding:12px">${MSG.noData}</p>`;
      }
    } catch (err) {
      console.error("[renderSelectedReport] error:", err);
      container.innerHTML = `<div style="padding:12px; color:#b00020;">${MSG.errLoad}</div>`;
    }
  }

  // Select or date change
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

  // Edit mode toggle
  editBtn.addEventListener("click", () => {
    showInlineFlex(editBtn, false);
    showInlineFlex(updateBtn, true);
    showInlineFlex(exitBtn, true);

    const type = select.value;
    const canAdd =
      type === "maintenanceReport" ||
      type === "monthlywork" ||
      type === "generatorReport";
    showFlex(addBtn, canAdd);

    if (type === "maintenanceReport") window.__setMaintenanceEditMode?.(true);
    if (type === "monthlywork") window.__setInspectionEditMode?.(true);
    if (type === "generatorReport") window.__setGeneratorEditMode?.(true);

    // For AHU legacy
    window.currentReportEnableEdit?.();
  });

  // Save/update
  updateBtn.addEventListener("click", async () => {
    const type = select.value;
    const date = dateInput.value;

    try {
      updateBtn.disabled = true;
      setText(updateBtn, "Đang lưu...");

      if (type === "filterAHU")
        await window.currentReportCollectAndSubmit(date);
      else if (type === "maintenanceReport")
        await submitMaintenanceReport(date);
      else if (type === "monthlywork") await submitInspectionReport(date);
      else if (type === "generatorReport") await submitGeneratorData(date);
      else {
        alert("Chưa gắn submit cho loại báo cáo này.");
        return;
      }

      alert(MSG.saveOk);

      showInlineFlex(updateBtn, false);
      showInlineFlex(exitBtn, false);
      showInlineFlex(editBtn, true);
      showFlex(addBtn, false);

      if (type === "maintenanceReport")
        window.__setMaintenanceEditMode?.(false);

      // refresh view
      dateInput.dispatchEvent(new Event("change"));
    } catch (e) {
      alert(`Có lỗi khi lưu: ${e?.message || "Vui lòng thử lại."}`);
    } finally {
      updateBtn.disabled = false;
      setText(updateBtn, "Cập nhật");
    }
  });

  // Exit edit mode
  exitBtn.addEventListener("click", async () => {
    showInlineFlex(updateBtn, false);
    showInlineFlex(exitBtn, false);
    showInlineFlex(editBtn, true);
    showFlex(addBtn, false);

    const type = select.value;
    if (type === "maintenanceReport") window.__setMaintenanceEditMode?.(false);
    if (type === "monthlywork") window.__setInspectionEditMode?.(false);
    if (type === "generatorReport") window.__setGeneratorEditMode?.(false);

    await renderSelectedReport();
  });

  // Preview modal
  let resizeListener = null;
  const openPreview = () => {
    previewModal.style.display = "flex";
    sizePreviewShellToFixedPage();

    const type = select.value;
    const date = dateInput.value;
    previewViewport.innerHTML = "";

    const { page, inner } = buildFixedPage(
      type,
      date,
      $("#report-container").innerHTML,
      { forExport: false }
    );
    previewViewport.appendChild(page);

    // Scale to fit once
    requestAnimationFrame(() => page.__applyScale());
    if (resizeListener) window.removeEventListener("resize", resizeListener);
    resizeListener = () => sizePreviewShellToFixedPage();
    window.addEventListener("resize", resizeListener);

    // Pan & zoom (ctrl+wheel)
    let scale = 1,
      isDrag = false,
      sx = 0,
      sy = 0,
      panX = 0,
      panY = 0;
    const applyTransform = () => {
      inner.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
      inner.style.transformOrigin = "top left";
    };

    previewViewport.addEventListener("wheel", (e) => {
      if (e.ctrlKey) {
        e.preventDefault();
        scale += e.deltaY < 0 ? 0.1 : -0.1;
        scale = Math.max(0.2, Math.min(scale, 5));
        applyTransform();
      }
    });
    previewViewport.addEventListener("mousedown", (e) => {
      isDrag = true;
      previewViewport.style.cursor = "grabbing";
      sx = e.clientX;
      sy = e.clientY;
    });
    window.addEventListener("mousemove", (e) => {
      if (!isDrag) return;
      const dx = e.clientX - sx,
        dy = e.clientY - sy;
      sx = e.clientX;
      sy = e.clientY;
      panX += dx;
      panY += dy;
      applyTransform();
    });
    window.addEventListener("mouseup", () => {
      isDrag = false;
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

  // Export image (preview preferred, fallback full export)
  $("#export-img-btn")?.addEventListener("click", async () => {
    try {
      const type = select.value;
      const date = dateInput.value || "TẤT CẢ NGÀY";

      // Special AHU export: use page-specific PNG routine if present
      if (
        type === "filterAHU" &&
        typeof window.exportFilterAHUToPNG === "function"
      ) {
        await window.exportFilterAHUToPNG({
          fileName: `BaoCao-${type}-${date}.png`,
          titleText: PREVIEW_HEADER_TITLES.filterAHU,
          dateStr: date,
        });
        return;
      }

      await exportReportImage({
        select,
        dateInput,
        previewModal,
        previewViewport,
      });
    } catch (e) {
      console.error("Export error:", e);
      alert(MSG.errExport);
    }
  });

  // initial render
  renderSelectedReport();
}
