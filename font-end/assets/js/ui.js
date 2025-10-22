// ui.js
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
      <button class="iconbtn" title="Thông báo"><span class="i-bell"></span></button>
      <button id="chat-btn" class="iconbtn" title="Tin nhắn"><span class="i-chat"></span></button>
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

/* ====================== CHAT POPUP ====================== */
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

  // ĐÚNG: chèn HTML
  document.body.insertAdjacentHTML("beforeend", html);
}

function getChatEls() {
  return {
    popup: document.getElementById("chat-popup"),
    messages: document.getElementById("messages"),
    input: document.getElementById("user-input"),
    send: document.getElementById("send-btn"),
    close: document.getElementById("close-chat"),
  };
}

function openChat() {
  renderChatPopup();
  const { popup, input } = getChatEls();
  if (!popup) return;
  popup.style.display = "block";

  messages.innerHTML = "";
  addMessage(
    "👋 Chào bạn! Trợ lý AI đây — mình có thể giúp gì cho bạn không?",
    false
  );
  setTimeout(() => input && input.focus(), 150);
}

function closeChat() {
  const { popup } = getChatEls();
  if (popup) popup.style.display = "none";
}

function addMessage(text, isUser) {
  const { messages } = getChatEls();
  if (!messages) return;

  const msgDiv = document.createElement("div");
  msgDiv.style.marginBottom = "8px";
  msgDiv.style.maxWidth = "75%";
  msgDiv.style.padding = "8px 13px";
  msgDiv.style.borderRadius = "18px";
  msgDiv.style.wordWrap = "break-word";
  msgDiv.style.clear = "both";

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
  messages.appendChild(msgDiv);
  messages.scrollTop = messages.scrollHeight;
}

async function sendMessage() {
  const { input, send, messages } = getChatEls();
  if (!input || !send || !messages) return;

  const text = input.value.trim();
  if (!text) return;

  addMessage(text, true);
  input.value = "";
  input.disabled = true;
  send.disabled = true;

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

    if (!res.ok) throw new Error("Không nhận được phản hồi từ máy chủ AI");
    const data = await res.json();

    loadingMsg.textContent = data.answer || "Chịu, không biết!!!!";
  } catch (error) {
    loadingMsg.textContent = `👋 Chào bạn! Trợ lý AI đây — mình có thể bắt đầu từ đâu?`;
  } finally {
    input.disabled = false;
    send.disabled = false;
    input.focus();
  }
}

/* ——— Event delegation: không phụ thuộc phần tử đã render hay chưa ——— */
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

// Gửi bằng Enter
document.addEventListener("keydown", (e) => {
  const { input } = getChatEls();
  if (!input) return;
  if (document.activeElement === input && e.key === "Enter") {
    e.preventDefault();
    sendMessage();
  }
});
/* ====================== END CHAT POPUP ====================== */
