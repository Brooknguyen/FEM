// router.js
import { renderInfoRoute } from "./pages/info/index.js";
import { renderPlanRoute } from "./pages/plan/index_plan.js";
import {
  renderMaintenance,
  setupReportEvents
} from "./pages/report/report.js";
import { renderCrudInfoRoute } from "./pages/crud_info/crud.index.js";
import { renderCrudPlanRoute } from "./pages/crud_plan/crud.index.plan.js";
import {
  renderLogin,
  renderRegister,
  bindLoginEvents,
  bindRegisterEvents,
} from "./login/login.js";


const isAuthed = () =>
  !!sessionStorage.getItem("auth_token") ||
  !!localStorage.getItem("auth_token");

export function currentPath() {
  return location.hash.replace(/^#/, "") || "/login";
}
export function navigate(path) {
  if (!path.startsWith("/")) path = "/" + path;
  location.hash = path;
}

function getUserRole() {
  try {
    const user =
      JSON.parse(sessionStorage.getItem("user_info")) ||
      JSON.parse(localStorage.getItem("user_info"));
    return user?.role || null;
  } catch {
    return null;
  }
}

// helper: nhận string hoặc Promise<string>
async function setHTML(el, maybeHTML) {
  el.innerHTML = await Promise.resolve(maybeHTML);
}

export async function renderRoute() {
  // <--- async
  const path = currentPath();
  const main = document.getElementById("main");
  if (!main) return;

  const role = getUserRole();

  const isLogin = path === "/login";
  const isRegister = path === "/register";
  const isForgot = path === "/forgot";
  const authed = isAuthed();

  if (!isLogin && !isRegister && !isForgot && !authed) {
    navigate("/login");
    return;
  }
  if ((isLogin || isRegister || isForgot) && authed) {
    navigate("/info/air");
    return;
  }

  document.body.classList.toggle(
    "no-chrome",
    isLogin || isRegister || isForgot
  );

  if (!isLogin && !isRegister && !isForgot) {
    document.querySelectorAll(".side-link, .side-sublink").forEach((a) => {
      a.classList.toggle("active", a.getAttribute("href") === `#${path}`);
    });
  }

  if (isLogin) {
    await setHTML(main, renderLogin());
    bindLoginEvents();
    return;
  }

  if (isRegister) {
    await setHTML(main, renderRegister());
    bindRegisterEvents();
    return;
  }

  if (isForgot) {
    await setHTML(main, renderLogin());
    bindLoginEvents();
    return;
  }

  if (path.startsWith("/info/")) {
    await setHTML(main, renderInfoRoute(path)); // future-proof nếu route async
    return;
  }

  if (path === "/crud/info") {
    navigate("/crud_info/air");
    return;
  }

  if (path.startsWith("/crud_info/")) {
    if (role !== "admin") {
      alert("Access denied. Admins only.");
      navigate("/info/air");
      return;
    }
    await setHTML(main, renderCrudInfoRoute(path));
    return;
  }

  if (path.startsWith("/plan/")) {
    await setHTML(main, renderPlanRoute(path));
    return;
  }

  if (path === "/crud/plan") {
    navigate("/crud_plan/electric");
    return;
  }

  if (path.startsWith("/crud_plan/")) {
    if (role !== "admin") {
      alert("Access denied. Admins only.");
      navigate("/plan/electric");
      return;
    }
    await setHTML(main, renderCrudPlanRoute(path));
    return;
  }

  if (path === "/report") {
    await setHTML(main, renderMaintenance());
    setupReportEvents();;
    return;
  }


  navigate("/info/air");
}

// event handler có thể là async; Promise return sẽ bị bỏ qua, không sao
window.addEventListener("hashchange", () => {
  renderRoute();
});
window.addEventListener("load", () => {
  renderRoute();
});
