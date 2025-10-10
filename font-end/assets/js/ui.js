// ui.js
export function renderHeader() {
  // Lấy thông tin user từ localStorage/sessionStorage
  const user = JSON.parse(
    localStorage.getItem("user_info") ||
      sessionStorage.getItem("user_info") ||
      "null"
  );

  return `
  <header class="topbar2">
    <div class="left">
      <button class="iconbtn" title="Menu" onclick="window.toggleSidebar()">
        <span class="i-burger"></span>
      </button>
      <div class="branddot">
        <img src="assets/pictures/icon_company.png" alt="avatar">
      </div>
      <div class="divider-vert"></div>
    </div>

    <div class="right">
      <button class="iconbtn" title="Thông báo"><span class="i-bell"></span></button>
      <button class="iconbtn" title="Tin nhắn"><span class="i-chat"></span></button>
      <button class="iconbtn" title="Chế độ sáng/tối" onclick="window.toggleTheme()">
        <span id="theme-icon" class="i-sun"></span>
      </button>
      <button class="iconbtn" title="Ngôn ngữ"><span class="i-flag"></span></button>
      <div class="avatar user-menu">
        <img src="assets/pictures/user.png" alt="avatar">
      </div>
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
    ${item("#/plan/electric", "i-system", "Kế hoạch bảo dưỡng")}

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
          <span class="label">Kế hoạch bảo dưỡng năm</span>
        </a>

      </div>
    </div>

    ${item("#/report", "i-alert", "Báo cáo")}
    ${item("#/todo", "i-toDo", "To-Do List")}
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

document.addEventListener("click", function (e) {
  // Mở popup khi click avatar
  if (e.target.closest && e.target.closest(".avatar.user-menu")) {
    if (document.getElementById("user-profile-popup")) return;
    const popupHtml = renderUserProfilePopup();
    document.body.insertAdjacentHTML("beforeend", popupHtml);

    // Đóng popup
    document.getElementById("close-profile-popup").onclick = closeProfilePopup;
    document.getElementById("profile-popup-overlay").onclick =
      closeProfilePopup;

    // Đăng xuất
    document.getElementById("btn-logout-popup").onclick = function () {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user_info");
      sessionStorage.removeItem("auth_token");
      sessionStorage.removeItem("refresh_token");
      sessionStorage.removeItem("user_info");
      location.href = "#/login";
      location.reload();
    };
  }
});

function closeProfilePopup() {
  document.getElementById("user-profile-popup")?.remove();
  document.getElementById("profile-popup-overlay")?.remove();
}

export function renderUserProfilePopup() {
  const user =
    JSON.parse(
      localStorage.getItem("user_info") ||
        sessionStorage.getItem("user_info") ||
        "null"
    ) || {};

  const fullName = `${(user.firstName || "").trim()} ${(
    user.lastName || ""
  ).trim()}`;
  const empCode = user.code || "";

  return `
    <div class="profile-card" id="user-profile-popup" style="position:fixed; top:56px; right:16px; z-index:1000;">
      <div class="pc-header">
        <button class="pc-close" id="close-profile-popup" aria-label="Đóng">×</button>
      </div>

      <div class="pc-body">
        <div class="pc-avatar"></div>
        <div class="pc-name">
          <div class="pc-full">${fullName}</div>
          <div class="pc-handle">${empCode}</div>
        </div>
      </div>

      <div class="pc-menu">
        <button class="pc-item danger" id="btn-logout-popup">
          <span class="i-exit" style="margin-right:8px"></span>Log out
        </button>
      </div>
    </div>

    <div class="profile-popup-overlay" id="profile-popup-overlay"></div>
  `;
}
