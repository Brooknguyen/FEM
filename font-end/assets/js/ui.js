// ui.js
// ======================================================================
//  TABLE OF CONTENTS / MỤC LỤC (KHÔNG ĐỔI LOGIC)
//  [HEADER]   : renderHeader()
//  [GLOBAL-SEARCH] : Sự kiện thanh tìm kiếm toàn cục (delegation)
//  [THEME]    : Toggle Light/Dark + khôi phục theme
//  [SIDEBAR]  : renderSidebar() + toggleSidebar() + khôi phục trạng thái
//  [WEATHER]  : Weather chip (Open-Meteo) + cache + geolocation
//  [PROFILE]  : Popup hồ sơ người dùng + logout
//  [CHAT]     : Chat popup (open/close/send) + delegation
// ======================================================================

// ======================================================================
// [HEADER]  — Header + Topbar (KHÔNG SỬA LOGIC/DOM/ID/CLASS/API)
// ----------------------------------------------------------------------
// - Xuất ra: renderHeader()
// - Chứa nút toggleSidebar(), icon theme, global search input (#topbar-search)
// - Vị trí weather chip: #weather-chip
// ======================================================================
export function renderHeader() {
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

      <!----- Global Search bar ------>
      <div class="searchbar2">
        <span class="i-search"></span>
        <input type="search" id="topbar-search" placeholder="Search" />
      </div>
    </div>

    <div class="right">
      <div id="weather-chip" class="weather-chip" title="Loading weather forecast....">Loading...</div>
      <button id="chat-btn" class="iconbtn" title="Messages"><span class="i-chat"></span></button>
      <button class="iconbtn" title="Dark/Light Mode" onclick="window.toggleTheme()">
        <span id="theme-icon" class="i-sun"></span>
      </button>
      <button class="iconbtn" title="Language"><span class="i-flag"></span></button>
      <div class="avatar user-menu">
        <img src="assets/pictures/user.png" alt="avatar">
      </div>
    </div>
  </header>`;
}

// ======================================================================
// [GLOBAL-SEARCH] — Global Search Bar Events (delegation)
// ----------------------------------------------------------------------
// - Khởi tạo 1 lần, lắng nghe IME, input, paste, keyup, Enter/Escape
// - Phát CustomEvent "search-query-changed" với payload { query }
// - Điểm dò lỗi nhanh: lastSent, composing, emit(), dispatch()
// ======================================================================
/*-------- Global Search Bar Events (delegated) ---------*/
// Đặt trong ui.js (một lần là đủ, không cần gọi thủ công)
(() => {
  let composing = false; // IME đang nhập?
  let lastSent = null; // Tránh phát trùng
  let raf = 0;

  const getInput = () => document.getElementById("topbar-search");
  const read = () => getInput()?.value ?? "";

  const dispatch = (q) => {
    if (q === lastSent) return;
    lastSent = q;
    window.dispatchEvent(
      new CustomEvent("search-query-changed", { detail: { query: q } })
    );
  };

  const emit = () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => dispatch(read()));
  };

  // --- Delegation: lắng nghe trên document ---
  document.addEventListener("compositionstart", (e) => {
    if (e.target?.id === "topbar-search") composing = true;
  });

  document.addEventListener("compositionend", (e) => {
    if (e.target?.id === "topbar-search") {
      composing = false;
      emit();
    }
  });

  // Gõ tới đâu lọc tới đó (kể cả paste/cut/drop)
  const liveEvents = ["input", "search", "paste", "cut", "drop", "keyup"];
  liveEvents.forEach((type) => {
    document.addEventListener(type, (e) => {
      if (e.target?.id !== "topbar-search") return;
      if (!composing) emit();
    });
  });

  // Đảm bảo nhấn 1 phím cũng lọc tức thì, và chặn Enter gây điều hướng
  document.addEventListener("keydown", (e) => {
    if (e.target?.id !== "topbar-search") return;
    if (e.key === "Enter") {
      e.preventDefault(); // tránh submit / điều hướng
      e.stopPropagation();
    }
    if (e.key === "Escape") {
      const el = getInput();
      if (el) el.value = "";
      lastSent = null;
      composing = false;
      emit();
      return;
    }
    if (!composing) emit();
  });

  // Khi ô search được focus lại, phát lại để đồng bộ trang mới bind listener
  document.addEventListener("focusin", (e) => {
    if (e.target?.id === "topbar-search") {
      lastSent = null;
      emit();
    }
  });

  // Đồng bộ khi chuyển route SPA / tab trở lại / DOM sẵn sàng
  window.addEventListener("hashchange", () => {
    lastSent = null;
    emit();
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      lastSent = null;
      emit();
    }
  });
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      lastSent = null;
      emit();
    });
  } else {
    lastSent = null;
    emit();
  }
})();

// ======================================================================
// [THEME] — Toggle Light/Dark Theme + Khôi phục theme
// ----------------------------------------------------------------------
// - API: window.toggleTheme()
// - Lưu: localStorage.theme = 'dark' | 'light'
// - Điểm dò lỗi: class "dark-theme" trên <body>, #theme-icon
// ======================================================================
/*----------- Toggle light/dark theme ------------*/
window.toggleTheme = () => {
  const body = document.body;
  const icon = document.getElementById("theme-icon");
  const dark = body.classList.toggle("dark-theme");

  if (icon) {
    icon.className = dark ? "i-moon" : "i-sun";
  }

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

// ======================================================================
// [SIDEBAR] — Sidebar UI + trạng thái thu gọn/mở rộng
// ----------------------------------------------------------------------
// - Xuất ra: renderSidebar()
// - API: window.toggleSidebar()
// - Lưu trạng thái vào localStorage.sidebar-collapsed
// ======================================================================
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

// ======================================================================
// [WEATHER] — Weather Chip (Open-Meteo) + cache + geolocation
// ----------------------------------------------------------------------
// - Entry: IIFE mountWeatherChip() tự khởi chạy, và expose window.refreshWeatherChip()
// - Cache key: "weather_cache_v1", TTL: 10 phút
// - Fallback vị trí: Bắc Ninh
// - Điểm dò lỗi: getCoords(), reverseName(), fetchWeather(), render()
// ======================================================================
/* ===================== WEATHER CHIP (Open-Meteo) ==================== */

/* ===================== WEATHER CHIP (Open-Meteo) — FIXED LOCATION ==================== */
/* ===================== WEATHER CHIP (Fixed Bắc Ninh + Persistent Observer) ==================== */
const WEATHER_FIXED_LOCATION = {
  lat: 21.185,
  lon: 106.074,
  name: "Bắc Ninh",
  country: "VN",
};

(function mountWeatherChipFixed() {
  const ID = "weather-chip";
  const el = () => document.getElementById(ID);

  const CACHE_KEY = "weather_cache_v1";
  const CACHE_MS = 10 * 60 * 1000; // 10 phút
  let inFlight = false;

  const WMAP = {
    0: { t: "Trời quang", i: "☀️" },
    1: { t: "Ít mây", i: "🌤️" },
    2: { t: "Có mây", i: "⛅" },
    3: { t: "Nhiều mây", i: "☁️" },
    45: { t: "Sương mù", i: "🌫️" },
    48: { t: "Sương mù băng", i: "🌫️" },
    51: { t: "Mưa phùn nhẹ", i: "🌦️" },
    53: { t: "Mưa phùn", i: "🌦️" },
    55: { t: "Mưa phùn dày", i: "🌧️" },
    61: { t: "Mưa nhẹ", i: "🌧️" },
    63: { t: "Mưa vừa", i: "🌧️" },
    65: { t: "Mưa to", i: "🌧️" },
    71: { t: "Tuyết rơi", i: "❄️" },
    80: { t: "Mưa rào", i: "🌦️" },
    95: { t: "Dông", i: "⛈️" },
  };

  async function fetchWithTimeout(url, ms = 8000) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    try {
      return await fetch(url, { signal: ctrl.signal });
    } finally {
      clearTimeout(t);
    }
  }

  async function fetchWeather(lat, lon) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=auto`;
    const r = await fetchWithTimeout(url);
    if (!r.ok) throw new Error("weather HTTP " + r.status);
    return r.json();
  }

  function render(d) {
    const node = el();
    if (!node) return;
    const map = WMAP[d.code] || { t: "Thời tiết", i: "🌤️" };
    node.innerHTML = `
      <span class="w-emoji">${map.i}</span>
      <span class="w-place">${d.place}</span>
      <span class="w-temp">${d.temp}°C</span>
      <span class="w-desc">${map.t}</span>
      <span class="w-dot">•</span>
      <span class="w-wind">Gió ${d.wind} km/h</span>
    `;
    node.title = `${map.t} • ${d.temp}°C • Gió ${d.wind} km/h`;
  }

  async function doWork() {
    if (inFlight) return;
    if (!el()) return;
    inFlight = true;
    try {
      const now = Date.now();
      const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
      if (cache && now - cache.ts < CACHE_MS) {
        render(cache.data);
        return;
      }

      const pos = WEATHER_FIXED_LOCATION;
      const place = `${pos.name}${pos.country ? ", " + pos.country : ""}`;

      const w = await fetchWeather(pos.lat, pos.lon);
      const cur = w.current_weather || {};
      const data = {
        place,
        temp: Math.round(cur.temperature ?? 0),
        wind: Math.round(cur.windspeed ?? 0),
        code: cur.weathercode ?? 2,
      };

      localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: now, data }));
      render(data);
    } catch (e) {
      const node = el();
      if (node) {
        node.textContent = "Không lấy được thời tiết";
        node.title = e?.message || "Lỗi thời tiết";
      }
    } finally {
      inFlight = false;
    }
  }

  // Public API để trang khác gọi thủ công sau khi render header
  window.refreshWeatherChip = () => doWork();

  // Gọi ngay nếu đã có phần tử, hoặc khi DOM xong
  function boot() {
    el() ? doWork() : null;
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }

  // Observer bền bỉ: mỗi khi #weather-chip được thêm lại sau khi chuyển trang, gọi doWork()
  let raf = 0;
  const mo = new MutationObserver(() => {
    if (!el()) return;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => doWork());
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });

  // Thêm hook route SPA (phòng trường hợp header render xong trước observer tick)
  window.addEventListener("hashchange", () => {
    setTimeout(() => window.refreshWeatherChip?.(), 0);
  });
})();

// ======================================================================
// [SIDEBAR] — Toggle & Restore state
// ----------------------------------------------------------------------
// - API: window.toggleSidebar()
// - Lưu trạng thái thu gọn vào localStorage.sidebar-collapsed ("1"/"0")
// ======================================================================
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

// ======================================================================
// [PROFILE] — User Profile Popup (avatar click) + Logout
// ----------------------------------------------------------------------
// - Entry: delegation click vào .avatar.user-menu -> renderUserProfilePopup()
// - Close: #close-profile-popup, #profile-popup-overlay
// - Logout: xóa các token + chuyển #/login + reload()
// - Xuất ra: renderUserProfilePopup() (KHÔNG đổi cú pháp/HTML)
// ======================================================================
// Xử lý popup user khi click avatar
document.addEventListener("click", function (e) {
  if (e.target.closest && e.target.closest(".avatar.user-menu")) {
    if (document.getElementById("user-profile-popup")) return;
    const popupHtml = renderUserProfilePopup();
    document.body.insertAdjacentHTML("beforeend", popupHtml);

    document.getElementById("close-profile-popup").onclick = closeProfilePopup;
    document.getElementById("profile-popup-overlay").onclick =
      closeProfilePopup;

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

// ======================================================================
// [CHAT] — Chat Popup (render/open/close/send) + delegation
// ----------------------------------------------------------------------
// - Entry: click #chat-btn -> openChat()
// - Close: #close-chat
// - Send: #send-btn hoặc Enter khi focus input
// - Endpoint: POST http://127.0.0.1:1080/chat { text }
// - Điểm dò lỗi: fetch(), loadingMsg, data.answer
// ======================================================================
/* ====================== CHAT POPUP ====================== */
/** ================== Chat Popup (giữ lịch sử tới khi đóng tab) ================== */
const CHAT_STORE_KEY = "chat_popup_state_v1"; // đổi key nếu cần reset

/* ------- Lưu/đọc trạng thái ------- */
function loadState() {
  try {
    const raw = sessionStorage.getItem(CHAT_STORE_KEY);
    return raw ? JSON.parse(raw) : { msgs: [] }; // [{ text, isUser }]
  } catch {
    return { msgs: [] };
  }
}

function saveState(state) {
  try {
    sessionStorage.setItem(CHAT_STORE_KEY, JSON.stringify(state));
  } catch {}
}

/* ------- Render markup ------- */
function renderChatPopup() {
  if (document.getElementById("chat-popup")) return;

  const html = `
  <div id="chat-popup" style="
    position: fixed; right:20px; bottom: 24px; z-index: 1000;
    width: 360px; max-height: 46vh; display: none;
    border-radius: 12px; overflow: hidden;
    box-shadow: 0 12px 30px rgba(0,0,0,.18);
    background: var(--card,#fff); color: var(--fg,#111);
    border: 1px solid var(--line,#e5e7eb);
  ">
    <div style="display: flex; align-items:center; gap:8px; padding:10px 12px; border-bottom:1px solid var(--line,#e5e7eb); background: var(--card,#fff);">
      <div style="font-weight:700;">Trợ lý (Assistant)</div>
      <div style="flex:1"></div>
      <button id="close-chat" class="iconbtn" title="Đóng" style="border:none; background: transparent; font-size:18px; cursor:pointer; line-height:1">×</button>
    </div>

    <div id="messages" style="
      padding: 12px; overflow:auto; max-height: 34vh;
      background: var(--card,#fff);
    "></div>

    <div style="display:flex; gap:8px; padding:10px; border-top:1px solid var(--line,#e5e7eb); background: var(--card,#fff);">
      <input id="user-input" type="text" placeholder="Nhập câu hỏi…" style="
        flex:1; border:1px solid var(--line,#e5e7eb); border-radius:8px;
        padding:10px 12px; background:var(--card,#fff); color:var(--fg,#111);
      ">
      <button id="send-btn" class="btn primary" style="white-space: nowrap;">Send</button>
    </div>
  </div>
  `;
  document.body.insertAdjacentHTML("beforeend", html);
}

/* ------- Lấy element ------- */
function getChatEls() {
  return {
    popup: document.getElementById("chat-popup"),
    messages: document.getElementById("messages"),
    input: document.getElementById("user-input"),
    send: document.getElementById("send-btn"),
    close: document.getElementById("close-chat"),
  };
}

/* ------- Tạo bubble ------- */
function renderBubble(text, isUser) {
  const msgDiv = document.createElement("div");
  msgDiv.style.marginBottom = "8px";
  msgDiv.style.maxWidth = "75%";
  msgDiv.style.padding = "8px 13px";
  msgDiv.style.borderRadius = "18px";
  msgDiv.style.clear = "both";
  msgDiv.style.wordWrap = "break-word";
  if (isUser) {
    msgDiv.style.background = "#0084ff";
    msgDiv.style.color = "#fff";
    msgDiv.style.float = "right";
    msgDiv.style.borderBottomRightRadius = "0";
  } else {
    msgDiv.style.background = "#e5e5ea";
    msgDiv.style.color = "#222";
    msgDiv.style.float = "left";
    msgDiv.style.borderBottomLeftRadius = "0";
  }
  msgDiv.textContent = text;
  return msgDiv;
}

/* ------- API mở/đóng ------- */
function openChat() {
  renderChatPopup();
  const { popup, messages, input } = getChatEls();
  if (!popup || !messages) return;

  popup.style.display = "block";

  // KHÔNG dùng biến global messages; KHÔNG xoá lịch sử khi mở lại
  // Lần đầu render UI -> dựng lại lịch sử từ storage
  messages.innerHTML = "";
  const state = loadState();

  if (state.msgs.length === 0) {
    addMessage(
      "👋 Chào bạn! Trợ lý AI đây — mình có thể giúp gì cho bạn không?",
      false,
      { persist: true }
    );
  } else {
    for (const m of state.msgs) {
      messages.appendChild(renderBubble(m.text, m.isUser));
    }
    messages.scrollTop = messages.scrollHeight;
  }

  setTimeout(() => input && input.focus(), 150);
}

function closeChat() {
  const { popup } = getChatEls();
  if (popup) popup.style.display = "none"; // chỉ ẩn, không xoá DOM/lịch sử
}

/* ------- Thêm message + lưu ------- */
function addMessage(text, isUser, opts = { persist: true }) {
  const { messages } = getChatEls();
  if (!messages) return;

  messages.appendChild(renderBubble(text, isUser));
  messages.scrollTop = messages.scrollHeight;

  if (opts.persist) {
    const state = loadState();
    state.msgs.push({ text, isUser });
    saveState(state);
  }
}

/* ------- Gửi tin nhắn ------- */
async function sendMessage() {
  const { input, send, messages } = getChatEls();
  if (!input || !send || !messages) return;

  const text = input.value.trim();
  if (!text) return;

  addMessage(text, true, { persist: true });
  input.value = "";
  input.disabled = true;
  send.disabled = true;

  // bubble loading (không lưu)
  const loadingMsg = document.createElement("div");
  Object.assign(loadingMsg.style, {
    marginBottom: "8px",
    maxWidth: "75%",
    padding: "8px 13px",
    borderRadius: "18px",
    wordWrap: "break-word",
    clear: "both",
    background: "#e5e5ea",
    color: "#222",
    float: "left",
    borderBottomLeftRadius: "0",
  });
  loadingMsg.innerHTML = `<div class="loading-dots"><span>.</span><span>.</span><span>.</span></div>`;
  messages.appendChild(loadingMsg);
  messages.scrollTop = messages.scrollHeight;

  try {
    const res = await fetch("http://127.0.0.1:1080/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    let answer = "Chịu, không biết!!!!";
    if (res.ok) {
      const data = await res.json();
      answer = data.answer || answer;
    } else {
      answer = "👋 Chào bạn! Trợ lý AI đây — mình có thể bắt đầu từ đâu?";
    }

    const ansBubble = renderBubble(answer, false);
    messages.replaceChild(ansBubble, loadingMsg);

    // Lưu câu trả lời thật
    const state = loadState();
    state.msgs.push({ text: answer, isUser: false });
    saveState(state);
  } catch (error) {
    const fallback = "👋 Chào bạn! Trợ lý AI đây — mình có thể bắt đầu từ đâu?";
    const ansBubble = renderBubble(fallback, false);
    messages.replaceChild(ansBubble, loadingMsg);

    const state = loadState();
    state.msgs.push({ text: fallback, isUser: false });
    saveState(state);
  } finally {
    input.disabled = false;
    send.disabled = false;
    input.focus();
  }
}

/* ------- Event delegation ------- */
document.addEventListener("click", (e) => {
  if (e.target.closest && e.target.closest("#chat-btn")) {
    e.preventDefault();
    openChat();
    return;
  }
  if (e.target.closest && e.target.closest("#close-chat")) {
    e.preventDefault();
    closeChat();
    return;
  }
  if (e.target.closest && e.target.closest("#send-btn")) {
    e.preventDefault();
    sendMessage();
  }
});

/* ------- Gửi bằng Enter ------- */
document.addEventListener("keydown", (e) => {
  const { input } = getChatEls();
  if (!input) return;
  if (document.activeElement === input && e.key === "Enter") {
    e.preventDefault();
    sendMessage();
  }
});
/* ====================== END CHAT POPUP ====================== */

// ======================================================================
// [SIDEBAR] — Toggle submenu helper (giữ API cũ trong HTML onclick)
// ----------------------------------------------------------------------
// - HTML cũ gọi: onclick="window.toggleSubmenu(this)"
// - Bạn có thể đặt logic show/hide trong CSS/JS khác nếu cần
// ======================================================================
// (KHÔNG có thay đổi logic ở đây; nếu cần, thêm helper tại file khác)
