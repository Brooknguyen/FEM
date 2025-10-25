// assets/js/pages/info/view.js
// ======================================================================
//  TABLE OF CONTENTS / MỤC LỤC  (KHÔNG ĐỔI LOGIC)
//  [CONFIG]           : Hằng số, base URL, chuẩn cột, chuẩn hoá ảnh
//  [STATE]            : Trạng thái trang (sheetName, rows) + UI state filter
//  [FILTER/SEARCH]    : Lọc bảng theo query (applyInfoSearch) + tip hiển thị
//  [HELPERS]          : escapeHtml, isImgLike, parseImageList, freeze offsets
//  [IMAGE-VIEWER]     : Viewer ảnh đơn giản (open/close/navigate)
//  [TRANSFORM]        : Chuyển devices -> rows (AOA)
//  [RENDER]           : Render bảng xem (read-only)
//  [PAGE-HTML]        : renderInfoPage(key) trả HTML & CSS-inlined
//  [BIND]             : bindInfoEvents(key) tải dữ liệu + gắn render
// ======================================================================

/* ======================================================================
 * [CONFIG] — HẰNG SỐ & CẤU HÌNH CƠ BẢN
 * ----------------------------------------------------------------------
 * - FREEZE_HEADER_ROWS: số dòng header “đóng băng”
 * - DEVICE_COLUMNS: fallback nếu sheet trống
 * - API_BASE / FILE_BASE: IP cố định backend
 * - normalizeImageCellClient(): chuẩn hoá cell chứa nhiều ảnh "a|b|c"
 * - toAbsUrl(): chuyển URL tương đối -> tuyệt đối (dùng FILE_BASE)
 * - 🔧 EDIT HERE: thay đổi API_BASE/FILE_BASE, DEVICE_COLUMNS nếu cần
 * ==================================================================== */
const FREEZE_HEADER_ROWS =
  typeof window.FREEZE_HEADER_ROWS === "number" ? window.FREEZE_HEADER_ROWS : 1;

// ======= CỘT CHUẨN (fallback nếu sheet trống) =======
const DEVICE_COLUMNS = [
  "Hình ảnh",
  "Tên thiết bị",
  "Phân loại thiết bị",
  "Model",
  "Công suất",
  "Điện áp",
  "Capa",
  "Gas",
  "Hãng",
  "Năm chế tạo",
  "Vị trí hiện tại",
  "Ghi chú",
];

/* ======= API/FILE BASE (IP cố định BE) ======= */
const API_BASE = "http://10.100.201.25:4000"; // 🔧 EDIT HERE
const FILE_BASE = "http://10.100.201.25:4000"; // 🔧 EDIT HERE (prefix hiển thị ảnh)

function toAbsUrl(u) {
  const s = String(u || "").trim();
  if (!s) return "";
  if (/^data:/i.test(s)) return s;
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith("/")) return FILE_BASE + s; // /uploads/...
  return s; // tên file trần hoặc chuỗi khác
}

// Chuẩn hoá 1 ô chứa nhiều ảnh "url1|url2|..." thành URL tuyệt đối
function normalizeImageCellClient(cell) {
  return String(cell || "")
    .split("|")
    .map((x) => x.trim())
    .filter(Boolean)
    .map(toAbsUrl)
    .join("|");
}

/* ======================================================================
 * [STATE] — TRẠNG THÁI DỮ LIỆU & UI FILTER
 * ----------------------------------------------------------------------
 * - STATE: tên sheet & mảng rows (AOA)
 * - UI: nắm ref phần preview, tip, và query gần nhất
 * - countVisibleRows(): đếm số tr hiện tại không hidden
 * - updateTipAfterFilter(): cập nhật tip khi lọc
 * ==================================================================== */
const STATE = {
  sheetName: "",
  rows: [], // AOA
};

// ======= UI STATE cho search + helpers =======
const UI = { preview: null, tipEl: null, lastQuery: "", previewEl: null };

function countVisibleRows(tb) {
  if (!tb) return 0;
  let n = 0;
  for (const tr of tb.rows) if (!tr.hidden) n++;
  return n;
}

function updateTipAfterFilter() {
  if (!UI.tipEl) return;
  const total = Math.max(0, (STATE.rows.length - FREEZE_HEADER_ROWS) | 0);
  const tb = UI.previewEl?.querySelector("tbody");
  const vis = countVisibleRows(tb);
  const base = `Sheet: ${STATE.sheetName} - ${total} data rows + ${FREEZE_HEADER_ROWS} header`;
  UI.tipEl.textContent = UI.lastQuery?.trim()
    ? `${base} | The filtered results: ${vis}/${total}`
    : base;
}

/* ======================================================================
 * [FILTER/SEARCH] — Lọc bảng theo query
 * ----------------------------------------------------------------------
 * - applyInfoSearch(query): set UI.lastQuery & set tr.hidden theo includes
 * - Điểm debug nhanh: kiểm tra q, textContent toLowerCase(), tbody tồn tại
 * - API giữ nguyên: export function applyInfoSearch(query)
 * ==================================================================== */
export function applyInfoSearch(query) {
  UI.lastQuery = String(query || "");
  const q = UI.lastQuery.trim().toLowerCase();

  const table = UI.previewEl?.querySelector("table");
  const tb = table?.tBodies?.[0];
  if (!tb) return;

  for (const tr of tb.rows) {
    const text = tr.textContent?.toLowerCase() ?? "";
    tr.hidden = q && !text.includes(q);
  }

  updateTipAfterFilter();
}
// ========= END FILTER STATE cho search bar ===========

/* ======================================================================
 * [HELPERS] — Hàm nhỏ dùng chung
 * ----------------------------------------------------------------------
 * - escapeHtml(): chống XSS ở nội dung cells
 * - isImgLike(): xác định chuỗi “giống url ảnh”
 * - parseImageList(): tách val thành list ảnh theo '|' hoặc đơn lẻ
 * - adjustFreezeOffsets(): set CSS var --hdr1 theo chiều cao head
 * ==================================================================== */
function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function isImgLike(v) {
  const s = String(v || "");
  return (
    /^data:image\//i.test(s) ||
    (/^https?:\/\//i.test(s) && /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(s))
  );
}

function parseImageList(val) {
  if (!val) return [];
  const s = String(val);
  if (s.includes("|")) {
    return s
      .split("|")
      .map((x) => x.trim())
      .filter(Boolean);
  }
  return isImgLike(s) ? [s] : [];
}

function adjustFreezeOffsets(previewEl) {
  const r1 = previewEl.querySelector("thead tr:first-child");
  if (!r1) return;
  const h1 = Math.ceil(r1.getBoundingClientRect().height);
  previewEl.style.setProperty("--hdr1", h1 + "px");
}

/* ======================================================================
 * [IMAGE-VIEWER] — Viewer ảnh đơn giản
 * ----------------------------------------------------------------------
 * - ensureImageViewer(): dựng modal + events (1 lần)
 * - openImageViewer(list, startIdx): mở viewer với danh sách ảnh
 * - closeImageViewer(), navigateImageViewer(), renderImageViewerFrame()
 * - 🔧 chỉnh style viewer tại ensureImageViewer()
 * ==================================================================== */
function ensureImageViewer() {
  if (document.getElementById("imgViewerModal")) return;

  const wrap = document.createElement("div");
  wrap.id = "imgViewerModal";
  wrap.style.cssText = `
    position: fixed; inset: 0; display: none; place-items: center;
    background: rgba(0,0,0,.6); z-index: 9999;
  `;

  wrap.innerHTML = `
    <div id="imgViewerBox" style="
      width:min(92vw, 980px); height:min(88vh, 720px);
      background: var(--card,#fff); color: var(--fg,#111);
      border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,.3);
      display:flex; flex-direction:column; overflow:hidden; position:relative;">
      <div style="display:flex; align-items:center; gap:8px; padding:8px 10px; border-bottom:1px solid var(--line,#e5e7eb)">
        <div id="imgCounter" style="font-size:12px; opacity:.7">1 / 1</div>
        <div style="flex:1"></div>
        <button id="imgCloseBtn" class="btn" style="padding:6px 10px; border:none">✖</button>
      </div>

      <div id="imgStage" style="position:relative; flex:1; background:#000;">
        <iframe id="imgFrame" style="position:absolute; inset:0; width:100%; height:100%; border:0; background:#000" src="about:blank"></iframe>

        <button id="imgArrowLeft" aria-label="Previous"
          style="position:absolute; top:50%; left:8px; transform:translateY(-50%);
                 width:40px; height:40px; border-radius:999px; border:none;
                 background-color:transparent; font-size:40px; line-height:38px; cursor:pointer; z-index:2; color:white">
          <
        </button>

        <button id="imgArrowRight" aria-label="Next"
          style="position:absolute; top:50%; right:8px; transform:translateY(-50%);
                 width:40px; height:40px; border-radius:999px; border:none;
                 background-color:transparent; font-size:40px; line-height:38px; cursor:pointer; z-index:2; color:white">
          >
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(wrap);

  wrap.addEventListener("click", (e) => {
    if (e.target === wrap) closeImageViewer();
  });
  document.getElementById("imgCloseBtn").onclick = closeImageViewer;
  document.getElementById("imgArrowLeft").onclick = () =>
    navigateImageViewer(-1);
  document.getElementById("imgArrowRight").onclick = () =>
    navigateImageViewer(1);

  window.addEventListener("keydown", (e) => {
    if (wrap.style.display !== "grid") return;
    if (e.key === "Escape") closeImageViewer();
    if (e.key === "ArrowLeft") navigateImageViewer(-1);
    if (e.key === "ArrowRight") navigateImageViewer(1);
  });
}
const IMG_VIEWER_STATE = { list: [], idx: 0 };

function closeImageViewer() {
  const modal = document.getElementById("imgViewerModal");
  if (modal) modal.style.display = "none";
  IMG_VIEWER_STATE.list = [];
  IMG_VIEWER_STATE.idx = 0;
}
function navigateImageViewer(step) {
  if (!IMG_VIEWER_STATE.list.length) return;
  IMG_VIEWER_STATE.idx =
    (IMG_VIEWER_STATE.idx + step + IMG_VIEWER_STATE.list.length) %
    IMG_VIEWER_STATE.list.length;
  renderImageViewerFrame();
}
function renderImageViewerFrame() {
  const iframe = document.getElementById("imgFrame");
  const ctr = document.getElementById("imgCounter");
  const url = IMG_VIEWER_STATE.list[IMG_VIEWER_STATE.idx];
  const html = `
    <!doctype html><meta charset="utf-8"><title>Image</title>
    <style>
      html,body{height:100%;margin:0;background:transparent}
      .ph{display:flex;align-items:center;justify-content:center;height:100%}
      img{max-width:100%;max-height:100%}
    </style>
    <div class="ph"><img src="${url}" alt=""></div>
  `;
  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(html);
    doc.close();
  }
  if (ctr)
    ctr.textContent = `${IMG_VIEWER_STATE.idx + 1} / ${
      IMG_VIEWER_STATE.list.length
    }`;
}
function openImageViewer(list, startIdx = 0) {
  ensureImageViewer();
  if (!Array.isArray(list) || !list.length) return;
  IMG_VIEWER_STATE.list = list.slice();
  IMG_VIEWER_STATE.idx = Math.max(0, Math.min(startIdx, list.length - 1));
  const modal = document.getElementById("imgViewerModal");
  if (modal) {
    modal.style.display = "grid";
    renderImageViewerFrame();
  }
}

/* ======================================================================
 * [TRANSFORM] — devices -> rows (AOA)
 * ----------------------------------------------------------------------
 * - devicesToRows(): giữ nguyên mapping theo DEVICE_COLUMNS
 * ==================================================================== */
function devicesToRows(devices = []) {
  const rows = [[...DEVICE_COLUMNS]];
  for (const d of devices) {
    rows.push([
      d?.image ?? "",
      d?.name ?? "",
      d?.type ?? "",
      d?.model ?? "",
      d?.power ?? "",
      d?.voltage ?? "",
      d?.capa ?? "",
      d?.gas ?? "",
      d?.brand ?? "",
      d?.year ?? "",
      d?.location ?? "",
      d?.note ?? "",
    ]);
  }
  return rows;
}

/* ======================================================================
 * [RENDER] — Render bảng xem (read-only)
 * ----------------------------------------------------------------------
 * - renderTable(container): dựng <table>, bind thumbnail -> viewer
 * - adjustFreezeOffsets(): cập nhật --hdr1 sau khi render
 * - 🔧 style thumb-one tại inline style dưới
 * ==================================================================== */
function renderTable(container) {
  const rows = STATE.rows;
  const R = rows.length;
  const C = (rows[0] || []).length;
  const hdr = Math.min(FREEZE_HEADER_ROWS, R);
  const headers = rows.slice(0, hdr);
  const body = rows.slice(hdr);

  let html = `<table><thead>`;
  for (let r = 0; r < hdr; r++) {
    html += `<tr>`;
    for (let c = 0; c < C; c++) {
      html += `<th>${escapeHtml(headers[r][c] ?? "")}</th>`;
    }
    html += `</tr>`;
  }
  html += `</thead><tbody>`;

  for (let i = 0; i < body.length; i++) {
    html += `<tr>`;
    for (let c = 0; c < C; c++) {
      const raw = body[i][c] ?? "";

      if (c === 0) {
        // Cột Hình ảnh: hiển thị thumbnail đầu, click để mở viewer
        const imgs = parseImageList(normalizeImageCellClient(raw)).map(
          toAbsUrl
        );
        if (imgs.length) {
          html += `<td>
            <img class="thumb-one"
                 src="${escapeHtml(imgs[0])}"
                 data-images="${escapeHtml(imgs.join("|"))}"
                 alt=""
                 style="width:42px;height:42px;object-fit:cover;border-radius:6px;border:1px solid var(--line);cursor:pointer"/>
          </td>`;
        } else {
          html += `<td>${escapeHtml(raw)}</td>`;
        }
      } else {
        const v = toAbsUrl(raw);
        if (isImgLike(v)) {
          const text = escapeHtml(v);
          html += `<td>
            <div>${text}</div>
            <img src="${text}" alt="" style="max-height:44px;display:block;margin-top:4px"/>
          </td>`;
        } else {
          html += `<td>${escapeHtml(raw)}</td>`;
        }
      }
    }
    html += `</tr>`;
  }
  html += `</tbody></table>`;

  container.innerHTML = html;
  adjustFreezeOffsets(container);

  // Viewer cho thumbnail cột Hình ảnh
  ensureImageViewer();
  container.querySelectorAll(".thumb-one").forEach((imgEl) => {
    imgEl.addEventListener("click", (e) => {
      e.stopPropagation();
      const list = parseImageList(imgEl.dataset.images || "").map(toAbsUrl);
      if (list.length) openImageViewer(list, 0);
    });
  });
}

/* ======================================================================
 * [PAGE-HTML] — renderInfoPage(key)
 * ----------------------------------------------------------------------
 * - Trả về HTML khối card + CSS nội tuyến cho preview
 * - 🔧 EDIT HERE: chỉnh max-height bảng, style header sticky
 * ==================================================================== */
export function renderInfoPage(key) {
  const ids = { tip: `${key}-tip`, prev: `${key}-preview` };

  return `
  <section class="card">
    <div class="card-h">
      <div class="title"><span class="title-lg">List of Machines</span></div>
    </div>
    <div class="p-4">
      <div id="${ids.tip}" class="muted">Đang tải dữ liệu...</div>
      <div id="${ids.prev}" class="table-wrap"></div>
    </div>
  </section>

  <style>
    #${ids.prev}{ margin-top:6px; max-height:60vh; overflow:auto; border:1px solid var(--line);
      border-radius:10px; background:var(--card); --hdr1:42px; }
    #${ids.prev} table{ border-collapse:collapse; width:max-content; background:var(--card); color:var(--fg); }
    #${ids.prev} th, #${ids.prev} td{ border:1px solid var(--line); padding:10px 12px; white-space:nowrap; line-height:1.5; box-sizing:border-box; }
    #${ids.prev} thead tr:nth-child(1) th{ position:sticky; top:0; z-index:6; background:#f1f5f9; }
    body.dark-theme #${ids.prev} thead tr:nth-child(1) th{ background:#1f2937; }
  </style>`;
}

/* ======================================================================
 * [BIND] — bindInfoEvents(key): tải dữ liệu + render
 * ----------------------------------------------------------------------
 * - Lấy sheet từ query ?sheet=THIET_BI (mặc định)
 * - Gọi API /api/info/latest?name=...
 * - Backend trả { devices: [...] } → chuyển sang AOA rows
 * - Chuẩn hoá cột ảnh trước khi render
 * - Sau render: nếu có UI.lastQuery thì apply lại filter + cập nhật tip
 * - 🔧 EDIT HERE: đổi endpoint hoặc map trường d->rows
 * ==================================================================== */
export function bindInfoEvents(key) {
  const tip = document.getElementById(`${key}-tip`);
  const preview = document.getElementById(`${key}-preview`);

  UI.previewEl = preview;
  UI.tipEl = tip;

  (async function loadInitial() {
    const params = new URLSearchParams(location.search);
    const targetSheet = params.get("sheet") || "THIET_BI";

    if (tip) tip.textContent = "Đang tải dữ liệu...";
    let res;
    try {
      res = await fetch(
        `${API_BASE}/api/info/latest?name=${encodeURIComponent(targetSheet)}`,
        { headers: { Accept: "application/json" } }
      );
    } catch (e) {
      console.error(e);
      if (tip) tip.textContent = "Không kết nối được API.";
      return;
    }

    if (!res.ok) {
      STATE.sheetName = targetSheet;
      STATE.rows = [[...DEVICE_COLUMNS]];
      if (tip) tip.textContent = "Không tải được dữ liệu. Đã tạo sheet trống.";
    } else {
      const doc = await res.json();
      STATE.sheetName = doc.sheetName || targetSheet;

      // Backend mới trả { devices: [...] }, cần chuyển sang AOA rows
      const devices = Array.isArray(doc.devices) ? doc.devices : [];
      STATE.rows = devicesToRows(devices);

      // Chuẩn hoá cột ảnh (0) thành URL tuyệt đối trước khi render
      const startIdx = Math.min(FREEZE_HEADER_ROWS, STATE.rows.length);
      for (let r = startIdx; r < STATE.rows.length; r++) {
        if (!Array.isArray(STATE.rows[r])) continue;
        STATE.rows[r][0] = normalizeImageCellClient(STATE.rows[r][0]);
      }

      if (preview) {
        renderTable(preview);
        // ⚠️ Giữ nguyên ý tưởng gọi lại filter nếu có lastQuery
        // LƯU Ý: tên hàm là applyInfoSearch (viết hoa chữ S)
        if (UI.lastQuery) applyInfoSearch(UI.lastQuery); // KHÔNG đổi logic
        updateTipAfterFilter();
      }
    }
  })();
}
