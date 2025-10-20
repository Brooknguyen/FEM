// main.js
import { renderRoute, navigate } from "./router.js";
import { renderHeader, renderSidebar } from "./ui.js";

window.navigate = navigate;

const isAuthed = () => !!sessionStorage.getItem("auth_token");

window.render = function () {
  // Luôn render Header/Sidebar
  const header = document.getElementById("header");
  const sidebar = document.getElementById("sidebar");
  if (header) header.innerHTML = renderHeader();
  if (sidebar) sidebar.innerHTML = renderSidebar();

  // Router sẽ quyết định trang nào hiển thị (bao gồm trang Info)
  renderRoute();
};

window.addEventListener("DOMContentLoaded", () => {
  // Nếu chưa có hash: điều hướng về trang mặc định theo trạng thái đăng nhập
  if (!location.hash) {
    // chỉnh route mặc định tùy bạn: THIET_BI/air...
    location.hash = isAuthed() ? "#/info/THIET_BI" : "#/login";
  }

  window.render();

  // Mỗi khi đổi hash, chỉ cần render lại — KHÔNG gọi Info.setTab / Info.load
  window.addEventListener("hashchange", () => {
    window.render();
  });
});

// tiện logout
window.logout = () => {
  sessionStorage.removeItem("auth_token");
  location.hash = "#/login";
};

// submenu (nếu còn dùng click)
window.toggleSubmenu = (el) => {
  const ul = el.parentElement.querySelector(".submenu");
  ul?.classList.toggle("hidden");
};
