//filterAHU.js
// === API config ===
const API_BASE = "http://10.100.201.25:4000/api/records";
const API_ORIGIN = new URL(API_BASE).origin; // -> "http://10.100.201.25:4000"

// Chuẩn hoá URL: nếu BE trả "/uploads/..." thì ghép origin của API
const normalizeUrl = (url) => {
  if (!url) return "";
  if (/^https?:\/\//i.test(url) || url.startsWith("data:")) return url;
  if (url.startsWith("/uploads/")) return `${API_ORIGIN}${url}`;
  return url;
};

export async function renderFilterReport(date) {
  const yyyyMmDd = (date || "").trim(); // yyyy-MM-dd

  // 1) LOAD dữ liệu ngày đang chọn
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

  // Nếu ngày đó chưa có dữ liệu -> dữ liệu mặc định
  if (!data.length) {
    data = [
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

  const rows = data
    .map(
      (item, index) => `
    <tr>
      <td>${item.no}</td>
      <td>${item.machineName}</td>
      <td>${item.room}</td>
      <td>${item.content}</td>

      <td>
        <select id="result-${index}" disabled style="padding:6px 8px; border:none; border-radius:6px; background-color: transparent; color: var(--fg);">
          <option value="OK" style="background-color:green" ${
            item.result === "OK" ? "selected" : ""
          }>OK</option>
          <option value="NG" style="background-color:red" ${
            item.result === "NG" ? "selected" : ""
          }>NG</option>
        </select>
      </td>

      <td>
        <input id="person-${index}" type="text" value="${
        item.personInCharge || ""
      }"
               disabled style="padding:6px 8px; border:none; width:180px; background-color: transparent; color: var(--fg)"/>
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

  const html = `
    <div style="overflow-x:auto; max-height: 750px; overflow-y:auto;">
      <table class="table-report" style="width:100%; border-collapse: collapse; text-align:left">
        <thead style="position: sticky; top: 0; z-index: 10; background-color: #fff;">
          <tr>
            <th style="padding:8px; border:1px solid #ccc">STT</th>
            <th style="padding:8px; border:1px solid #ccc">Tên máy</th>
            <th style="padding:8px; border:1px solid #ccc">Tên phòng</th>
            <th style="padding:8px; border:1px solid #ccc">Nội dung bảo dưỡng</th>
            <th style="padding:8px; border:1px solid #ccc">Kết quả</th>
            <th style="padding:8px; border:1px solid #ccc">Người thực hiện</th>
            <th style="padding:8px; border:1px solid #ccc">Hình ảnh trước</th>
            <th style="padding:8px; border:1px solid #ccc">Hình ảnh sau</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;

  // ===== Helpers: hiển thị ảnh bằng <img> =====
  const ensureImg = (box) => {
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
  };

  const showImage = (box, removeBtn, url) => {
    if (!box || !removeBtn || !url) return;
    const img = ensureImg(box);
    if (!img) return;
    img.src = normalizeUrl(url);
    const span = box.querySelector("span");
    if (span) span.style.display = "none";
    removeBtn.style.display = "block";
  };

  const clearImage = (box, removeBtn) => {
    if (!box || !removeBtn) return;
    const img = box.querySelector("img.preview");
    if (img) img.remove();
    const span = box.querySelector("span");
    if (span) span.style.display = "block";
    removeBtn.style.display = "none";
  };

  // 2) GẮN SỰ KIỆN + HIỂN THỊ ẢNH CÓ SẴN
  setTimeout(() => {
    const updatedData = [...data];

    data.forEach((item, index) => {
      const beforeInput = document.getElementById(`before-file-${index}`);
      const beforeBox = document.getElementById(`before-upload-box-${index}`);
      const beforeRemove = document.getElementById(`before-remove-${index}`);

      const afterInput = document.getElementById(`after-file-${index}`);
      const afterBox = document.getElementById(`after-upload-box-${index}`);
      const afterRemove = document.getElementById(`after-remove-${index}`);

      // Hiển thị ảnh từ server (nếu có)
      if (item.pictureBefore)
        showImage(beforeBox, beforeRemove, item.pictureBefore);
      if (item.pictureAfter)
        showImage(afterBox, afterRemove, item.pictureAfter);

      // Ẩn nút xóa mặc định khi chưa bật edit mode
      if (beforeRemove) beforeRemove.style.display = "none";
      if (afterRemove) afterRemove.style.display = "none";

      // Click box => trigger input (khi đã bật edit mode)
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

      // Preview khi chọn file
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

      // Xoá ảnh
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

    // ===== BẬT/TẮT EDIT MODE =====
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

    // ✅ THU THẬP & GỬI DỮ LIỆU (CREATE/UPDATE theo ngày)
    window.currentReportCollectAndSubmit = async (dateStr) => {
      const form = new FormData();

      // Thu thập các trường text từ DOM (đảm bảo lấy đúng giá trị khi user đã chỉnh)
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

      // Gắn file nếu có (đặt tên đúng chuẩn mà backend đang đọc: before-<no>, after-<no>)
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

    // Tắt edit mode mặc định
    window.currentReportDisableEdit();
  }, 0);

  return html;
}
