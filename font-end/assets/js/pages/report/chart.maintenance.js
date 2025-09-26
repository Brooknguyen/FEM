import { fmt } from "./chart.js";

const today = new Date();
const year = today.getFullYear();

// Render HTML khung chứa biểu đồ
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

// Khởi tạo biểu đồ cột dữ liệu kế hoạch bảo trì
export async function initBarMaintenance() {
  const ctx = document.getElementById("mtBarChart")?.getContext("2d");
  if (!ctx) return;

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
  const values = new Array(12).fill(0); // Mỗi tháng khởi tạo 0 kế hoạch
  const currentYear = new Date().getFullYear();

  try {
    const res = await fetch("http://10.100.201.25:4000/api/records");
    const data = await res.json();

    data.forEach((item) => {
      if (item.year === currentYear && typeof item.month === "number") {
        const monthIndex = item.month - 1; // Chuyển tháng từ 1-12 thành 0-11
        if (monthIndex >= 0 && monthIndex < 12) {
          values[monthIndex]++;
        }
      }
    });
  } catch (err) {
    console.error("Lỗi khi tải dữ liệu kế hoạch:", err);
  }

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
      layout: { padding: 10 },
      scales: {
        y: {
          grid: { display: false },
          ticks: {
            callback: (v) => fmt(v),
            font: { size: 12 },
            color: "#FF6600",
          },
          beginAtZero: true,
        },
        x: {
          grid: { display: false },
          ticks: {
            font: { size: 12 },
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
          align: (ctx) => {
            return ctx.dataset.data[ctx.dataIndex] === 0 ? "end" : "start";
          },
          color: "#FF6600",
          font: {
            weight: "bold",
            size: 12,
          },
          formatter: (value) => {
            return value === 0 ? "" : value;
          },
          formatter: (value) => value,
          clamp: true,
          clip: false,
        },
      },
    },
  });
}
