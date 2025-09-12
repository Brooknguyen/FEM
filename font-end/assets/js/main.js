// main.js
import { renderRoute, navigate } from "./router.js";
import { renderHeader, renderSidebar } from "./ui.js";
import { InfoStore as Info } from "./stores/info.store.js";

window.navigate = navigate;

function isInfoPath(hash) {
  return (hash || location.hash).startsWith("#/info/");
}
function getInfoTab(hash) {
  return (
    (hash || location.hash).replace(/^#\/info\/?/, "").split("/")[0] || "air"
  );
}
const isAuthed = () => !!sessionStorage.getItem("auth_token");

window.render = function () {
  // Header/Sidebar luôn sẵn — router có thể ẩn khi ở /login bằng class no-chrome
  const header = document.getElementById("header");
  const sidebar = document.getElementById("sidebar");
  if (header) header.innerHTML = renderHeader();
  if (sidebar) sidebar.innerHTML = renderSidebar();

  renderRoute(); // render theo router (bao gồm các trang con của Info)
};

window.addEventListener("DOMContentLoaded", async () => {
  // Nếu chưa có hash: đi thẳng đến trang phù hợp theo auth
  if (!location.hash) {
    location.hash = isAuthed() ? "#/info/air" : "#/login";
  }

  // Chỉ load dữ liệu khi đã login và đang ở /info/*
  if (isAuthed() && isInfoPath()) {
    const tab = getInfoTab();
    if (Info.tab !== tab && Info.setTab) {
      await Info.setTab(tab);
    } else if (!Info.items?.length && Info.load) {
      await Info.load();
    }
  }

  window.render();

  window.addEventListener("hashchange", async () => {
    if (isAuthed() && isInfoPath()) {
      const newTab = getInfoTab(); // ✅ đúng tên biến
      if (newTab && newTab !== Info.tab && Info.setTab) {
        await Info.setTab(newTab); // ✅ dùng newTab
      } else if (!Info.items?.length && Info.load) {
        await Info.load();
      }
    }
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
