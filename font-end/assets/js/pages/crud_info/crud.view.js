// assets/js/pages/info/view.js
// ======= CONFIG (fallback nếu project không truyền) =======
const FREEZE_HEADER_ROWS =
  typeof window.FREEZE_HEADER_ROWS === "number" ? window.FREEZE_HEADER_ROWS : 1;
const FREEZE_FIRST_COL =
  typeof window.FREEZE_FIRST_COL === "boolean" ? window.FREEZE_FIRST_COL : true;

// ======= CỘT CHUẨN THIẾT BỊ =======
const DEVICE_COLUMNS = [
  "Hình ảnh",
  "Tên thiết bị",
  "Phân loại thiết bị",
  "Model",
  "Công suất",
  "Điện áp",
  "Capa", // giữa Model ... Gas
  "Gas",
  "Hãng",
  "Năm chế tạo",
  "Vị trí hiện tại",
  "Ghi chú",
];

/* ======= API/FILE BASE (IP cố định BE) ======= */
const API_BASE = "http://10.100.201.25:4000";
const FILE_BASE = "http://10.100.201.25:4000"; // prefix để hiển thị ảnh

function toAbsUrl(u) {
  const s = String(u || "").trim();
  if (!s) return "";
  if (/^data:/i.test(s)) return s; // dataURL -> giữ nguyên
  if (/^https?:\/\//i.test(s)) return s; // http/https -> giữ nguyên
  if (s.startsWith("/")) return FILE_BASE + s; // /uploads/... -> http://IP:PORT/uploads/...
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
/* ======= MAP devices <-> rows (AOA) ======= */
function devicesToRows(devices = []) {
  const rows = [
    [
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
    ],
  ];
  for (const d of devices || []) {
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

function rowsToDevices(rows = []) {
  const start = Math.min(
    typeof window.FREEZE_HEADER_ROWS === "number"
      ? window.FREEZE_HEADER_ROWS
      : 1,
    rows.length
  );
  const out = [];
  for (let r = start; r < rows.length; r++) {
    const row = rows[r] || [];
    out.push({
      image: String(row[0] ?? ""),
      name: String(row[1] ?? ""),
      type: String(row[2] ?? ""),
      model: String(row[3] ?? ""),
      power: String(row[4] ?? ""),
      voltage: String(row[5] ?? ""),
      capa: String(row[6] ?? ""),
      gas: String(row[7] ?? ""),
      brand: String(row[8] ?? ""),
      year: String(row[9] ?? ""),
      location: String(row[10] ?? ""),
      note: String(row[11] ?? ""),
    });
  }
  return out;
}

// ======= STATE =======
const STATE = {
  sheetName: "",
  rows: [], // AOA nháp
  merges: [], // giữ cho export
  originalRows: [], // bản gốc sau khi load/import
  originalMerges: [],
  dirty: false,
  selectedBodyIdxs: new Set(), // index body (0-based)
};

// ======= HELPERS =======
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
    /^https?:\/\/.+\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(s)
  );
}
// tách chuỗi ảnh (url1|url2|...) thành mảng
function parseImageList(val) {
  if (!val) return [];
  const s = String(val);
  if (s.includes("|"))
    return s
      .split("|")
      .map((x) => x.trim())
      .filter(Boolean);
  return isImgLike(s) ? [s] : [];
}
function fileToDataURL(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}
function sheetToMatrixAndMerges(sheet) {
  const ref = sheet["!ref"] || "A1";
  const range = XLSX.utils.decode_range(ref);
  const R = range.e.r - range.s.r + 1;
  const C = range.e.c - range.s.c + 1;
  const matrix = Array.from({ length: R }, () => Array(C).fill(""));
  for (let r = range.s.r; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = sheet[addr];
      matrix[r - range.s.r][c - range.s.c] = (cell && (cell.w ?? cell.v)) ?? "";
    }
  }
  const merges = (sheet["!merges"] || []).map((m) => ({
    s: { r: m.s.r - range.s.r, c: m.s.c - range.s.c },
    e: { r: m.e.r - range.s.r, c: m.e.c - range.s.c },
  }));
  while (matrix.length && matrix.at(-1).every((v) => v === "" || v == null))
    matrix.pop();
  return { matrix, merges };
}
function lastHeaderRow(rows) {
  const idx = Math.max(0, Math.min(FREEZE_HEADER_ROWS, rows.length) - 1);
  return rows[idx] || [];
}
function adjustFreezeOffsets(previewEl) {
  const r1 = previewEl.querySelector("thead tr:first-child");
  if (!r1) return;
  const h1 = Math.ceil(r1.getBoundingClientRect().height);
  previewEl.style.setProperty("--hdr1", h1 + "px");
}
function setDirty(v) {
  STATE.dirty = v;
  const btnSave = document.querySelector(".js-save");
  if (btnSave) btnSave.disabled = !STATE.dirty || STATE.rows.length === 0;
}
function refreshToolbar() {
  const hasRows = STATE.rows.length > 0;
  const btnExport = document.querySelector(".js-export");
  const btnAdd = document.querySelector(".js-add");
  const btnEdit = document.querySelector(".js-edit");
  const btnDel = document.querySelector(".js-del");
  const btnSave = document.querySelector(".js-save");
  if (btnExport) btnExport.disabled = !hasRows;
  if (btnAdd) btnAdd.disabled = !hasRows;
  if (btnEdit) btnEdit.disabled = STATE.selectedBodyIdxs.size === 0;
  if (btnDel) btnDel.disabled = STATE.selectedBodyIdxs.size === 0;
  if (btnSave) btnSave.disabled = !STATE.dirty || !hasRows;
}

/* ======= MIGRATE: đảm bảo có cột Capa trước Gas ======= */
function ensureCapaColumn() {
  if (!STATE.rows.length) return;
  const hdrIdx = Math.max(
    0,
    Math.min(FREEZE_HEADER_ROWS, STATE.rows.length) - 1
  );
  const header = STATE.rows[hdrIdx] || [];
  const hasCapa = header.some((h) => String(h).trim().toLowerCase() === "capa");
  if (hasCapa) return;
  const gasIdx = header.findIndex(
    (h) => String(h).trim().toLowerCase() === "gas"
  );
  const insertAt = gasIdx >= 0 ? gasIdx : header.length;
  header.splice(insertAt, 0, "Capa");
  for (let r = hdrIdx + 1; r < STATE.rows.length; r++) {
    STATE.rows[r].splice(insertAt, 0, "");
  }
}

/* ======= FORM ======= */
function buildForm(formEl, key) {
  if (!formEl) return; // Phòng null
  formEl.innerHTML = "";

  const labels = lastHeaderRow(STATE.rows).length
    ? lastHeaderRow(STATE.rows)
    : DEVICE_COLUMNS;

  labels.forEach((label, idx) => {
    const id = `${key}-f-${idx}`;
    const isImg = String(label).trim().toLowerCase() === "hình ảnh";

    if (isImg) {
      // Chèn UI chọn ảnh
      formEl.insertAdjacentHTML(
        "beforeend",
        `
          <div class="form-field">
            <span class="field-label">${label}</span>

            <div id="${id}-dz" class="img-dropzone" tabindex="0">
              <div id="${id}-thumbs" class="thumbs">
                <span class="placeholder-text">Thêm ít nhất 3 ảnh vào đây</span>
              </div>
            </div>

            <div class="hstack">
              <input id="${id}" type="hidden" />
              <input id="${id}-file" type="file" accept="image/*" multiple class="btn-file" />
            </div>
          </div>
        `
      );

      // ❗ TÌM BÊN TRONG formEl, KHÔNG dùng document.getElementById
      const dz = formEl.querySelector(`[id="${id}-dz"]`);
      const file = formEl.querySelector(`[id="${id}-file"]`);

      // file picker
      if (file) {
        file.onchange = async (ev) => {
          const files = Array.from(ev.target.files || []);
          if (!files.length) return;
          const urls = await Promise.all(files.map(fileToDataURL));
          addImagesToField(key, idx, urls);
        };
      }

      // drag & drop
      if (dz) {
        dz.addEventListener("dragover", (e) => {
          e.preventDefault();
          dz.classList.add("drag");
        });
        dz.addEventListener("dragleave", () => dz.classList.remove("drag"));
        dz.addEventListener("drop", async (e) => {
          e.preventDefault();
          dz.classList.remove("drag");
          const files = Array.from(e.dataTransfer.files || []).filter((f) =>
            /^image\//i.test(f.type)
          );
          if (!files.length) return;
          const urls = await Promise.all(files.map(fileToDataURL));
          addImagesToField(key, idx, urls);
        });

        // paste
        dz.addEventListener("paste", async (e) => {
          const items = Array.from(e.clipboardData?.items || []);
          const files = items
            .map((i) => i.getAsFile())
            .filter(Boolean)
            .filter((f) => /^image\//i.test(f.type));
          if (!files.length) return;
          const urls = await Promise.all(files.map(fileToDataURL));
          addImagesToField(key, idx, urls);
        });
      }
    } else {
      // Input text
      formEl.insertAdjacentHTML(
        "beforeend",
        `
        <div class="form-field">
          <span class="field-label">${label}</span>
          <input id="${id}" class="input" type="text" placeholder="${label}" />
        </div>
      `
      );
    }
  });
}

function readFormRow(key) {
  const fields = lastHeaderRow(STATE.rows).length
    ? lastHeaderRow(STATE.rows)
    : DEVICE_COLUMNS;
  return fields.map((_, idx) => {
    const el = document.getElementById(`${key}-f-${idx}`);
    return el ? el.value : "";
  });
}
function clearForm(key) {
  const fields = lastHeaderRow(STATE.rows).length
    ? lastHeaderRow(STATE.rows)
    : DEVICE_COLUMNS;
  fields.forEach((_, idx) => {
    const base = `${key}-f-${idx}`;
    const inp = document.getElementById(base);
    if (inp) inp.value = "";
    const file = document.getElementById(`${base}-file`);
    if (file) file.value = "";
    const thumbs = document.getElementById(`${base}-thumbs`);
    if (thumbs) thumbs.innerHTML = "";
  });
  const first =
    document.getElementById(`${key}-f-1`) ||
    document.getElementById(`${key}-f-0`);
  if (first) first.focus();
}

/** Nạp dữ liệu lên form, gồm nhiều ảnh cho cột 0 */
function loadRowToForm(key, bodyIdx, rowOverride) {
  const r = FREEZE_HEADER_ROWS + bodyIdx;
  const header = lastHeaderRow(STATE.rows);
  const row = rowOverride || STATE.rows[r] || [];

  header.forEach((_, c) => {
    const base = `${key}-f-${c}`;
    const el = document.getElementById(base);
    if (!el) return;

    if (c === 0) {
      const list = parseImageList(row[c]);
      el.value = list.join("|");
      renderImagePreviews(key, c, list);
    } else {
      el.value = row[c] ?? "";
    }
  });
}

/* ======= Helpers cho ảnh nhiều ======= */
function getImageList(key, colIdx) {
  const s = document.getElementById(`${key}-f-${colIdx}`)?.value || "";
  return s ? s.split("|").filter(Boolean) : [];
}
function setImageList(key, colIdx, list) {
  const hidden = document.getElementById(`${key}-f-${colIdx}`);
  if (hidden) hidden.value = (list || []).join("|");
  renderImagePreviews(key, colIdx, list || []);
  setDirty(true);
}
function addImagesToField(key, colIdx, urls) {
  const list = getImageList(key, colIdx);
  setImageList(key, colIdx, list.concat(urls || []));
}
function renderImagePreviews(key, colIdx, list) {
  const thumbs = document.getElementById(`${key}-f-${colIdx}-thumbs`);
  if (!thumbs) return;
  thumbs.innerHTML = (list || [])
    .map((raw, i) => {
      const src = escapeHtml(toAbsUrl(raw));
      return `
      <div class="thumb">
        <img src="${src}" alt="">
        <button type="button" class="thumb-x" data-i="${i}">×</button>
      </div>`;
    })
    .join("");
  thumbs.querySelectorAll(".thumb-x").forEach((btn) => {
    btn.addEventListener("click", () => {
      const i = +btn.dataset.i;
      const cur = getImageList(key, colIdx);
      cur.splice(i, 1);
      setImageList(key, colIdx, cur);
    });
  });
}
/* ========= IMAGE VIEWER (iframe modal) ========= */
/* Tạo modal 1 lần nếu chưa có */
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
      display:flex; flex-direction:column; overflow:hidden; position:relative;
    ">
      <div style="display:flex; align-items:center; gap:8px; padding:8px 10px; border-bottom:1px solid var(--line,#e5e7eb)">
        <div id="imgCounter" style="font-size:12px; opacity:.7">1 / 1</div>
        <div style="flex:1"></div>
        <button id="imgCloseBtn" class="btn" style="padding:6px 10px; border:none">✖</button>
      </div>

      <!-- Khu vực hiển thị ảnh + mũi tên overlay -->
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

  // Đóng khi bấm nền tối
  wrap.addEventListener("click", (e) => {
    if (e.target === wrap) closeImageViewer();
  });

  // Nút close
  document.getElementById("imgCloseBtn").onclick = closeImageViewer;

  // Nút mũi tên overlay
  document.getElementById("imgArrowLeft").onclick = () =>
    navigateImageViewer(-1);
  document.getElementById("imgArrowRight").onclick = () =>
    navigateImageViewer(1);

  // Phím tắt
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

  // Tạo HTML đơn giản hiển thị ảnh full trong iframe
  const html = `
    <!doctype html>
    <meta charset="utf-8">
    <title>Image</title>
    <style>
      html,body{height:100%;margin:0;background:transparent}
      .ph{display:flex;align-items:center;justify-content:center;height:100%}
      img{max-width:100%;max-height:100%}
    </style>
    <div class="ph"><img src="${url}" alt=""></div>
  `;
  // Viết vào iframe
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

  // Gán nút prev/next (sau khi modal đã có)
  const prevBtn = document.getElementById("imgPrevBtn");
  const nextBtn = document.getElementById("imgNextBtn");
  if (prevBtn) prevBtn.onclick = () => navigateImageViewer(-1);
  if (nextBtn) nextBtn.onclick = () => navigateImageViewer(1);
}

/* Mở viewer với danh sách ảnh và index bắt đầu */
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

// ======= RENDER TABLE =======
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
    html += `<th class="sel-col">#</th>`;
    for (let c = 0; c < C; c++) {
      html += `<th>${escapeHtml(headers[r][c] ?? "")}</th>`;
    }
    html += `<th class="actions-col">Thao tác</th>`;
    html += `</tr>`;
  }
  html += `</thead><tbody>`;

  for (let i = 0; i < body.length; i++) {
    const selected = STATE.selectedBodyIdxs.has(i);
    html += `<tr data-body-idx="${i}" ${
      selected ? 'class="row-selected"' : ""
    }>`;
    html += `<td class="sel-col"><input type="checkbox" class="row-check" ${
      selected ? "checked" : ""
    }></td>`;

    for (let c = 0; c < C; c++) {
      const vRaw = body[i][c] ?? "";
      const editable = `contenteditable="false" spellcheck="false"`;

      if (c === 0) {
        // Cột Hình ảnh: chỉ hiển thị 1 thumbnail (tấm đầu), click để mở viewer
        const imgs = parseImageList(vRaw).map(toAbsUrl);
        if (imgs.length) {
          html += `<td ${editable} data-body="${i}" data-c="${c}">
                    <img class="thumb-one"
                         src="${escapeHtml(imgs[0])}"
                         data-images="${escapeHtml(imgs.join("|"))}"
                         alt=""
                         style="width:42px;height:42px;object-fit:cover;border-radius:6px;border:1px solid var(--line);cursor:pointer"/>
                  </td>`;
        } else {
          html += `<td ${editable} data-body="${i}" data-c="${c}">${escapeHtml(
            vRaw
          )}</td>`;
        }
      } else {
        // Các cột khác: nếu là ảnh đơn -> preview
        const v = toAbsUrl(vRaw);
        if (isImgLike(v)) {
          const text = escapeHtml(v);
          html += `<td ${editable} data-body="${i}" data-c="${c}">
                    <div data-celltext="1">${text}</div>
                    <img src="${text}" alt="" style="max-height:44px;display:block;margin-top:4px"/>
                  </td>`;
        } else {
          html += `<td ${editable} data-body="${i}" data-c="${c}">${escapeHtml(
            vRaw
          )}</td>`;
        }
      }
    }

    html += `<td class="actions-cell">
              <button type="button" class="btn-xxs row-edit btn primary" data-bi="${i}">✏️ Sửa</button>
              <button type="button" class="btn-xxs row-del btn primary"  data-bi="${i}" style="background-color: red; border:none">🗑️ Xóa</button>
            </td>`;
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

  // Chọn dòng
  container.querySelectorAll(".row-check").forEach((chk) => {
    chk.addEventListener("change", (e) => {
      const tr = e.target.closest("tr");
      const bi = +tr.dataset.bodyIdx;
      if (e.target.checked) {
        STATE.selectedBodyIdxs.add(bi);
        tr.classList.add("row-selected");
      } else {
        STATE.selectedBodyIdxs.delete(bi);
        tr.classList.remove("row-selected");
      }
      refreshToolbar();
    });
  });

  // Sửa inline
  container
    .querySelectorAll('tbody td[contenteditable="true"]')
    .forEach((td) => {
      td.addEventListener("blur", () => {
        const bi = +td.dataset.body;
        const c = +td.dataset.c;
        const r = FREEZE_HEADER_ROWS + bi;

        // Mặc định lấy text
        let val = td.textContent.trim();

        // Nếu là ô đã render text+preview ảnh đơn (cột ≠ 0), ưu tiên lấy từ div text
        const txtDiv = td.querySelector('[data-celltext="1"]');
        if (txtDiv) val = txtDiv.textContent.trim();

        // Cột 0 (Hình ảnh): không ghi đè chuỗi url1|url2 khi blur
        if (c === 0) val = STATE.rows[r][c];

        STATE.rows[r][c] = val;
        setDirty(true);
      });

      td.addEventListener("paste", (ev) => {
        const text = (ev.clipboardData || window.clipboardData).getData("text");
        const abs = toAbsUrl(text);
        if (isImgLike(abs)) {
          ev.preventDefault();
          const bi = +td.dataset.body,
            c = +td.dataset.c,
            r = FREEZE_HEADER_ROWS + bi;
          STATE.rows[r][c] = abs;
          setDirty(true);
          renderTable(container);
        }
      });
    });

  // Sửa/Xóa theo hàng
  container.querySelectorAll(".row-edit").forEach((btn) => {
    btn.addEventListener("click", () => {
      const bi = +btn.dataset.bi;
      const r = FREEZE_HEADER_ROWS + bi;
      const rowData = (STATE.rows[r] || []).slice();

      loadRowToForm(currentBindKey, bi, rowData); // nạp form (kể cả ảnh)
      STATE.rows.splice(r, 1); // xoá tạm khỏi bảng
      STATE.selectedBodyIdxs.clear();
      setDirty(true);
      renderTable(container);
      refreshToolbar();
      document
        .getElementById(`${currentBindKey}-form`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
  container.querySelectorAll(".row-del").forEach((btn) => {
    btn.addEventListener("click", () => {
      const bi = +btn.dataset.bi;
      const r = FREEZE_HEADER_ROWS + bi;
      STATE.rows.splice(r, 1);
      STATE.selectedBodyIdxs.delete(bi);
      setDirty(true);
      renderTable(container);
      refreshToolbar();
    });
  });
}

// ======= PAGE RENDER =======
export function renderCrudInfoPage(key) {
  const cfg =
    (window.CRUD_INFO_RESOURCES && window.CRUD_INFO_RESOURCES[key]) || null;
  const ids = {
    file: `${key}-file`,
    import: `${key}-import`,
    export: `${key}-export`,
    save: `${key}-save`,
    reset: `${key}-reset`,
    del: `${key}-delete`,
    add: `${key}-add`,
    edit: `${key}-edit`,
    tip: `${key}-tip`,
    prev: `${key}-preview`,
    form: `${key}-form`,
  };

  return `
  <section class="card">
    <div class="card-h"><div class="title"><span class="title-lg">${
      cfg?.title || "Thêm thông tin thiết bị"
    }</span></div></div>
    <div class="p-4">

      <!-- Form -->
      <div class="panel">
        <form id="${ids.form}" class="form-grid"></form>
        <div class="row" style="display:flex; gap:8px; margin-top:8px;">
          <input type="file" id="${
            ids.file
          }" accept=".xlsx,.xls" style="display:none" />
          <button class="btn js-import" id="${ids.import}">📥 Import</button>
          <button class="btn js-add" id="${ids.add}" disabled>➕ Thêm</button>
          <div style="flex:1"></div>
        </div>
      </div>

      <!-- Thanh hành động của bảng -->
      <div class="table-actions" style="display:flex; gap:8px; align-items:center; margin:10px 0 6px;">
        <div style="flex:1"></div>
        <button class="btn primary js-save" id="${
          ids.save
        }" disabled>✅ Save</button>
        <button class="btn js-export" id="${
          ids.export
        }" disabled>📤 Export</button>
      </div>

      <div id="${ids.tip}" class="muted">Đang tải dữ liệu...</div>
      <div id="${ids.prev}" class="table-wrap"></div>
    </div>
  </section>

  <style>
    .panel { border:1px solid var(--line); border-radius:10px; background:var(--card); padding:12px; }
    .form-grid{ display:grid; grid-template-columns:repeat(3, minmax(220px,1fr)); gap:12px; }
    @media (max-width:1024px){ .form-grid{ grid-template-columns:repeat(2, minmax(200px,1fr)); } }
    @media (max-width:640px){  .form-grid{ grid-template-columns:1fr; } }

    .form-field{ display:flex; flex-direction:column; gap:6px; }
    .field-label{ font-size:12.5px; font-weight:600; color:var(--muted,#556); }
    .input{ width:100%; padding:10px 12px; border:1px solid var(--line); border-radius:8px; background:var(--card); color:var(--fg); box-sizing:border-box; }

    .hstack{ display:flex; gap:8px; align-items:center; }
    .btn-file{ font-size:12px; padding:6px 10px; }

    .img-dropzone{
      border:1px dashed var(--line); border-radius:10px;
      padding:10px; min-height:84px; background:var(--card);
      display:flex; align-items:flex-start; gap:10px; flex-wrap:wrap; position:relative; cursor:pointer;
    }
    .img-dropzone.drag{ outline:2px dashed var(--accent,#3b82f6); outline-offset:-4px; }
    .img-dropzone .dz-hint{ position:absolute; left:12px; bottom:8px; font-size:12px; opacity:.6; }

    .thumbs{ display:flex; gap:10px; flex-wrap:wrap; }
    .thumb{ position:relative; width:84px; height:84px; border:1px solid var(--line); border-radius:8px; overflow:hidden; background:#0001; }
    .thumb img{ width:100%; height:100%; object-fit:cover; display:block; }
    .thumb-x{ position:absolute; top:1px; right:1px; width:20px; height:20px; line-height:18px; border-radius:50%; border:none; background:transparent; cursor:pointer; font-weight:700; color:red }

    /* Bảng */
    #${
      ids.prev
    }{ margin-top:6px; max-height:60vh; overflow:auto; border:1px solid var(--line); border-radius:10px; background:var(--card); --hdr1:42px; }
    #${
      ids.prev
    } table{ border-collapse:collapse; width:max-content; background:var(--card); color:var(--fg); }
    #${ids.prev} th, #${
    ids.prev
  } td{ border:1px solid var(--line); padding:10px 12px; white-space:nowrap; line-height:1.5; box-sizing:border-box; }
    #${ids.prev} td[contenteditable="true"]{ outline:none; }
    #${
      ids.prev
    } tr.row-selected{ outline:2px solid var(--accent,#3b82f6); outline-offset:-2px; }
    #${
      ids.prev
    } thead tr:nth-child(1) th{ position:sticky; top:0; z-index:6; background:#f1f5f9; }
    body.dark-theme #${ids.prev} thead tr:nth-child(1) th{ background:#1f2937; }
    #${ids.prev} .sel-col{ width:44px; text-align:center; ${
    FREEZE_FIRST_COL
      ? "position:sticky; left:0; z-index:7; background:var(--card);"
      : ""
  } }
    #${ids.prev} .actions-col, #${
    ids.prev
  } .actions-cell { text-align:center; white-space:nowrap; }
    .btn-xxs{ font-size:12px; padding:4px 8px; border:1px solid var(--line); border-radius:6px; background:var(--card); cursor:pointer; }
    .btn-xxs + .btn-xxs{ margin-left:6px; }

    /* cell hiển thị nhiều ảnh */
    .cell-thumbs{ display:flex; gap:6px; align-items:center; }
    .cell-thumbs img{ width:40px; height:40px; object-fit:cover; border-radius:6px; border:1px solid var(--line); }
  </style>`;
}

// để dùng trong renderTable
let currentBindKey = "";

// ======= BIND =======
export function bindCrudInfoEvents(key) {
  currentBindKey = key;

  const cfg = (window.CRUD_INFO_RESOURCES &&
    window.CRUD_INFO_RESOURCES[key]) || {
    latestByName: (name) =>
      `${API_BASE}/api/info/latest?name=${encodeURIComponent(
        name || "THIET_BI"
      )}`,
    latestAny: () => `${API_BASE}/api/info/latest`,
    postPath: () => `${API_BASE}/api/info`,
    defaultSheet: "THIET_BI",
    title: "Quản lý thiết bị",
  };

  const fileInput = document.getElementById(`${key}-file`);
  const btnImport = document.getElementById(`${key}-import`);
  const btnExport = document.getElementById(`${key}-export`);
  const btnSave = document.getElementById(`${key}-save`);
  const btnDel = document.getElementById(`${key}-delete`);
  const btnAdd = document.getElementById(`${key}-add`);
  const btnEdit = document.getElementById(`${key}-edit`);
  const tip = document.getElementById(`${key}-tip`);
  const preview = document.getElementById(`${key}-preview`);
  const form = document.getElementById(`${key}-form`);

  // IMPORT
  btnImport.onclick = () => fileInput.click();
  fileInput.onchange = async (ev) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const wsName = wb.SheetNames[0];
      const ws = wb.Sheets[wsName];
      const { matrix, merges } = sheetToMatrixAndMerges(ws);

      STATE.sheetName = wsName;
      STATE.rows = matrix;
      STATE.merges = merges;

      ensureCapaColumn();
      STATE.originalRows = JSON.parse(JSON.stringify(STATE.rows));
      STATE.originalMerges = JSON.parse(JSON.stringify(STATE.merges));
      STATE.selectedBodyIdxs.clear();

      buildForm(form, key);
      setDirty(true);
      renderTable(preview);
      tip.textContent = `Đã import: ${wsName} — ${STATE.rows.length} hàng × ${
        (STATE.rows[0] || []).length
      } cột.`;
      refreshToolbar();
    } catch (e) {
      console.error(e);
      alert("Không đọc được file Excel");
    } finally {
      ev.target.value = "";
    }
  };

  // EXPORT
  btnExport.onclick = () => {
    if (!STATE.rows.length) return;
    const ws = XLSX.utils.aoa_to_sheet(STATE.rows);
    if (STATE.merges?.length) ws["!merges"] = STATE.merges;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, STATE.sheetName || key.toUpperCase());
    XLSX.writeFile(wb, `${key}_${STATE.sheetName || "sheet"}.xlsx`);
  };

  // SAVE (PUT)
  btnSave.onclick = async () => {
    if (!STATE.rows.length) return;
    try {
      const devices = rowsToDevices(STATE.rows);
      const res = await fetch(`${API_BASE}/api/info`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheetName: STATE.sheetName || "THIET_BI",
          devices,
          merged: Array.isArray(STATE.merges) ? STATE.merges : [], // bỏ merge khi cho phép chỉnh inline
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Lỗi lưu dữ liệu");
      }
      const data = await res.json();
      alert("✅ Đã lưu! ID: " + (data.id || data._id || "OK"));
      STATE.originalRows = JSON.parse(JSON.stringify(STATE.rows));
      STATE.originalMerges = JSON.parse(JSON.stringify(STATE.merges));
      setDirty(false);
      refreshToolbar();
    } catch (e) {
      console.error(e);
      alert("❌ Không lưu được: " + e.message);
    }
  };

  // ADD
  btnAdd.onclick = () => {
    const newRow = readFormRow(key);
    if (STATE.rows.length === 0) STATE.rows = [[...DEVICE_COLUMNS]];
    ensureCapaColumn();
    STATE.rows.push(newRow);
    setDirty(true);
    renderTable(preview);
    refreshToolbar();
    clearForm(key);
  };

  // Toolbar EDIT/DEL (tùy có render hay không)
  if (btnEdit) {
    btnEdit.onclick = () => {
      if (STATE.selectedBodyIdxs.size === 0) return;
      const targetBodyIdx = [...STATE.selectedBodyIdxs][0];
      const r = FREEZE_HEADER_ROWS + targetBodyIdx;
      const fields = lastHeaderRow(STATE.rows);
      fields.forEach((_, c) => {
        const el = document.getElementById(`${key}-f-${c}`);
        if (el) STATE.rows[r][c] = el.value;
      });
      setDirty(true);
      renderTable(preview);
      refreshToolbar();
    };
  }
  if (btnDel) {
    btnDel.onclick = () => {
      if (STATE.selectedBodyIdxs.size === 0) return;
      const sorted = [...STATE.selectedBodyIdxs].sort((a, b) => b - a);
      for (const bi of sorted) STATE.rows.splice(FREEZE_HEADER_ROWS + bi, 1);
      STATE.selectedBodyIdxs.clear();
      setDirty(true);
      renderTable(preview);
      refreshToolbar();
    };
  }

  // LOAD INITIAL
  (async function loadInitial() {
    const params = new URLSearchParams(location.search);
    const targetSheet = params.get("sheet") || "THIET_BI";

    tip.textContent = "Đang tải dữ liệu...";
    let res = await fetch(
      `${API_BASE}/api/info/latest?name=${encodeURIComponent(targetSheet)}`,
      { headers: { Accept: "application/json" } }
    );

    if (res.status === 404) {
      const tryAny = await fetch(`${API_BASE}/api/info/latest`, {
        headers: { Accept: "application/json" },
      });
      if (tryAny.ok) res = tryAny;
      else {
        STATE.sheetName = targetSheet;
        STATE.rows = [[...DEVICE_COLUMNS]];
        STATE.merges = [];
        ensureCapaColumn();
        STATE.originalRows = JSON.parse(JSON.stringify(STATE.rows));
        STATE.originalMerges = [];
        buildForm(form, key);
        setDirty(false);
        renderTable(preview);
        refreshToolbar();
        return;
      }
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error(err);
      STATE.sheetName = targetSheet;
      STATE.rows = [[...DEVICE_COLUMNS]];
      STATE.merges = [];
      tip.textContent = "Không tải được dữ liệu. Đã tạo sheet trống.";
    } else {
      const doc = await res.json();
      STATE.sheetName = doc.sheetName || targetSheet;

      // ===== ƯU TIÊN BE MỚI: devices/merged =====
      if (Array.isArray(doc.devices)) {
        // Cần có 2 hàm trợ giúp đã thêm trước đó:
        // devicesToRows(devices) và normalizeImageCellClient(...)
        let rows = devicesToRows(doc.devices);

        // Chuẩn hoá URL ảnh ở cột 0
        const startIdx = Math.min(FREEZE_HEADER_ROWS, rows.length);
        for (let r = startIdx; r < rows.length; r++) {
          if (!Array.isArray(rows[r])) continue;
          rows[r][0] = normalizeImageCellClient(rows[r][0]);
        }

        STATE.rows = rows;
        STATE.merges = Array.isArray(doc.merged) ? doc.merged : [];
      } else {
        // ===== Fallback BE cũ: rows/merges =====
        STATE.rows =
          Array.isArray(doc.rows) && doc.rows.length
            ? doc.rows
            : [[...DEVICE_COLUMNS]];
        STATE.merges = Array.isArray(doc.merges) ? doc.merges : [];

        // Chuẩn hoá URL ảnh ở cột 0
        const startIdx = Math.min(FREEZE_HEADER_ROWS, STATE.rows.length);
        for (let r = startIdx; r < STATE.rows.length; r++) {
          if (!Array.isArray(STATE.rows[r])) continue;
          STATE.rows[r][0] = normalizeImageCellClient(STATE.rows[r][0]);
        }
      }

      ensureCapaColumn();
      tip.textContent = `Sheet: ${STATE.sheetName} — ${
        STATE.rows.length - FREEZE_HEADER_ROWS
      } hàng dữ liệu + ${FREEZE_HEADER_ROWS} header`;
    }

    STATE.originalRows = JSON.parse(JSON.stringify(STATE.rows));
    STATE.originalMerges = JSON.parse(JSON.stringify(STATE.merges));
    buildForm(form, key);
    setDirty(false);
    renderTable(preview);
    refreshToolbar();
  })();
}
