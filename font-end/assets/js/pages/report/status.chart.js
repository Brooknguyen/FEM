// report/status.chart.js
import { fmt } from "./chart.js";

const API_BASE = "http://10.100.201.25:4000/api/records";

/* ============ VIEW ============ */
export function renderStatusDonutRow() {
  return `
    <section class="card p-4" id="status-pie-section" style="margin-top:20px; border: none; background-color: transparent">
      
      <!-- Hàng thẻ thống kê -->
      <div class="status-cards" style="display:flex;gap:12px;margin-bottom:14px;flex-wrap:wrap">
        
        <!-- Tổng số kế hoạch -->
        <div class="stat-card" style="
          flex: 1 1 150px;
          background: #d1d5db;
          color: #111827;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 12px;
          border-radius: 8px;
          gap: 6px;
          text-align: center;
        ">
          <div style="font-size: 22px;">📄</div>
          <div id="spTotalNum" style="font-size: 26px; font-weight: bold;">-</div>
          <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Tổng số kế hoạch</div>
        </div>

        <!-- Hoàn thành -->
        <div class="stat-card" style="
          flex: 1 1 150px;
          background: #22c55e;
          color: #052e16;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 12px;
          border-radius: 8px;
          gap: 6px;
          text-align: center;
        ">
          <div style="font-size: 22px;">✅</div>
          <div id="spDoneNum" style="font-size: 26px; font-weight: bold;">-</div>
          <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Hoàn thành</div>
        </div>

        <!-- Trễ hạn -->
        <div class="stat-card" style="
          flex: 1 1 150px;
          background: #ef4444;
          color: #fff;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 12px;
          border-radius: 8px;
          gap: 6px;
          text-align: center;

        ">
          <div style="font-size: 22px;">⚠️</div>
          <div id="spLateNum" style="font-size: 26px; font-weight: bold;">-</div>
          <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Trễ hạn</div>
        </div>

      </div>
    </section>
  `;
}

/* ============ HELPERS ============ */

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
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status} ${res.statusText}`);
  return res.json();
}

function summarize(rows) {
  const today = dayStart(new Date());
  let done = 0,
    late = 0,
    todo = 0;

  for (const r of rows || []) {
    const pd = r?.plannedDate ? dayStart(new Date(r.plannedDate)) : null;
    const ad = r?.actualDate ? dayStart(new Date(r.actualDate)) : null;

    if (ad) {
      done++;
      if (pd && ad.getTime() > pd.getTime()) late++; // hoàn thành trễ
    } else {
      if (pd && pd.getTime() < today.getTime()) late++; // quá hạn
      else todo++;
    }
  }
  return { total: rows?.length || 0, done, late, todo };
}

function renderCards({ total, done, late }) {
  const set = (id, v) => {
    const el = document.getElementById(id);
    if (el) el.textContent = fmt(v);
  };
  set("spTotalNum", total);
  set("spDoneNum", done);
  set("spLateNum", late);
}

/* ============ INIT ============ */
export async function initStatusDonutRow() {
  await waitForElement("#mt-month");
  await waitForElement("#mt-year");

  const monthSelect = document.getElementById("mt-month");
  const yearSelect = document.getElementById("mt-year");

  const refresh = async () => {
    const monthKey = getSelectedMonthKey();
    try {
      const rows = await fetchRecordsByMonth(monthKey);
      const s = summarize(rows);
      renderCards(s);
    } catch (e) {
      console.error(e);
      const s = { total: 0, done: 0, late: 0, todo: 0 };
      renderCards(s);
    }
  };

  await refresh();

  monthSelect?.addEventListener("change", refresh, { passive: true });
  yearSelect?.addEventListener("change", refresh, { passive: true });
}
