// assets/js/pages/info/config.js
// Cấu hình chung cho toàn bộ các trang info

export const API_BASE = "http://10.100.201.25:4000/api/device";

// Mặc định hiển thị bảng
export const FREEZE_HEADER_ROWS = 2; // số hàng header cố định
export const FREEZE_FIRST_COL = false; // cố định cột đầu tiên hay không

// Khai báo các resource: route key, tiêu đề trang, sheet mặc định, endpoint GET latest và POST save
export const CRUD_INFO_RESOURCES = {
  air: {
    key: "air",
    title: "Danh mục thiết bị Utility — Air & N2 system",
    defaultSheet: "Air & N2 system",
    latestByName: (sheet) =>
      `${API_BASE}/airn2/${encodeURIComponent(sheet)}/latest`, // sửa 'air' thành 'airn2'
    latestAny: () => `${API_BASE}/airn2/latest`,
    postPath: () => `${API_BASE}/airn2`,
  },
  compressor: {
    key: "compressor",
    title: "Danh mục thiết bị Utility — High Pressure Air Compressor",
    defaultSheet: "High Pressure Air Compressor",
    latestByName: (sheet) =>
      `${API_BASE}/highpressure/${encodeURIComponent(sheet)}/latest`, // sửa 'compressor' thành 'highpressure'
    latestAny: () => `${API_BASE}/highpressure/latest`,
    postPath: () => `${API_BASE}/highpressure`,
  },
  ahu: {
    key: "ahu",
    title: "Danh mục thiết bị Utility — AHU",
    defaultSheet: "AHU",
    latestByName: (sheet) =>
      `${API_BASE}/ahu/${encodeURIComponent(sheet)}/latest`,
    latestAny: () => `${API_BASE}/ahu/latest`,
    postPath: () => `${API_BASE}/ahu`,
  },
  chiller: {
    key: "chiller",
    title: "Danh mục thiết bị Utility — Water Chiller",
    defaultSheet: "Water Chiller",
    latestByName: (sheet) =>
      `${API_BASE}/waterchiller/${encodeURIComponent(sheet)}/latest`, // sửa 'chiller' thành 'waterchiller'
    latestAny: () => `${API_BASE}/waterchiller/latest`,
    postPath: () => `${API_BASE}/waterchiller`,
  },
  exhaust: {
    key: "exhaust",
    title: "Danh mục thiết bị Utility — Exhaust Fan",
    defaultSheet: "Exhaust Fan",
    latestByName: (sheet) =>
      `${API_BASE}/exhaustfan/${encodeURIComponent(sheet)}/latest`,
    latestAny: () => `${API_BASE}/exhaustfan/latest`,
    postPath: () => `${API_BASE}/exhaustfan`,
  },
  ac: {
    key: "ac",
    title: "Danh mục thiết bị Utility — ACU + Aircon",
    defaultSheet: "ACU + Aircon",
    latestByName: (sheet) =>
      `${API_BASE}/acu/${encodeURIComponent(sheet)}/latest`, // sửa 'acs' thành 'acu'
    latestAny: () => `${API_BASE}/acu/latest`,
    postPath: () => `${API_BASE}/acu`,
  },
  tank: {
    key: "tank",
    title: "Danh mục thiết bị Utility — Pressure Tank",
    defaultSheet: "Pressure tank",
    latestByName: (sheet) =>
      `${API_BASE}/tank/${encodeURIComponent(sheet)}/latest`, // sửa 'tanks' thành 'tank'
    latestAny: () => `${API_BASE}/tank/latest`,
    postPath: () => `${API_BASE}/tank`,
  },
};

// Dùng để dựng thanh tabs (key + label giống file tabs cũ)
export const CRUD_INFO_TABS = [
  { key: "air", label: "Air&N2 system" },
  { key: "compressor", label: "High Pressure Air Compressor" },
  { key: "ahu", label: "AHU" },
  { key: "chiller", label: "Water Chiller" },
  { key: "tank", label: "Pressure Tank" },
  { key: "exhaust", label: "Exhaust Fan" },
  { key: "ac", label: "ACU + Aircon" },
];

export const CRUD_INFO_KEYS = new Set(CRUD_INFO_TABS.map((t) => t.key));
