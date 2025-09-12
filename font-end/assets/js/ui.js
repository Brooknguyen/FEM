// ui.js
export function renderHeader() {
  return `
  <header class="topbar2">
    <div class="left">
      <button class="iconbtn" title="Menu" onclick="window.toggleSidebar()">
        <span class="i-burger"></span>
      </button>
      <div class="branddot"></div>
      <div class="divider-vert"></div>
      <div class="searchbar2">
        <span class="i-search"></span>
        <input id="global-search" placeholder="Search" />
      </div>
    </div>

    <div class="right">
      <button class="iconbtn" title="Thông báo"><span class="i-bell"></span></button>
      <button class="iconbtn" title="Tin nhắn"><span class="i-chat"></span></button>
      <!-- đổi nút này thành toggle light/dark -->
      <button class="iconbtn" title="Chế độ sáng/tối" onclick="window.toggleTheme()">
        <span id="theme-icon" class="i-sun"></span>
      </button>
      <button class="iconbtn" title="Ngôn ngữ"><span class="i-flag"></span></button>
      <div class="avatar"><img src="https://i.pravatar.cc/36" alt=""></div>
    </div>
  </header>`;
}

// Toggle light/dark theme
window.toggleTheme = () => {
  const body = document.body;
  const icon = document.getElementById("theme-icon");
  const dark = body.classList.toggle("dark-theme");

  if (icon) {
    icon.className = dark ? "i-moon" : "i-sun";
  }

  // lưu trạng thái vào localStorage
  localStorage.setItem("theme", dark ? "dark" : "light");
};

// Khôi phục theme khi load
(() => {
  const theme = localStorage.getItem("theme");
  if (theme === "dark") {
    document.body.classList.add("dark-theme");
    const icon = document.getElementById("theme-icon");
    if (icon) icon.className = "i-moon";
  }
})();

export function renderSidebar() {
  const item = (href, icon, text) => `
    <a class="side-item side-link" href="${href}">
      <span class="${icon}"></span>
      <span class="label">${text}</span>
    </a>`;

  return `
  <aside class="sidebar2" id="app-sidebar">
    ${item("#/info/air", "i-home", "Thông tin")}
    ${item("#/plan", "i-system", "Kế hoạch bảo dưỡng")}

    <!-- Cài đặt có submenu -->
    <div class="side-group">
      <div class="side-item" onclick="window.toggleSubmenu(this)">
        <span class="i-report"></span>
        <span class="label">Cài đặt</span>
      </div>
      <div class="submenu hidden">
        <a class="side-item side-sublink" href="#/crud/info">
          <span class="label">Thông tin thiết bị</span>
        </a>
        <a class="side-item side-sublink" href="#/crud/plan">
          <span class="label">Kế hoạch bảo dưỡng</span>
        </a>
      </div>
    </div>

    ${item("#/report", "i-alert", "Báo cáo")}
  </aside>`;
}

// Thu gọn / mở rộng sidebar và lưu trạng thái
window.toggleSidebar = () => {
  document.body.classList.toggle("is-collapsed");
  localStorage.setItem(
    "sidebar-collapsed",
    document.body.classList.contains("is-collapsed") ? "1" : "0"
  );
};

// Khôi phục trạng thái khi load
(() => {
  if (localStorage.getItem("sidebar-collapsed") === "1") {
    document.body.classList.add("is-collapsed");
  }
})();
