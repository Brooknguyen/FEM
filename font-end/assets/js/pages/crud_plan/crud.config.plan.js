// assets/js/pages/info/configplan.js
// Cấu hình cho PLAN (không liên quan INFO)

export const API_BASE = "http://10.100.201.25:4000/api/maintenance";

// Mặc định hiển thị bảng
export const FREEZE_HEADER_ROWS = 4;
export const FREEZE_FIRST_COL = false;

// Khai báo resource cho PLAN
export const CRUD_PLAN_RESOURCES = {
  electric: {
    key: "electric",
    title: "Kế hoạch bảo trì thiết bị Utility — Electric",
    defaultSheet: "Electric",
    latestByName: (sheet) =>
      `${API_BASE}/electric/${encodeURIComponent(sheet)}/latest`,
    latestAny: () => `${API_BASE}/electric/latest`,
    postPath: () => `${API_BASE}/electric`,
  },
  machine: {
    key: "machine",
    title: "Kế hoạch bảo trì thiết bị Utility — Machine",
    defaultSheet: "Machine",
    latestByName: (sheet) =>
      `${API_BASE}/machine/${encodeURIComponent(sheet)}/latest`,
    latestAny: () => `${API_BASE}/machine/latest`,
    postPath: () => `${API_BASE}/machine`,
  },
};

// Tabs cho PLAN
export const CRUD_PLAN_TABS = [
  { key: "electric", label: "Electric" },
  { key: "machine", label: "Machine" },
];

// Tập key hợp lệ cho PLAN
export const CRUD_PLAN_KEYS = new Set(CRUD_PLAN_TABS.map((t) => t.key));
