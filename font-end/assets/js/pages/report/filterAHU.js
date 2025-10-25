// filterAHU.js
// ======================================================================
//  TABLE OF CONTENTS / MỤC LỤC  (KHÔNG ĐỔI LOGIC, CHỈ SẮP XẾP LẠI)
//  [CONFIG]            : API config, normalize URL
//  [DATA LOADING]      : fetch dữ liệu theo ngày, fallback mẫu
//  [TEMPLATE]          : render HTML table + styles inline
//  [IMAGE HELPERS]     : show/clear ảnh preview (trước/sau)
//  [BIND EVENTS]       : gắn sự kiện chọn ảnh, xóa ảnh, enable/disable
//  [PUBLIC API]        : window.currentReportEnableEdit / DisableEdit / CollectAndSubmit
//  [EXPORT PNG]        : window.exportFilterAHUToPNG
//  [MAIN]              : export async function renderFilterReport(date)
// ======================================================================

/* ======================================================================
 * [CONFIG] — API & URL chuẩn hoá
 * ----------------------------------------------------------------------
 * - API_BASE: endpoint backend ghi/đọc record filter AHU
 * - normalizeUrl(): đảm bảo URL ảnh tuyệt đối (ghép origin nếu /uploads/..)
 * - 🔧 EDIT HERE: đổi IP/route nếu backend thay đổi
 * ==================================================================== */
// === API config ===
const API_BASE = "http://10.100.201.25:4000/api/records"; // 🔧 EDIT HERE
const API_ORIGIN = new URL(API_BASE).origin; // -> "http://10.100.201.25:4000"

// Chuẩn hoá URL: nếu BE trả "/uploads/..." thì ghép origin của API
const normalizeUrl = (url) => {
  if (!url) return "";
  if (/^https?:\/\//i.test(url) || url.startsWith("data:")) return url;
  if (url.startsWith("/uploads/")) return `${API_ORIGIN}${url}`;
  return url;
};

/* ======================================================================
 * [DATA LOADING] — lấy dữ liệu theo ngày & fallback nếu trống
 * ----------------------------------------------------------------------
 * - loadData(yyyyMmDd): GET /filterAHU?date=... → { items: [...] }
 * - buildFallback(): 10 dòng mẫu nếu ngày đó chưa có dữ liệu
 * - mapping giữ nguyên các field: no, machineName, room, content, result...
 * ==================================================================== */
async function loadData(yyyyMmDd) {
  let data = [];
  try {
    const res = await fetch(
      `${API_BASE}/filterAHU?date=${encodeURIComponent(yyyyMmDd)}`
    );
    if (res.ok) {
      const json = await res.json();
      data = (json.items || []).map((it, idx) => ({
        no: it.no ?? idx + 1,
        machineName: it.machineName ?? "",
        room: it.room ?? "",
        content: it.content ?? "",
        result: it.result ?? "OK",
        personInCharge: it.personInCharge ?? "",
        pictureBefore: normalizeUrl(
          it.pictureBeforeUrl || it.pictureBefore || ""
        ),
        pictureAfter: normalizeUrl(it.pictureAfterUrl || it.pictureAfter || ""),
      }));
    }
  } catch (e) {
    console.error("Load API error:", e);
  }
  return data;
}

function buildFallback() {
  return [
    {
      no: 1,
      machineName: "AHU 01",
      room: "SMT room",
      content: "Thay OA filter hàng ngày cho AHU 01",
      result: "OK",
      personInCharge: "",
      pictureBefore: "",
      pictureAfter: "",
    },
    {
      no: 2,
      machineName: "AHU 02",
      room: "SMT room",
      content: "Thay OA filter hàng ngày cho AHU 02",
      result: "OK",
      personInCharge: "",
      pictureBefore: "",
      pictureAfter: "",
    },
    {
      no: 3,
      machineName: "AHU 03",
      room: "SMT room",
      content: "Thay OA filter hàng ngày cho AHU 03",
      result: "OK",
      personInCharge: "",
      pictureBefore: "",
      pictureAfter: "",
    },
    {
      no: 4,
      machineName: "AHU 04",
      room: "SMT/LaserRoom",
      content: "Thay OA filter hàng ngày cho AHU 04",
      result: "OK",
      personInCharge: "",
      pictureBefore: "",
      pictureAfter: "",
    },
    {
      no: 5,
      machineName: "AHU 05",
      room: "Coverlay,Sub Room",
      content: "Thay OA filter hàng ngày cho AHU 05",
      result: "OK",
      personInCharge: "",
      pictureBefore: "",
      pictureAfter: "",
    },
    {
      no: 6,
      machineName: "AHU 06",
      room: "Copper Plating Room",
      content: "Thay OA filter hàng ngày cho AHU 06",
      result: "OK",
      personInCharge: "",
      pictureBefore: "",
      pictureAfter: "",
    },
    {
      no: 7,
      machineName: "AHU 07",
      room: "Exposure Room",
      content: "Thay OA filter hàng ngày cho AHU 07",
      result: "OK",
      personInCharge: "",
      pictureBefore: "",
      pictureAfter: "",
    },
    {
      no: 8,
      machineName: "AHU 08",
      room: "Exposure Room",
      content: "Thay OA filter hàng ngày cho AHU 08",
      result: "OK",
      personInCharge: "",
      pictureBefore: "",
      pictureAfter: "",
    },
    {
      no: 9,
      machineName: "AHU 09",
      room: "Wetline room",
      content: "Thay OA filter hàng ngày cho AHU 09",
      result: "OK",
      personInCharge: "",
      pictureBefore: "",
      pictureAfter: "",
    },
    {
      no: 10,
      machineName: "AHU 10",
      room: "Final Room",
      content: "Thay OA filter hàng ngày cho AHU 10",
      result: "OK",
      personInCharge: "",
      pictureBefore: "",
      pictureAfter: "",
    },
  ];
}

/* ======================================================================
 * [TEMPLATE] — Tạo HTML table & styles inline
 * ----------------------------------------------------------------------
 * - buildRowsHTML(data): render <tr>…</tr> (giữ id controls như cũ)
 * - buildTableHTML(rowsHTML): bọc table + style
 * - NOTE: không đổi id vì còn dùng ở BIND EVENTS
 * ==================================================================== */
function buildRowsHTML(data) {
  return data
    .map(
      (item, index) => `
    <tr>
      <td>${item.no}</td>
      <td>${item.machineName}</td>
      <td>${item.room}</td>
      <td>${item.content}</td>

      <td>
        <input id="result-${index}" class="cell-input" type="text" value="${
        item.result || "OK"
      }" disabled />
      </td>

      <td>
        <input id="person-${index}" class="cell-input" type="text" value="${
        item.personInCharge || ""
      }" disabled />
      </td>

      <!-- Ảnh trước -->
      <td style="width:150px; height:200px; text-align:center; position:relative;">
        <input type="file" id="before-file-${index}" accept="image/*" style="display:none" disabled />
        <div class="file-upload-box" id="before-upload-box-${index}"
             style="width:150px; height:200px; border:none; display:flex; justify-content:center; align-items:center; cursor:not-allowed; position:relative; pointer-events:none; background:transparent">
          <span style="font-size:48px; color:#999;">+</span>
        </div>
        <button id="before-remove-${index}" style="position:absolute; top:2px; right:2px; display:none; background:#f44336; border:none; color:white; border-radius:50%; width:24px; height:24px; cursor:pointer; font-weight:bold; line-height:20px;" title="Xóa ảnh">×</button>
      </td>

      <!-- Ảnh sau -->
      <td style="width:150px; height:200px; text-align:center; position:relative;">
        <input type="file" id="after-file-${index}" accept="image/*" style="display:none" disabled />
        <div class="file-upload-box" id="after-upload-box-${index}"
             style="width:150px; height:200px; border:none; display:flex; justify-content:center; align-items:center; cursor:not-allowed; position:relative; pointer-events:none; background:transparent">
          <span style="font-size:48px; color:#999;">+</span>
        </div>
        <button id="after-remove-${index}" style="position:absolute; top:2px; right:2px; display:none; background:#f44336; border:none; color:white; border-radius:50%; width:24px; height:24px; cursor:pointer; font-weight:bold; line-height:20px;" title="Xóa ảnh">×</button>
      </td>
    </tr>
  `
    )
    .join("");
}

function buildTableHTML(rowsHTML) {
  return `
    <div style="overflow-x:auto; max-height: 750px; overflow-y:auto;">
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
      <table class="table-report" style="width:100%; border-collapse: collapse; text-align:left">
        <thead style="position: sticky; top: 0; z-index: 10; background-color: #fff;">
          <tr>
            <th>STT</th>
            <th>Tên máy</th>
            <th>Tên phòng</th>
            <th>Nội dung bảo dưỡng</th>
            <th>Kết quả</th>
            <th>Người thực hiện</th>
            <th>Hình ảnh trước</th>
            <th>Hình ảnh sau</th>
          </tr>
        </thead>
        <tbody>${rowsHTML}</tbody>
      </table>
    </div>
  `;
}

/* ======================================================================
 * [IMAGE HELPERS] — hiển thị/ẩn preview ảnh
 * ----------------------------------------------------------------------
 * - ensureImg(box): chèn <img.preview> nếu chưa có
 * - showImage(box, removeBtn, url): hiển thị & bật nút xoá
 * - clearImage(box, removeBtn): ẩn ảnh & hiện dấu +
 * ==================================================================== */
function ensureImg(box) {
  if (!box) return null;
  let img = box.querySelector("img.preview");
  if (!img) {
    img = document.createElement("img");
    img.className = "preview";
    img.style.maxWidth = "100%";
    img.style.maxHeight = "100%";
    img.style.objectFit = "contain";
    img.style.display = "block";
    img.onerror = () => {
      console.warn("Image failed");
      img.remove();
      const span = box.querySelector("span");
      if (span) span.style.display = "block";
      const btn = box.parentElement?.querySelector("button[id$='remove']");
      if (btn) btn.style.display = "none";
    };
    box.appendChild(img);
  }
  return img;
}

function showImage(box, removeBtn, url) {
  if (!box || !removeBtn || !url) return;
  const img = ensureImg(box);
  if (!img) return;
  img.src = normalizeUrl(url);
  const span = box.querySelector("span");
  if (span) span.style.display = "none";
  removeBtn.style.display = "block";
}

function clearImage(box, removeBtn) {
  if (!box || !removeBtn) return;
  const img = box.querySelector("img.preview");
  if (img) img.remove();
  const span = box.querySelector("span");
  if (span) span.style.display = "block";
  removeBtn.style.display = "none";
}

/* ======================================================================
 * [BIND EVENTS] — gắn sự kiện chọn/xoá ảnh & enable/disable input
 * ----------------------------------------------------------------------
 * - bindRowEvents(data): gắn events cho từng hàng sau khi table vào DOM
 * - sử dụng updatedData (clone) để theo dõi removeBefore/removeAfter
 * ==================================================================== */
function bindRowEvents(data) {
  const updatedData = [...data];

  data.forEach((item, index) => {
    const beforeInput = document.getElementById(`before-file-${index}`);
    const beforeBox = document.getElementById(`before-upload-box-${index}`);
    const beforeRemove = document.getElementById(`before-remove-${index}`);

    const afterInput = document.getElementById(`after-file-${index}`);
    const afterBox = document.getElementById(`after-upload-box-${index}`);
    const afterRemove = document.getElementById(`after-remove-${index}`);

    // hiển thị ảnh hiện có (nếu có)
    if (item.pictureBefore)
      showImage(beforeBox, beforeRemove, item.pictureBefore);
    if (item.pictureAfter) showImage(afterBox, afterRemove, item.pictureAfter);

    // ẩn nút xoá mặc định
    if (beforeRemove) beforeRemove.style.display = "none";
    if (afterRemove) afterRemove.style.display = "none";

    // click box -> chọn file (khi cho phép)
    if (beforeBox && beforeInput) {
      beforeBox.addEventListener("click", () => {
        if (!beforeInput.disabled) beforeInput.click();
      });
    }
    if (afterBox && afterInput) {
      afterBox.addEventListener("click", () => {
        if (!afterInput.disabled) afterInput.click();
      });
    }

    // chọn file ảnh trước
    if (beforeInput && beforeBox && beforeRemove) {
      beforeInput.addEventListener("change", (e) => {
        const file = e.target.files?.[0];
        if (file) {
          const url = URL.createObjectURL(file);
          showImage(beforeBox, beforeRemove, url);
          updatedData[index].pictureBefore = file;
          updatedData[index].__removeBefore = false;
        }
      });
    }

    // chọn file ảnh sau
    if (afterInput && afterBox && afterRemove) {
      afterInput.addEventListener("change", (e) => {
        const file = e.target.files?.[0];
        if (file) {
          const url = URL.createObjectURL(file);
          showImage(afterBox, afterRemove, url);
          updatedData[index].pictureAfter = file;
          updatedData[index].__removeAfter = false;
        }
      });
    }

    // xoá ảnh trước
    if (beforeRemove && beforeInput && beforeBox) {
      beforeRemove.addEventListener("click", (e) => {
        e.stopPropagation();
        if (beforeInput.disabled) return;
        beforeInput.value = "";
        clearImage(beforeBox, beforeRemove);
        updatedData[index].pictureBefore = "";
        updatedData[index].__removeBefore = true;
      });
    }

    // xoá ảnh sau
    if (afterRemove && afterInput && afterBox) {
      afterRemove.addEventListener("click", (e) => {
        e.stopPropagation();
        if (afterInput.disabled) return;
        afterInput.value = "";
        clearImage(afterBox, afterRemove);
        updatedData[index].pictureAfter = "";
        updatedData[index].__removeAfter = true;
      });
    }
  });

  return updatedData;
}

/* ======================================================================
 * [PUBLIC API] — bật/tắt chế độ sửa & submit
 * ----------------------------------------------------------------------
 * - window.currentReportEnableEdit(): bật input + cho phép chọn ảnh
 * - window.currentReportDisableEdit(): khoá input + ẩn nút xoá
 * - window.currentReportCollectAndSubmit(dateStr): gửi form lên BE
 * - Giữ nguyên tên API để không vỡ nơi khác gọi
 * ==================================================================== */
function exposePublicAPIs(data, updatedData) {
  window.currentReportEnableEdit = () => {
    data.forEach((_, i) => {
      const personEl = document.getElementById(`person-${i}`);
      const resultEl = document.getElementById(`result-${i}`);
      const beforeInput = document.getElementById(`before-file-${i}`);
      const afterInput = document.getElementById(`after-file-${i}`);
      const beforeBox = document.getElementById(`before-upload-box-${i}`);
      const afterBox = document.getElementById(`after-upload-box-${i}`);
      const beforeRemove = document.getElementById(`before-remove-${i}`);
      const afterRemove = document.getElementById(`after-remove-${i}`);

      if (personEl) personEl.disabled = false;
      if (resultEl) resultEl.disabled = false;
      if (beforeInput) beforeInput.disabled = false;
      if (afterInput) afterInput.disabled = false;

      if (beforeBox) {
        beforeBox.style.pointerEvents = "auto";
        beforeBox.style.cursor = "pointer";
      }
      if (afterBox) {
        afterBox.style.pointerEvents = "auto";
        afterBox.style.cursor = "pointer";
      }
      if (beforeRemove && data[i].pictureBefore)
        beforeRemove.style.display = "block";
      if (afterRemove && data[i].pictureAfter)
        afterRemove.style.display = "block";
    });
  };

  window.currentReportDisableEdit = () => {
    data.forEach((_, i) => {
      const personEl = document.getElementById(`person-${i}`);
      const resultEl = document.getElementById(`result-${i}`);
      const beforeInput = document.getElementById(`before-file-${i}`);
      const afterInput = document.getElementById(`after-file-${i}`);
      const beforeBox = document.getElementById(`before-upload-box-${i}`);
      const afterBox = document.getElementById(`after-upload-box-${i}`);
      const beforeRemove = document.getElementById(`before-remove-${i}`);
      const afterRemove = document.getElementById(`after-remove-${i}`);

      if (personEl) personEl.disabled = true;
      if (resultEl) resultEl.disabled = true;
      if (beforeInput) beforeInput.disabled = true;
      if (afterInput) afterInput.disabled = true;

      if (beforeBox) {
        beforeBox.style.pointerEvents = "none";
        beforeBox.style.cursor = "not-allowed";
      }
      if (afterBox) {
        afterBox.style.pointerEvents = "none";
        afterBox.style.cursor = "not-allowed";
      }
      if (beforeRemove) beforeRemove.style.display = "none";
      if (afterRemove) afterRemove.style.display = "none";
    });
  };

  window.currentReportCollectAndSubmit = async (dateStr) => {
    const form = new FormData();

    const items = data.map((row, i) => {
      const resultEl = document.getElementById(`result-${i}`);
      const personEl = document.getElementById(`person-${i}`);
      return {
        no: row.no,
        machineName: row.machineName,
        room: row.room,
        content: row.content,
        result: resultEl ? resultEl.value : row.result || "OK",
        personInCharge: personEl ? personEl.value : row.personInCharge || "",
        removeBefore: !!updatedData[i]?.__removeBefore,
        removeAfter: !!updatedData[i]?.__removeAfter,
      };
    });

    form.append("items", JSON.stringify(items));

    for (let i = 0; i < data.length; i++) {
      const no = items[i].no;
      const beforeInput = document.getElementById(`before-file-${i}`);
      const afterInput = document.getElementById(`after-file-${i}`);
      if (beforeInput?.files?.[0])
        form.append(`before-${no}`, beforeInput.files[0]);
      if (afterInput?.files?.[0])
        form.append(`after-${no}`, afterInput.files[0]);
    }

    const url = `${API_BASE}/filterAHU?date=${encodeURIComponent(dateStr)}`;
    const res = await fetch(url, { method: "POST", body: form });
    if (!res.ok) {
      let msg = "";
      try {
        msg = await res.text();
      } catch {}
      throw new Error(msg || `HTTP ${res.status}`);
    }
    return res.json().catch(() => ({}));
  };
}

/* ======================================================================
 * [EXPORT PNG] — chụp bảng thành PNG (giữ nguyên logic)
 * ----------------------------------------------------------------------
 * - window.exportFilterAHUToPNG({ fileName, titleText, dateStr })
 * - phụ thuộc html2canvas đã được nạp ở ngoài
 * - 🔧 EDIT HERE: chỉnh style header ảnh xuất (font, khoảng cách…)
 * ==================================================================== */
window.exportFilterAHUToPNG = async function exportFilterAHUToPNG({
  fileName = "BaoCao-filterAHU.png",
  titleText = "BÁO CÁO THAY THẾ OA FILTER AHU",
  dateStr = "",
} = {}) {
  const table = document.querySelector(".table-report");
  if (!table) return alert("Không tìm thấy bảng để xuất ảnh.");

  // --- clone bảng ---
  const tableWrap = table.parentElement || table;
  const cloneTableWrap = tableWrap.cloneNode(true);

  // kích thước và nền
  const wrapRect = tableWrap.getBoundingClientRect();
  cloneTableWrap.style.width = wrapRect.width + "px";
  cloneTableWrap.style.maxHeight = "unset";
  cloneTableWrap.style.overflow = "visible";
  cloneTableWrap.style.background = "#fff";

  // input -> div tĩnh
  cloneTableWrap
    .querySelectorAll('input[type="text"], input:not([type])')
    .forEach((inp) => {
      const holder = document.createElement("div");
      const cs = getComputedStyle(inp);
      holder.textContent = inp.value || inp.getAttribute("value") || "";
      holder.style.display = "block";
      holder.style.width = "100%";
      holder.style.boxSizing = "border-box";
      holder.style.padding = cs.padding || "6px 8px";
      holder.style.border = "none";
      holder.style.borderRadius = cs.borderRadius || "6px";
      holder.style.background = "transparent";
      holder.style.color = "#000";
      holder.style.lineHeight =
        cs.lineHeight === "normal" ? "1.35" : cs.lineHeight;
      holder.style.minHeight = cs.minHeight || "34px";
      holder.style.whiteSpace = "nowrap";
      holder.style.overflow = "hidden";
      holder.style.textOverflow = "ellipsis";
      inp.replaceWith(holder);
    });

  // viền đen & màu chữ đen
  (function forceMonochrome(root) {
    root.style.background = "#fff";
    root.querySelectorAll("*").forEach((el) => {
      el.style.color = "#000";
      el.style.setProperty("-webkit-text-fill-color", "#000");
      const cs = getComputedStyle(el);
      if (cs.filter && cs.filter !== "none") el.style.filter = "none";
      if (cs.mixBlendMode && cs.mixBlendMode !== "normal")
        el.style.mixBlendMode = "normal";
      if (cs.backdropFilter && cs.backdropFilter !== "none")
        el.style.backdropFilter = "none";
      if (!el.style.background || el.style.background === "transparent") {
        if (
          /(TABLE|THEAD|TBODY|TR|TH|TD|DIV|SECTION|ARTICLE|HEADER|FOOTER)/.test(
            el.tagName
          )
        ) {
          el.style.background = "#fff";
        }
      }
    });
    root.querySelectorAll("table, thead, tbody, tr, th, td").forEach((el) => {
      el.style.borderColor = "#000";
      const bw = getComputedStyle(el).borderWidth;
      if (!bw || bw === "0px") {
        el.style.borderWidth = "1px";
        el.style.borderStyle = "solid";
      }
    });
  })(cloneTableWrap);

  // --- tạo trang chứa HEADER + BẢNG ---
  const page = document.createElement("div");
  page.style.cssText = `
    position: relative; display: inline-block; background:#fff;
    border: 1px solid #e5e7eb; border-radius: 10px;
    box-shadow: 0 10px 30px rgba(0,0,0,.08);
    padding: 20px 20px 16px;
  `;

  const header = document.createElement("div");
  header.style.cssText = `
    display:flex; flex-direction:column; align-items:center; justify-content:center;
    margin-bottom:12px; width:100%; text-align:center; color:#000;
    padding-top:4px; line-height:1.25;
  `;
  const hTitle = document.createElement("div");
  hTitle.textContent = titleText;
  hTitle.style.cssText =
    "font-size:20px; font-weight:800; letter-spacing:.3px; color:#000;";
  header.appendChild(hTitle);

  if (dateStr) {
    const hDate = document.createElement("div");
    hDate.textContent = "Ngày: " + String(dateStr).replace(/-/g, "/");
    hDate.style.cssText = "margin-top:6px; font-weight:600; color:#000;";
    header.appendChild(hDate);
  }

  page.appendChild(header);
  page.appendChild(cloneTableWrap);

  // --- chụp offscreen ---
  const staging = document.createElement("div");
  staging.style.position = "fixed";
  staging.style.left = "-100000px";
  staging.style.top = "0";
  staging.style.background = "#fff";
  staging.appendChild(page);
  document.body.appendChild(staging);

  try {
    const canvas = await html2canvas(page, {
      backgroundColor: "#fff",
      scale: 2,
      useCORS: true,
      logging: false,
    });
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = fileName;
    a.click();
  } catch (err) {
    console.error("Export PNG error:", err);
    alert("Không thể xuất ảnh.");
  } finally {
    staging.remove();
  }
};

/* ======================================================================
 * [MAIN] — renderFilterReport(date)
 * ----------------------------------------------------------------------
 * - Trả về chuỗi HTML của bảng
 * - Sau khi HTML gắn vào DOM, setTimeout(0) để bind events & expose APIs
 * - Giữ nguyên hành vi cũ (enable/disable/submit/export)
 * ==================================================================== */
export async function renderFilterReport(date) {
  const yyyyMmDd = (date || "").trim(); // yyyy-MM-dd

  // 1) LOAD dữ liệu ngày đang chọn
  let data = await loadData(yyyyMmDd);
  if (!data.length) data = buildFallback();

  // 2) TẠO HTML
  const rowsHTML = buildRowsHTML(data);
  const html = buildTableHTML(rowsHTML);

  // 3) GẮN SỰ KIỆN SAU KHI DOM CÓ BẢNG
  setTimeout(() => {
    const updatedData = bindRowEvents(data);
    exposePublicAPIs(data, updatedData);
    // mặc định: khoá edit
    window.currentReportDisableEdit();
  }, 0);

  return html;
}
