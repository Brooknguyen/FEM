// router.js
import { renderInfoRoute } from "./pages/info/index.js"; // bộ điều phối /info/:tab
import { renderPlan } from "./pages/plan.js";
import { renderReport } from "./pages/report.js";
import { renderCrudInfoRoute } from "./pages/crud_info/crud.index.js";
import { renderCrudPlan } from "./pages/crud-plan.js";
import {
  renderLogin,
  renderRegister,
  bindLoginEvents,
  bindRegisterEvents,
} from "./login/login.js";

const isAuthed = () => !!sessionStorage.getItem("auth_token");

export function currentPath() {
  return location.hash.replace(/^#/, "") || "/login";
}
export function navigate(path) {
  if (!path.startsWith("/")) path = "/" + path;
  location.hash = path;
}

function getUserRole() {
  try {
    const user = JSON.parse(sessionStorage.getItem("user_info"));
    return user?.role || null;
  } catch {
    return null;
  }
}

export function renderRoute() {
  const path = currentPath();
  const main = document.getElementById("main");
  if (!main) return;

  const role = getUserRole();

  const isLogin = path === "/login";
  const isRegister = path === "/register";
  const isForgot = path === "/forgot";
  const authed = isAuthed();

  // Cho phép vào /login & /register khi chưa đăng nhập
  if (!isLogin && !isRegister && !isForgot && !authed) {
    navigate("/login");
    return;
  }
  // Nếu đã đăng nhập thì không cho vào /login & /register
  if ((isLogin || isRegister || isForgot) && authed) {
    navigate("/info/air");
    return;
  }

  document.body.classList.toggle(
    "no-chrome",
    isLogin || isRegister || isForgot
  );

  // Bỏ highlight menu ở login & register
  if (!isLogin && !isRegister && !isForgot) {
    document.querySelectorAll(".side-link, .side-sublink").forEach((a) => {
      a.classList.toggle("active", a.getAttribute("href") === `#${path}`);
    });
  }

  if (isLogin) {
    main.innerHTML = renderLogin();
    bindLoginEvents(); // <-- cần gọi
    return;
  }

  if (isRegister) {
    main.innerHTML = renderRegister();
    bindRegisterEvents(); // <-- đã gọi OK
    return;
  }

  if (isForgot) {
    main.innerHTML = renderLogin();
    bindLoginEvents();
    return;
  }

  if (path.startsWith("/info/")) {
    main.innerHTML = renderInfoRoute(path);
    return;
  }

  if (path === "/plan") {
    main.innerHTML = renderPlan();
    return;
  }

  if (path === "/report") {
    main.innerHTML = renderReport();
    return;
  }

  if (path === "/crud/info") {
    navigate("/crud_info/air");
    return;
  }

  // 2) Bắt tất cả /crud_info/:tab
  if (path.startsWith("/crud_info/")) {
    if (role !== "admin") {
      alert("Access denied. Admins only.");
      navigate("/info/air");
      return;
    }
    main.innerHTML = renderCrudInfoRoute(path);
    return;
  }

  if (path === "/crud/plan") {
    if (role !== "admin") {
      alert("Access denied. Admins only.");
      navigate("/info/air");
      return;
    }
    main.innerHTML = renderCrudPlan();
    return;
  }

  // fallback
  navigate("/info/air");
}
window.addEventListener("hashchange", renderRoute);
window.addEventListener("load", renderRoute);
