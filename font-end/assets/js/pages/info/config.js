// assets/js/pages/info/config.js
// Cấu hình chung cho toàn bộ các trang info

export const API_BASE = "http://10.100.201.25:4000/api";

// Mặc định hiển thị bảng
export const FREEZE_HEADER_ROWS = 2;     // số hàng header cố định
export const FREEZE_FIRST_COL  = false;  // cố định cột đầu tiên hay không

// Khai báo các resource: route key, tiêu đề trang, sheet mặc định, endpoint GET latest và POST save
export const INFO_RESOURCES = {
  air: {
    key: "air",
    title: "Danh mục thiết bị Utility — Air & N2 system",
    defaultSheet: "Air & N2 system",
    latestByName: (sheet) => `${API_BASE}/air/${encodeURIComponent(sheet)}/latest`,
    latestAny:     ()     => `${API_BASE}/air/latest`,
    postPath:      ()     => `${API_BASE}/air`,
  },
  compressor: {
    key: "compressor",
    title: "Danh mục thiết bị Utility — High Pressure Air Compressor",
    defaultSheet: "High Pressure Air Compressor",
    latestByName: (sheet) => `${API_BASE}/compressor/${encodeURIComponent(sheet)}/latest`,
    latestAny:     ()     => `${API_BASE}/compressor/latest`,
    postPath:      ()     => `${API_BASE}/compressor`,
  },
  ahu: {
    key: "ahu",
    title: "Danh mục thiết bị Utility — AHU",
    defaultSheet: "AHU",
    latestByName: (sheet) => `${API_BASE}/ahu/${encodeURIComponent(sheet)}/latest`,
    latestAny:     ()     => `${API_BASE}/ahu/latest`,
    postPath:      ()     => `${API_BASE}/ahu`,
  },
  chiller: {
    key: "chiller",
    title: "Danh mục thiết bị Utility — Water Chiller",
    defaultSheet: "Water Chiller",
    latestByName: (sheet) => `${API_BASE}/chiller/${encodeURIComponent(sheet)}/latest`,
    latestAny:     ()     => `${API_BASE}/chiller/latest`,
    postPath:      ()     => `${API_BASE}/chiller`,
  },
  exhaust: {
    key: "exhaust",
    title: "Danh mục thiết bị Utility — Exhaust Fan",
    defaultSheet: "Exhaust Fan",
    latestByName: (sheet) => `${API_BASE}/exhaust/${encodeURIComponent(sheet)}/latest`,
    latestAny:     ()     => `${API_BASE}/exhaust/latest`,
    postPath:      ()     => `${API_BASE}/exhaust`,
  },
  ac: {
    key: "ac",
    title: "Danh mục thiết bị Utility — ACU + Aircon",
    defaultSheet: "ACU + Aircon",
    // Lưu ý: AC dùng /acs cho GET latest, nhưng POST là /ac (khác chữ “s”)
    latestByName: (sheet) => `${API_BASE}/acs/${encodeURIComponent(sheet)}/latest`,
    latestAny:     ()     => `${API_BASE}/acs/latest`,
    postPath:      ()     => `${API_BASE}/ac`,
  },
  tank: {
    key: "tank",
    title: "Danh mục thiết bị Utility — Pressure Tank",
    defaultSheet: "Pressure tank",
    // Lưu ý: Tank dùng /tanks (plural) cho cả GET latest và POST
    latestByName: (sheet) => `${API_BASE}/tanks/${encodeURIComponent(sheet)}/latest`,
    latestAny:     ()     => `${API_BASE}/tanks/latest`,
    postPath:      ()     => `${API_BASE}/tanks`,
  },
};

// Dùng để dựng thanh tabs (key + label giống file tabs cũ)
export const INFO_TABS = [
  { key: "air",        label: "Air&N2 system" },
  { key: "compressor", label: "High Pressure Air Compressor" },
  { key: "ahu",        label: "AHU" },
  { key: "chiller",    label: "Water Chiller" },
  { key: "tank",       label: "Pressure Tank" },
  { key: "exhaust",    label: "Exhaust Fan" },
  { key: "ac",         label: "ACU + Aircon" },
];

export const INFO_KEYS = new Set(INFO_TABS.map(t => t.key));
