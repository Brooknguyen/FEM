// Tabs điều hướng giữa các trang con của Info
export function renderInfoTabs(active) {
  const tab = (k, l) =>
    `<a class="tab ${active === k ? "active" : ""}" href="#/info/${k}">${l}</a>`;
  return `
  <div class="tabs">
    <div class="tabset">
      ${tab("air",        "Air&N2 system")}
      ${tab("compressor", "High Pressure Air Compressor")}
      ${tab("ahu",        "AHU")}
      ${tab("chiller",    "Water Chiller")}
      ${tab("tank",       "Pressure Tank")}
      ${tab("exhaust",    "Exhaust Fan")}
      ${tab("ac",         "ACU + Aircon")}
    </div>
  </div>`;
}
