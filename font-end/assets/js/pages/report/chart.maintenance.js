//chart.maintenance.js
import { fmt } from "./chart.js";

const today = new Date();
const year = today.getFullYear();

// Render khung HTML cho biểu đồ 12 tháng
export function renderBarMaintenance() {
  return `
    <div class="chart-box" style="width: 100%; min-width:800px; text-align:center;">
      <h3 class="chart-title" style="color:var(--fg)">Kế hoạch bảo trì năm ${year}</h3>
      <div style="position:relative; height:280px; width:100%;">
        <canvas id="mtBarChart"></canvas>
      </div>
    </div>
  `;
}

// Khởi tạo biểu đồ cột 12 tháng
export async function initBarMaintenance() {
  const ctx = document.getElementById("mtBarChart")?.getContext("2d");
  if (!ctx) return;

  // Dữ liệu mẫu: số lượng kế hoạch bảo trì mỗi tháng
  const labels = [
    "T1",
    "T2",
    "T3",
    "T4",
    "T5",
    "T6",
    "T7",
    "T8",
    "T9",
    "T10",
    "T11",
    "T12",
  ];
  const values = [5, 8, 7, 10, 6, 4, 9, 12, 7, 11, 5, 8];

  new window.Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Kế hoạch",
          data: values,
          backgroundColor: "#1f3ea4ff",
          maxBarThickness: 30,
          color: "black",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: 10,
      },
      scales: {
        y: {
          grid: {
            display: false,
          },
          ticks: {
            callback: (v) => fmt(v),
            font: {
              size: 12,
            },
            color: "#FF6600",
          },
          beginAtZero: true,
        },
        x: {
          grid: {
            display: false,
          },
          ticks: {
            font: {
              size: 12,
            },
            color: "#FF6600",
          },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.raw} kế hoạch`,
          },
        },
        datalabels: {
          anchor: "end",
          align: "start",
          color: "#FF6600",
          font: {
            weight: "bold",
            size: 12,
          },
        },
      },
    },
  });
}
