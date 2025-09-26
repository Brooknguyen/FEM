// report/chart.js
const API = "http://10.100.201.25:4000/api/device/summary/latest";
const HEADER_SEARCH_ROWS = 3;

// ===== Helpers công khai =====
export const fmt = (n) => (Number(n) || 0).toLocaleString();
export const sum = (arr) => arr.reduce((a, b) => a + (Number(b) || 0), 0);
export const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

// Bảng màu mặc định
export const PALETTE = [
  "#4F81BD",
  "#C0504D",
  "#9BBB59",
  "#8064A2",
  "#4BACC6",
  "#F79646",
  "#92A9CF",
];

// Nạp Chart.js + Datalabels + plugin “centerText” (chỉ 1 lần)
let _libsLoaded = false;
export async function loadChartLibs() {
  if (_libsLoaded) return;

  const load = (src) =>
    new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = res;
      s.onerror = () => rej(new Error(`Fail ${src}`));
      document.head.appendChild(s);
    });

  if (!window.Chart) {
    await load(
      "https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js"
    );
  }
  if (!window.ChartDataLabels) {
    await load(
      "https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.2.0/dist/chartjs-plugin-datalabels.min.js"
    );
  }

  // Plugin vẽ chữ giữa donut
  const centerTextPlugin = {
    id: "centerText",
    afterDatasetsDraw(chart, _args, opts) {
      const first = chart.getDatasetMeta(0)?.data?.[0];
      if (!first) return;
      const { x, y } = first.getProps(["x", "y"], true);
      const ctx = chart.ctx;
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      let cy = y - ((opts.lines?.length || 1) - 1) * 10;
      for (const line of opts.lines || []) {
        ctx.font = line.font || "700 18px system-ui, sans-serif";
        ctx.fillStyle = line.color || "#1f2937";
        ctx.fillText(line.text, x, cy);
        cy += line.lineHeight || 20;
      }
      ctx.restore();
    },
  };

  window.Chart.register(window.ChartDataLabels, centerTextPlugin);
  _libsLoaded = true;
}

// ====== API dựng sẵn vẽ donut ======
export function drawDonut({
  canvasId,
  labels = [],
  values = [],
  datasetLabel = "",
  centerLines = [],
  palette = PALETTE,
}) {
  const ctx = document.getElementById(canvasId)?.getContext("2d");
  if (!ctx) return null;

  const datalabelsAsValue = {
    formatter: (v) => (Number(v) > 0 ? fmt(v) : ""),
    color: "white",
    backgroundColor: "rgba(0,0,0,.45)",
    borderRadius: 4,
    padding: 4,
    font: { weight: "600", size: 11 },
    anchor: "center",
    align: "center",
    clamp: true,
  };

  const config = {
    type: "doughnut",
    data: {
      labels,
      datasets: [
        {
          label: datasetLabel,
          data: values,
          backgroundColor: palette.slice(0, labels.length),
          borderColor: "transparent",
          borderWidth: 2,
        },
      ],
    },
    options: {
      cutout: "70%",
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            usePointStyle: true,
            boxWidth: 4,
            boxHeight: 4,
            font: { size: 11 },
          },
        },
        tooltip: {
          callbacks: { label: (ctx) => `${ctx.label}: ${fmt(ctx.raw)}` },
        },
        datalabels: datalabelsAsValue,
        centerText: { lines: centerLines },
      },
    },
  };

  return new window.Chart(ctx, config);
}

// ===== Nội bộ xử lý bảng dữ liệu (preload / getValue) =====
const norm = (s) =>
  String(s ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchJSONWithRetry(url, tries = 3) {
  let t = 0;
  while (true) {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (res.status === 429 && t < tries) {
      const ra = res.headers.get("retry-after");
      const wait = ra ? Number(ra) * 1000 : 1200 * Math.pow(2, t);
      await sleep(wait);
      t++;
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    return res.json();
  }
}

function findColIdx(rows, headerRegex) {
  const limit = Math.min(HEADER_SEARCH_ROWS, rows.length);
  for (let r = 0; r < limit; r++) {
    const row = rows[r] || [];
    for (let c = 0; c < row.length; c++) {
      if (headerRegex.test(norm(row[c]))) return { col: c, headerRow: r };
    }
  }
  return null;
}

const METRIC_HEADER_REGEXES = {
  qty: [/^q\s*['’`´]?\s*ty$/, /^(qty)$/],
  kw: [/^kw$/],
  capa: [/^(capa|capacity)$/],
};

function mapMetricKey(input) {
  const s = norm(input);
  if (/^(q|qty|q'?ty|so luong|soluong)$/.test(s)) return "qty";
  if (/^(kw|power|cong suat dien)$/.test(s)) return "kw";
  if (/^(capa|capacity|cong suat|kcal|nm3\/h|m3\/h)$/.test(s)) return "capa";
  return s;
}

function extractNumeric(s) {
  const m = String(s ?? "").match(/[\d.,]+/);
  if (!m) return null;
  const normalized = m[0].replace(/\./g, "").replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

// function extractNumeric(s) {
//   if (!s) return null;
//   const str = String(s).trim();

//   // Trường hợp có cả dấu chấm và phẩy
//   if (str.includes(".") && str.includes(",")) {
//     const normalized = str.replace(/\./g, "").replace(",",".");
//     const n = Number(normalized);
//     return Number.isFinite(n) ? n : null;
//   }

//   // Trường hợp chỉ có dấu phẩy (VN style): "1,234" => 1234
//   if (str.includes(",") && !str.includes(".")){
//     const normalized = str.replace(/,/g, "");
//     const n = Number(normalized);
//     return Number.isFinite(n) ? n : null;
//   }

//   // Trường hợp chỉ có dấu chấm (US/UK style): "1.234" => 1.234
//   if (str.includes(".") && !str.includes(",")){
//     const n = Number(str);
//     return Number.isFinite(n) ? n : null;
//   }

//   // Trường hợp chỉ là số nguyên: "1234"
//   const n = Number(str);
//   return Number.isFinite(n) ? n : null;
// }

// ---------- state ----------
let _loaded = false;
let _out = [];
let _nameColInfo = null;
let _metricCols = { qty: null, kw: null, capa: null };

export async function preload() {
  if (_loaded) return;
  const payload = await fetchJSONWithRetry(API);
  const rows = Array.isArray(payload.rows) ? payload.rows : [];
  if (!rows.length) throw new Error("Không có dữ liệu rows.");

  _nameColInfo = findColIdx(rows, /(ut\s*machine\s*system)/) ||
    findColIdx(rows, /(system|ten|name)/) || { col: 0, headerRow: 0 };

  _metricCols = { qty: null, kw: null, capa: null };
  for (const [key, regexList] of Object.entries(METRIC_HEADER_REGEXES)) {
    for (const re of regexList) {
      const found = findColIdx(rows, re);
      if (found) {
        _metricCols[key] = found;
        break;
      }
    }
  }

  const headerMaxRow = Math.max(
    _nameColInfo.headerRow,
    ...Object.values(_metricCols)
      .filter(Boolean)
      .map((x) => x.headerRow)
  );
  const startRow = headerMaxRow + 1;

  _out = [];
  for (let r = startRow; r < rows.length; r++) {
    const row = rows[r] || [];
    const nameCell = row[_nameColInfo.col];
    if (!String(nameCell ?? "").trim()) continue;
    const rec = { name: String(nameCell ?? "").trim() };
    for (const key of ["qty", "kw", "capa"]) {
      const info = _metricCols[key];
      if (info) {
        const raw = String(row[info.col] ?? "");
        rec[key] = extractNumeric(raw) ?? raw;
      }
    }
    _out.push(rec);
  }
  _loaded = true;
}

export function getValue(name, metric) {
  const needle = norm(name);
  const key = mapMetricKey(metric);
  const row = _out.find((x) => norm(x.name).includes(needle));
  return row ? row[key] ?? null : null;
}

// tiện debug
export function readdata(name, metric) {
  const needle = norm(name);
  const key = mapMetricKey(metric);
  const row = _out.find((x) => norm(x.name).includes(needle));
  return row ? { name: row.name, metric: key, value: row[key] } : null;
}
