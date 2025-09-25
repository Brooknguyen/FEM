// pages/report.js
import {
  preload,
  getValue,
  fmt,
  sum,
  num,
  loadChartLibs,
  drawDonut,
  PALETTE,
} from "../report/chart.js";
import { renderMaintenance, initMaintenance } from "../report/maintenance.js";
import {
  renderBarMaintenance,
  initBarMaintenance,
} from "../report/chart.maintenance.js";
import {
  renderStatusDonutRow,
  initStatusDonutRow,
} from "../report/status.chart.js";
/** Render phần biểu đồ (2 donut trái + bar 12 tháng bên phải) */
export async function renderReport() {
  const labels = [
    "AHU",
    "Air",
    "Nito generator",
    "ChillerAHU",
    "Water",
    "Exhaust",
    "ACU",
  ];
  const qtyValues = labels.map((k) => num(getValue(k, "qty")));
  const kwValues = labels.map((k) => num(getValue(k, "kw")));

  return `
  <section class="card p-4">
    <div class="report-charts" style="display:flex; gap:12px; align-items:flex-start;">
      <!-- Donut: Số lượng -->
      <div class="chart-box" style="flex:0 0 20%; text-align:center;">
        <h3 class="chart-title" style="color:var(--fg)">Số lượng thiết bị</h3>
        <canvas id="qtyChart"></canvas>
      </div>

      <!-- Donut: Công suất -->
      <div class="chart-box" style="flex:0 0 20%; text-align:center;">
        <h3 class="chart-title" style="color:var(--fg)">Công suất (kW)</h3>
        <canvas id="kwChart"></canvas>
      </div>

      <!-- Bar 12 tháng -->
      <div class="charts-extra" style="flex:1; min-width: 600px; margin:10px;">
        <div class="card p-4" style="background:transparent; border:none; color:var(--fg); min-height:220px;">
          ${renderBarMaintenance()}
        </div>
      </div>

    </div>

    <script id="report-data" type="application/json">
      ${JSON.stringify({ labels, qtyValues, kwValues })}
    </script>
  </section>`;
}

/** Trang Report (gộp: biểu đồ + bảng bảo trì) */
export async function renderReportPage() {
  await preload(); // chuẩn bị dữ liệu donut
  const charts = await renderReport();
  const maintenance = await renderMaintenance();
  const statusChart = renderStatusDonutRow();
  return `${charts}\n${maintenance}\n${statusChart}`;
}

/** Khởi tạo sau khi đã gắn HTML vào DOM */
export async function initReportPage() {
  await loadChartLibs();
  await initReportCharts();
  await initBarMaintenance();
  await initMaintenance();
  await initStatusDonutRow(); // donut phải (đồng bộ theo tháng)
}

/** Vẽ 2 donut bằng API chung từ chart.js */
export async function initReportCharts() {
  const dataEl = document.getElementById("report-data");
  if (!dataEl) return;

  let { labels = [], qtyValues = [], kwValues = [] } = {};
  try {
    ({ labels, qtyValues, kwValues } = JSON.parse(dataEl.textContent || "{}"));
  } catch {}

  // Donut 1: Tổng thiết bị
  const totalQty = sum(qtyValues);
  drawDonut({
    canvasId: "qtyChart",
    labels,
    values: qtyValues,
    datasetLabel: "Số lượng",
    palette: PALETTE,
    centerLines: [
      {
        text: fmt(totalQty),
        font: "700 22px system-ui, sans-serif",
        color: "#FF6600",
        lineHeight: 26,
      },
      {
        text: "Tổng thiết bị",
        font: "500 12px system-ui, sans-serif",
        color: "#FF6600",
        lineHeight: 16,
      },
    ],
  });

  // Donut 2: Tổng kW
  const totalKw = sum(kwValues);
  drawDonut({
    canvasId: "kwChart",
    labels,
    values: kwValues,
    datasetLabel: "Công suất (kW)",
    palette: PALETTE,
    centerLines: [
      {
        text: fmt(totalKw),
        font: "700 22px system-ui, sans-serif",
        color: "#FF6600",
        lineHeight: 26,
      },
      {
        text: "Tổng kW",
        font: "500 12px system-ui, sans-serif",
        color: "#FF6600",
        lineHeight: 16,
      },
    ],
  });
}
