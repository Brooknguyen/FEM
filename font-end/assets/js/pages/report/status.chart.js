// report/status.chart.js
// Yêu cầu: loadChartLibs() đã nạp Chart.js + chartjs-plugin-datalabels (từ report/chart.js)
import { loadChartLibs, fmt } from "./chart.js";

const API_BASE = "http://10.100.201.25:4000/api/records";

let _pie = null; // giữ instance hiện tại
let _pieCanvasRef = null; // tham chiếu canvas đang dùng (để so sánh khi nav)

export function renderStatusDonutRow() {
  return `
    <section class="card p-4" id="status-pie-section" style="margin-top:10px">
      <h3 class="text-lg font-bold" style="text-align:center;color:var(--fg)">
        Trạng thái kế hoạch (tháng đang chọn)
      </h3>

      <div style="display:flex;gap:12px;align-items:stretch;margin-top:8px">
        <!-- Trái: tóm tắt -->
        <div style="flex:0 0 42%;
                    background: rgba(59,130,246,.08);
                    border: 1px solid rgba(255,255,255,.08);
                    border-radius:12px;
                    padding:12px;">
          <div style="margin:4px 0;color:var(--fg)">
            <b>Tổng số kế hoạch:</b>
            <span id="spTotal" style="font-weight:700;">-</span>
          </div>
          <div style="margin:6px 0;color:var(--fg)">
            <b>Đúng hạn:</b>
            <span id="spOnTime"
                  style="display:inline-block;background:#e7f8ee;color:#058f3e;
                         padding:2px 8px;border-radius:999px;font-weight:700;">-</span>
          </div>
          <div style="margin:6px 0;color:var(--fg)">
            <b>Trễ hẹn:</b>
            <span id="spLate"
                  style="display:inline-block;background:#ffe6e3;color:#c92408;
                         padding:2px 8px;border-radius:999px;font-weight:700;">-</span>
          </div>
          <div style="margin:6px 0;color:var(--fg)">
            <b>Chưa thực hiện:</b>
            <span id="spTodo"
                  style="display:inline-block;background:#e5e7eb;color:#111827;
                         padding:2px 8px;border-radius:999px;font-weight:700;">-</span>
          </div>
        </div>

        <!-- Phải: PIE -->
        <div style="flex:1;min-width:280px;">
          <div style="height:260px;position:relative">
            <canvas id="spPie" style="width:100% !important; height:100% !important; display:block"></canvas>
          </div>
        </div>
      </div>
    </section>
  `;
}

/* ---------------- helpers ---------------- */

// Đợi phần tử xuất hiện trong DOM (hữu ích khi SPA render async)
async function waitForElement(sel, tries = 40, interval = 50) {
  for (let i = 0; i < tries; i++) {
    const el = document.querySelector(sel);
    if (el) return el;
    await new Promise((r) => setTimeout(r, interval));
  }
  return null;
}

function dayStart(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

// Lấy YYYY-MM từ 2 select #mt-year, #mt-month (nếu thiếu thì fallback tháng hiện tại)
function getSelectedMonthKey() {
  const yEl = document.getElementById("mt-year");
  const mEl = document.getElementById("mt-month");
  const now = new Date();
  const year = (yEl?.value && Number(yEl.value)) || now.getUTCFullYear();
  const month = (mEl?.value && Number(mEl.value)) || now.getUTCMonth() + 1;
  return `${year}-${String(month).padStart(2, "0")}`;
}

async function fetchRecordsByMonth(monthKey) {
  const url = `${API_BASE}?month=${encodeURIComponent(monthKey)}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `GET ${url} -> ${res.status} ${res.statusText} :: ${text.slice(0, 150)}`
    );
  }
  return res.json();
}

// Phân loại:
// - Đúng hạn: có actualDate và actualDate ≤ plannedDate
// - Trễ hẹn: (có actualDate và actualDate > plannedDate) hoặc (không có actualDate và plannedDate < hôm nay)
// - Chưa thực hiện: không có actualDate và plannedDate ≥ hôm nay
function summarize(rows) {
  const today = dayStart(new Date());
  let onTime = 0,
    late = 0,
    todo = 0;

  for (const r of rows || []) {
    const pd = r?.plannedDate ? dayStart(new Date(r.plannedDate)) : null;
    const ad = r?.actualDate ? dayStart(new Date(r.actualDate)) : null;

    if (ad) {
      if (pd && ad.getTime() <= pd.getTime()) onTime++;
      else late++;
    } else {
      if (pd && pd.getTime() < today.getTime()) late++;
      else todo++;
    }
  }

  const total = onTime + late + todo;
  return { onTime, late, todo, total };
}

function renderSummary({ total, onTime, late, todo }) {
  const set = (id, v) => {
    const el = document.getElementById(id);
    if (el) el.textContent = fmt(v);
  };
  set("spTotal", total);
  set("spOnTime", onTime);
  set("spLate", late);
  set("spTodo", todo);
}

function buildOrUpdatePie({ onTime, late, todo }) {
  const canvas = document.getElementById("spPie");
  if (!canvas) return;

  // 🔧 Quan trọng: nếu canvas mới khác canvas cũ → destroy chart cũ
  if (_pie && _pieCanvasRef && _pieCanvasRef !== canvas) {
    try {
      _pie.destroy();
    } catch {}
    _pie = null;
  }
  _pieCanvasRef = canvas;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const labels = ["Đúng hạn", "Trễ hẹn", "Chưa thực hiện"];
  const data = [onTime, late, todo];
  const colors = ["#2bbb6f", "#e3522e", "#94a3b8"]; // xanh / đỏ / xám

  const datalabelsAsValue = {
    formatter: (v) => (Number(v) > 0 ? fmt(v) : ""),
    color: "black",
    borderRadius: 4,
    padding: 4,
    font: { weight: "600", size: 11 },
    anchor: "center",
    align: "center",
    clamp: true,
  };

  const cfg = {
    type: "pie",
    data: {
      labels,
      datasets: [{ data, backgroundColor: colors, borderColor: "transparent" }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            usePointStyle: true,
            boxWidth: 8,
            boxHeight: 8,
            font: { size: 12 },
          },
        },
        tooltip: { callbacks: { label: (c) => ` ${c.label}: ${fmt(c.raw)}` } },
        datalabels: datalabelsAsValue,
      },
    },
  };

  if (_pie) {
    _pie.data.labels = labels;
    _pie.data.datasets[0].data = data;
    _pie.update();
  } else {
    _pie = new window.Chart(ctx, cfg);
  }
}

/* ---------------- init ---------------- */

export async function initStatusDonutRow() {
  await loadChartLibs();

  // Đợi chắc chắn cả canvas & 2 select có trong DOM trước khi render
  await waitForElement("#spPie");
  await waitForElement("#mt-month");
  await waitForElement("#mt-year");

  const monthSelect = document.getElementById("mt-month");
  const yearSelect = document.getElementById("mt-year");

  // Hàm refresh dùng lại khi đổi tháng/năm HOẶC khi quay lại trang
  const refresh = async () => {
    const monthKey = getSelectedMonthKey();
    try {
      const rows = await fetchRecordsByMonth(monthKey);
      const s = summarize(rows);
      renderSummary(s);
      buildOrUpdatePie(s);
    } catch (e) {
      console.error(e);
      const s = { onTime: 0, late: 0, todo: 0, total: 0 };
      renderSummary(s);
      buildOrUpdatePie(s);
    }
  };

  // Lần đầu
  await refresh();

  // Lắng nghe thay đổi (mỗi lần mount trang sẽ lắng nghe trên DOM mới)
  monthSelect?.addEventListener("change", refresh, { passive: true });
  yearSelect?.addEventListener("change", refresh, { passive: true });

  // 🔧 Phòng trường hợp SPA render thay nội dung section sau init:
  // mỗi lần quay lại route, nếu canvas mới mount, destroy chart cũ và render lại
  const mo = new MutationObserver(async () => {
    const canvas = document.getElementById("spPie");
    if (canvas && _pieCanvasRef !== canvas) {
      if (_pie) {
        try {
          _pie.destroy();
        } catch {}
        _pie = null;
      }
      _pieCanvasRef = null;
      await refresh();
    }
  });
  mo.observe(document.getElementById("status-pie-section") || document.body, {
    childList: true,
    subtree: true,
  });
}
