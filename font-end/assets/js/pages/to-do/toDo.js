/* --------------------------- TO-DO (TRELLO-LIKE) --------------------------- */
/* public API cho router: renderTodoPage(), setupTodoEvents() */

export function renderTodoPage() {
  // ✅ Sửa so sánh role
  const isAdmin = (() => {
    try {
      const raw =
        sessionStorage.getItem("user_info") ||
        localStorage.getItem("user_info");
      const role = (JSON.parse(raw || "{}").role || "")
        .toString()
        .toLowerCase();
      return role === "admin";
    } catch {
      return false;
    }
  })();

  return `
  <section id="todo-kanban" class="kb-shell">
    <style>
      /* ============== TRELLO-LIKE THEME ============== */
      #todo-kanban.kb-shell{
        --colW: 272px; --gap: 12px; --radius:12px; --brand:#0c66e4;
        --bg:#f4f5f7; --list:#ebecf0; --text:#172b4d; --muted:#6b778c;
        --kanbanH: 600px; --fg: var(--text);
        height: var(--kanbanH);
        display: flex; flex-direction: column;
        max-width: 100%; margin:0 auto; padding: 12px 0 24px;
      }
      body.dark-theme #todo-kanban.kb-shell{ --bg:#0b1220; --list:#0f172a; --text:#e5e7eb; --muted:#94a3b8; }
      #todo-kanban{ background:var(--bg); color:var(--text) }

      #todo-kanban .kb-header{ display:flex; align-items:center; gap:12px; padding: 0 16px 8px; flex: 0 0 auto; }
      #todo-kanban .kb-header h2{ margin:0; font-size:18px; font-weight:800; letter-spacing:.2px }
      #todo-kanban .kb-actions{ margin-left:auto; display:flex; gap:8px }
      #todo-kanban .btn{ padding:8px 12px; border:none; border-radius:8px; cursor:pointer; font-weight:600 }
      #todo-kanban .btn.primary{ background:var(--brand); color:#111 }
      #todo-kanban .btn.gray{ background:#e5e7eb; color:#111 }
      body.dark-theme #todo-kanban .btn.gray{ background:#374151; color:#e5e7eb }
      .btn.gray:hover{ transform: scale(1.05); transition: transform .15s ease; }

      /* Board & lists */
      #todo-kanban .board{ display:flex; align-items:flex-start; gap:var(--gap); padding: 4px 16px; flex: 1 1 auto; overflow-x:auto; overflow-y:hidden; }
      #todo-kanban .list{ min-width: var(--colW); flex: 1 1 0%; background:var(--list); border-radius:12px; padding:10px; height:100%; display:flex; flex-direction:column; }
      #todo-kanban .list-title{ display:flex; align-items:center; gap:8px; font-weight:800; margin-bottom:8px; }
      #todo-kanban .counter{ font-size:12px; opacity:.8; color:var(--muted) }

      /* Composer */
      #todo-kanban .composer{ background:transparent; flex:0 0 auto; }
      #todo-kanban .composer.collapsed .composer-actions{ display:none }
      #todo-kanban .composer.collapsed textarea{ display:none }
      #todo-kanban .composer.collapsed:hover{ background:rgba(9,30,66,.08) }
      #todo-kanban .composer .composer-toggle{ width:100%; text-align:left; background:transparent; color:var(--muted); border-radius:8px; padding:8px 10px; border:none; cursor:pointer }
      #todo-kanban .composer textarea{ width:100%; min-height:64px; padding:8px 10px; border-radius:8px; border:1px solid #d1d5db; resize:vertical; outline:none; background:#fff; color:#111 }
      body.dark-theme #todo-kanban .composer textarea{ background:#111827; color:#e5e7eb; border-color:#374151 }
      #todo-kanban .composer .row{ display:flex; align-items:center; gap:6px; margin-top:8px }
      #todo-kanban select, #todo-kanban input[type="date"]{ padding:8px 10px; border-radius:8px; border:1px solid #d1d5db; background:#fff; color:#111 }
      body.dark-theme #todo-kanban select, body.dark-theme #todo-kanban input[type="date"]{ background:#111827; color:#e5e7eb; border-color:#374151 }

      /* Cards */
      #todo-kanban .cards{ flex: 1 1 auto; min-height:0; overflow-y:auto; -webkit-overflow-scrolling:touch; }
      #todo-kanban .card-item{
        position:relative; background:#fff; border-radius:10px; padding:10px 36px 10px 12px;
        margin-bottom:8px; box-shadow:0 1px 0 rgba(9,30,66,.25);
        cursor:grab; border:1px solid rgba(16,24,40,.04); color:#111;
      }
      #todo-kanban .card-item:active{ cursor:grabbing }
      body.dark-theme #todo-kanban .card-item{ background:#0b1220; border-color:#1f2937; box-shadow:0 1px 0 rgba(0,0,0,.3); color:#111; }
      #todo-kanban .card-title{ font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

      #todo-kanban .card-del{ position:absolute; top:6px; right:6px; border:none; background:transparent; padding:4px 6px; border-radius:6px; color:#6b7280; opacity:0; transition:opacity .15s ease; cursor:pointer; }
      #todo-kanban .card-item:hover .card-del{ opacity:1; }
      #todo-kanban .card-del:hover{ background:#f3f4f6; color:#111 }
      body.dark-theme #todo-kanban .card-del:hover{ background:#1f2937; color:#e5e7eb }

      /* Drag */
      #todo-kanban .placeholder{ height: 44px; margin-bottom:8px; border-radius:10px; background: repeating-linear-gradient(45deg,#dbeafe, #dbeafe 6px, #bfdbfe 6px, #bfdbfe 12px); opacity:.9; border:1px dashed #60a5fa }
      body.dark-theme #todo-kanban .placeholder{ background: repeating-linear-gradient(45deg,#0b4a6f,#0b4a6f 6px,#0e7490 6px,#0e7490 12px); border-color:#38bdf8 }
      #todo-kanban .ghost{ opacity:.6; transform: scale(.98) }

      /* Detail panel (card modal) */
      #todo-kanban .detail{ position:fixed; inset:0; display:none; z-index:999; }
      #todo-kanban .detail.open{ display:block; }
      #todo-kanban .detail .backdrop{ position:absolute; inset:0; background:rgba(0,0,0,.45); }
      #todo-kanban .detail .panel{ position:absolute; top:0; right:0; height:100%; width:min(920px, 100%); background:#fff; color:#111; border-left:1px solid #e5e7eb; display:flex; flex-direction:column; }
      body.dark-theme #todo-kanban .detail .panel{ background:#0b1220; color:#e5e7eb; border-color:#1f2937; }
      #todo-kanban .detail .header{ display:flex; align-items:center; justify-content:space-between; gap:8px; padding:12px 16px; border-bottom:1px solid #e5e7eb; }
      #todo-kanban .detail .title{ font-size:22px; font-weight:800; border:none; background:transparent; outline:none; width:100%; color: var(--fg); }
      #todo-kanban .detail .body{ height:calc(100% - 54px); overflow:auto; padding:16px; display:grid; grid-template-columns: 1fr 320px; gap:16px; }
      #todo-kanban .detail .section{ margin-bottom:16px; }
      #todo-kanban .detail h4{ margin:0 0 8px 0; font-size:14px; font-weight:800; opacity:.85 }
      #todo-kanban .detail textarea{ width:100%; min-height:96px; padding:10px; border-radius:10px; border:1px solid #d1d5db; outline:none; background:#fff; color:#111; }
      body.dark-theme #todo-kanban .detail textarea{ background:#111827; color:#e5e7eb; border-color:#374151 }
      #todo-kanban .detail .inline-controls{ display:flex; flex-wrap:wrap; gap:8px; }
      #todo-kanban .detail .pill{ padding:6px 10px; border-radius:999px; border:1px solid #e5e7eb; background:#f9fafb; font-size:13px; cursor:pointer }
      body.dark-theme #todo-kanban .detail .pill{ background:#111827; border-color:#374151 }
      #todo-kanban .detail .right .comment-input{ width:100%; padding:8px 10px; border-radius:8px; border:1px solid #d1d5db; outline:none; background: transparent; color: var(--fg); }
      body.dark-theme #todo-kanban .detail .right .comment-input{ border-color:#374151 }
      #todo-kanban .detail .activity{ margin-top:12px; display:flex; flex-direction:column; gap:10px; }
      #todo-kanban .detail .activity .item{ font-size:13px; line-height:1.35; background:transparent; color:var(--fg); border:none; border-radius:10px; padding:8px 10px; }
    </style>

    <div class="kb-header">
      <h2>To-Do Kanban</h2>
      <div id="kb-stats" class="counter"></div>
      <div class="kb-actions">
        ${
          isAdmin
            ? `
          <button id="kb-clear-done" class="btn gray" style="background-color: green">🧹 Update</button>
          <button id="kb-clear-all" class="btn gray" style="background-color: #d91c42ff">🗑️ Delete Card</button>
        `
            : ``
        }
      </div>
    </div>

    <div class="board" id="kb-board">
      ${["todo", "doing", "done"]
        .map(
          (s) => `
        <div class="list" data-list="${s}">
          <div class="list-title">
            <span>${
              s === "todo" ? "To Do" : s === "doing" ? "Doing" : "Done"
            }</span>
            <span class="counter" data-count="${s}"></span>
          </div>

          ${
            isAdmin
              ? `
          <div class="composer collapsed" data-composer="${s}">
            <button type="button" class="composer-toggle">➕ Add Card</button>
            <div class="composer-body">
              <textarea placeholder="Type the tile of card...."></textarea>
              <div class="row composer-actions">
                <select data-label="${s}">
                  <option value="">Blank</option>
                  <option value="#22c55e">Green - Normal</option>
                  <option value="#f59e0b">Yellow - Priority</option>
                  <option value="#ef4444">Red - Urgent</option>
                </select>
                <input type="date" data-due="${s}" />
                <button type="button" class="btn primary" data-add="${s}">Add New</button>
                <button type="button" class="btn gray" data-cancel="${s}">Cancel</button>
              </div>
            </div>
          </div>`
              : ``
          }

          <div class="cards" data-cards="${s}"></div>
        </div>
      `
        )
        .join("")}
    </div>

    <!-- Detail panel -->
    <div id="kb-detail" class="detail" aria-hidden="true">
      <div class="backdrop" data-detail-close></div>
      <div class="panel" role="dialog" aria-modal="true">
        <div class="header">
          <input class="title" id="detail-title" placeholder="Title..." />
          <button class="btn gray" id="detail-close" title="Close">✖</button>
        </div>
        <div class="body">
          <div class="left">
            <div class="section">
              <div class="inline-controls">
                <label class="pill">Label
                  <select id="detail-label" style="margin-left:8px">
                    <option value="">(Blank)</option>
                    <option value="#22c55e">Green - Normal</option>
                    <option value="#f59e0b">Yellow - Priority</option>
                    <option value="#ef4444">Red - Urgent</option>
                  </select>
                </label>
                <label class="pill">Date
                  <input type="date" id="detail-due" style="margin-left:8px" />
                </label>
              </div>
            </div>

            <div class="section">
              <h4>Description</h4>
              <textarea id="detail-desc" placeholder="Type more detailed description ..."></textarea>
            </div>
          </div>

          <div class="right">
            <h4>Comment</h4>
            <input class="comment-input" id="detail-cmt-input" placeholder="Type your comment ..." />
            <div class="activity" id="detail-activity"></div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- ARCHIVE -->
  <section id="todo-archive">
    <style>
      #todo-archive{ padding: 8px 16px 24px; background:transparent; color:var(--text); }
      #todo-archive .arch-header{ display:flex; align-items:center; gap:12px; margin:4px 0 8px; }
      #todo-archive h3{ margin:0; font-size:16px; font-weight:800; letter-spacing:.2px; }
      #todo-archive .btn.gray{ padding:8px 12px; border:none; border-radius:8px; cursor:pointer; font-weight:600; background:#e5e7eb; color:#111 }
      body.dark-theme #todo-archive .btn.gray{ background:#374151; color:#e5e7eb }
      #todo-archive .arch-table{ width:100%; border-collapse:collapse; background:var(--list); border-radius:12px; overflow:hidden; }
      #todo-archive .arch-table th, #todo-archive .arch-table td{ padding:10px; border-bottom:1px solid #e5e7eb; text-align:left; font-size:14px; }
      body.dark-theme #todo-archive .arch-table th, body.dark-theme #todo-archive .arch-table td{ border-color:#1f2937 }
      #todo-archive .arch-table tr:last-child td{ border-bottom:none }
      #todo-archive .arch-label{ display:inline-block; width:12px; height:12px; border-radius:999px; margin-right:6px; vertical-align:-2px; }
      #todo-archive .arch-empty{ color:var(--muted); text-align:center; padding:12px }
      #todo-archive .arch-table td.desc{ white-space:pre-line; word-break:break-word; }
    </style>

    <div class="arch-header">
      <h3>Completed History</h3>
      ${
        isAdmin
          ? `<button id="kb-archive-clear" class="btn gray" type="button" style="background-color:#d91c42ff">🗑️ Delete History</button>`
          : ``
      }
    </div>

    <table class="arch-table">
      <thead>
        <tr>
          <th>Card Name</th>
          <th>Label</th>
          <th>Deadline</th>
          <th>Completed</th>
          <th>Job Description</th>
        </tr>
      </thead>
      <tbody id="kb-archive-body"></tbody>
    </table>
  </section>
  `;
}

export function setupTodoEvents() {
  const board = document.querySelector("#kb-board");
  const stats = document.querySelector("#kb-stats");
  const detail = document.querySelector("#kb-detail");
  const detailTitle = document.querySelector("#detail-title");
  const detailDesc = document.querySelector("#detail-desc");
  const detailLabel = document.querySelector("#detail-label");
  const detailDue = document.querySelector("#detail-due");
  const detailCmtInput = document.querySelector("#detail-cmt-input");
  const detailActivity = document.querySelector("#detail-activity");
  const archBody = document.querySelector("#kb-archive-body");

  if (!board) {
    console.error("[kanban] Chưa renderTodoPage() trước khi setupTodoEvents()");
    return;
  }

  /* ====== CONFIG API & SOCKET (địa chỉ máy: http://10.100.201.25:4000) ====== */
  const BOARD_ID = window.KB_BOARD_ID || "default";
  const API_ORIGIN = window.API_ORIGIN || "http://10.100.201.25:4000";
  const API = {
    cards: `${API_ORIGIN}/api/kanban/cards`,
    comments: `${API_ORIGIN}/api/kanban/comments`,
  };

  // Socket.IO client (đảm bảo <script src="https://cdn.socket.io/4.7.5/socket.io.min.js"></script>)
  const socket = window.io
    ? window.io(API_ORIGIN, { transports: ["websocket"] })
    : null;
  let MY_SID = null;
  if (socket) {
    socket.on("connect", () => {
      MY_SID = socket.id;
      socket.emit("join", { boardId: BOARD_ID });
    });
  }

  /* ====== QUYỀN (chỉ ảnh hưởng nút xoá thẻ / sửa mô tả) ====== */
  const IS_ADMIN = (() => {
    try {
      const raw =
        sessionStorage.getItem("user_info") ||
        localStorage.getItem("user_info");
      const role = (JSON.parse(raw || "{}").role || "")
        .toString()
        .toLowerCase();
      return role === "admin";
    } catch {
      return false;
    }
  })();

  /* ====== STATE ====== */
  let data = { todo: [], doing: [], done: [], archive: [] };
  let drag = {
    id: null,
    from: null,
    fromIndex: -1,
    overList: null,
    overIndex: -1,
  };
  let opened = { id: null, list: null };

  /* ====== HELPERS ====== */
  const esc = (s = "") =>
    s.replace(
      /[&<>"']/g,
      (m) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        }[m])
    );
  const fmtDate = (s) => (s ? new Date(s).toLocaleDateString() : "");
  const fmtDateTime = (s) => (s ? new Date(s).toLocaleString() : "");

  function currentUserName() {
    try {
      const raw =
        sessionStorage.getItem("user_info") ||
        localStorage.getItem("user_info");
      if (!raw) return "You";
      const u = JSON.parse(raw);
      const full = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
      return full || u.code || "You";
    } catch {
      return "You";
    }
  }
  function getCardRef(id) {
    for (const list of ["todo", "doing", "done"]) {
      const idx = data[list].findIndex((c) => c.id === id);
      if (idx > -1) return { list, idx, card: data[list][idx] };
    }
    return null;
  }

  /* ====== API CALLS (chỉ làm việc với giá trị card) ====== */
  async function apiGetBoard() {
    try {
      const res = await fetch(
        `${API.cards}?boardId=${encodeURIComponent(BOARD_ID)}`
      );
      if (!res.ok) throw new Error(await res.text());
      const j = await res.json();
      const cards = (j.data || []).map((x) => ({
        id: x.id || x._id,
        list: x.list || "todo",
        order: typeof x.order === "number" ? x.order : 0,
        title: x.title || "",
        label: x.label || "",
        due: x.due || "",
        desc: x.desc || "",
        comments: [], // load khi mở chi tiết
      }));
      return {
        todo: cards
          .filter((c) => c.list === "todo")
          .sort((a, b) => a.order - b.order),
        doing: cards
          .filter((c) => c.list === "doing")
          .sort((a, b) => a.order - b.order),
        done: cards
          .filter((c) => c.list === "done")
          .sort((a, b) => a.order - b.order),
        archive: [], // client-only
      };
    } catch (e) {
      console.warn("[kanban] load cards error:", e);
      return { todo: [], doing: [], done: [], archive: [] };
    }
  }
  async function apiCreateCard(listName, payload) {
    const res = await fetch(API.cards, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ boardId: BOARD_ID, list: listName, ...payload }),
    });
    const j = await res.json();
    if (!res.ok || !j.ok) throw new Error(j.message || "create failed");
    return j.data; // mongo doc
  }
  async function apiUpdateCard(id, fields) {
    const res = await fetch(`${API.cards}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    const j = await res.json();
    if (!res.ok || !j.ok) throw new Error(j.message || "update failed");
    return j.data;
  }
  async function apiMoveCard(id, list, order) {
    const res = await fetch(`${API.cards}/${id}/move`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ boardId: BOARD_ID, list, order }),
    });
    const j = await res.json();
    if (!res.ok || !j.ok) throw new Error(j.message || "move failed");
    return j.data;
  }
  async function apiDeleteCard(id) {
    const res = await fetch(`${API.cards}/${id}`, { method: "DELETE" });
    const j = await res.json();
    if (!res.ok || !j.ok) throw new Error(j.message || "delete failed");
  }

  // re-index cả list sau khi thả để thứ tự bền vững khi reload
  async function apiBulkReorder(listName) {
    const items = data[listName];
    await Promise.all(items.map((c, idx) => apiMoveCard(c.id, listName, idx)));
  }

  /* ====== SOCKET: COMMENTS realtime ====== */
  if (socket) {
    socket.on("comment:added", ({ boardId, cardId, comment }) => {
      if (boardId !== BOARD_ID) return;
      const ref = getCardRef(cardId);
      if (!ref) return;
      (ref.card.comments ||= []).unshift(comment);
      if (opened.id === cardId) fillDetail(cardId);
    });
    socket.on("comment:removed", ({ boardId, cardId, cid }) => {
      if (boardId !== BOARD_ID) return;
      const ref = getCardRef(cardId);
      if (!ref || !ref.card.comments) return;
      const idx = ref.card.comments.findIndex((c) => c.cid === cid);
      if (idx > -1) ref.card.comments.splice(idx, 1);
      if (opened.id === cardId) fillDetail(cardId);
    });
  }

  /* ====== RENDER ARCHIVE (client-only) ====== */
  function renderArchive() {
    if (!archBody) return;
    const rows = (data.archive || [])
      .map(
        (a) => `
        <tr>
          <td>${esc(a.title || "")}</td>
          <td>${
            a.label
              ? `<span class="arch-label" style="background:${a.label}"></span>`
              : ""
          }</td>
          <td>${a.due ? esc(a.due) : ""}</td>
          <td>${a.completedAt ? esc(fmtDateTime(a.completedAt)) : ""}</td>
          <td class="desc">${esc(a.desc || "")}</td>
        </tr>`
      )
      .join("");
    archBody.innerHTML =
      rows || `<tr><td class="arch-empty" colspan="5">Empty.</td></tr>`;
  }

  /* ====== RENDER BOARD ====== */
  function render() {
    const total = data.todo.length + data.doing.length + data.done.length;
    if (stats)
      stats.textContent = `Summary: ${total} | To-do: ${data.todo.length} • Doing: ${data.doing.length} • Done: ${data.done.length}`;

    ["todo", "doing", "done"].forEach((listName) => {
      const cardsEl = board.querySelector(`[data-cards="${listName}"]`);
      const countEl = board.querySelector(`[data-count="${listName}"]`);
      const items = data[listName];
      if (countEl) countEl.textContent = `(${items.length})`;

      if (cardsEl) {
        cardsEl.innerHTML = items
          .map((card, idx) => {
            const bgColor = card.label || "#7c7f7d";
            return `
            <div class="card-item" draggable="true"
                 data-id="${card.id}" data-index="${idx}"
                 style="background-color:${bgColor}">
              <div class="card-title">${esc(card.title)}</div>
              ${
                IS_ADMIN
                  ? `<div class="card-del" data-del="1" title="delete">✖</div>`
                  : ``
              }
            </div>`;
          })
          .join("");

        Array.from(cardsEl.querySelectorAll(".card-item")).forEach((el) => {
          const id = el.getAttribute("data-id");
          const index = Number(el.getAttribute("data-index"));

          el.addEventListener("click", (e) => {
            if (e.target.closest(".card-del")) return;
            openDetail(id);
          });

          if (IS_ADMIN) {
            el.querySelector(".card-del")?.addEventListener(
              "click",
              async (e) => {
                e.stopPropagation();
                await apiDeleteCard(id);
                // xoá ở client state
                for (const k of ["todo", "doing", "done"]) {
                  const i = data[k].findIndex((c) => c.id === id);
                  if (i > -1) data[k].splice(i, 1);
                }
                if (opened.id === id) closeDetail();
                render();
              }
            );
          }

          // DRAG cho mọi user
          el.addEventListener("dragstart", (e) => {
            drag = {
              id,
              from: listName,
              fromIndex: index,
              overList: listName,
              overIndex: index,
            };
            e.dataTransfer.setData("text/plain", id);
            e.dataTransfer.effectAllowed = "move";
            el.classList.add("ghost");
          });
          el.addEventListener("dragend", () => {
            el.classList.remove("ghost");
            cleanupPlaceholders();
          });
        });

        cardsEl.addEventListener("dragover", (e) => {
          e.preventDefault();
          if (!drag.id) return;
          const after = getDragAfterElement(cardsEl, e.clientY);
          insertPlaceholder(cardsEl, after);
          drag.overList = listName;
          drag.overIndex = computeTargetIndex(cardsEl, after);
        });
        cardsEl.addEventListener("drop", async () => {
          if (!drag.id) return;
          moveTo(listName, drag.overIndex);
          const moved = getCardRef(drag.id);
          // cập nhật DB: set list & order
          await apiMoveCard(drag.id, listName, drag.overIndex);
          await apiBulkReorder(listName); // đảm bảo thứ tự bền vững
          drag = {
            id: null,
            from: null,
            fromIndex: -1,
            overList: null,
            overIndex: -1,
          };
          render();
        });
      }
    });

    if (opened.id) fillDetail(opened.id);
    renderArchive();
  }

  /* ===== Composer (admin only) ===== */
  if (IS_ADMIN) {
    board.addEventListener("click", async (e) => {
      const box = e.target.closest("[data-composer]");
      if (!box) return;
      const listName = box.getAttribute("data-composer");
      const ta = box.querySelector("textarea");
      const label = box.querySelector(`[data-label="${listName}"]`);
      const due = box.querySelector(`[data-due="${listName}"]`);

      const open = () => {
        box.classList.remove("collapsed");
        ta?.focus();
      };
      const close = () => {
        box.classList.add("collapsed");
        if (ta) ta.value = "";
        if (label) label.value = "";
        if (due) due.value = "";
      };

      if (
        e.target.closest(".composer-toggle") ||
        (box.classList.contains("collapsed") &&
          !e.target.closest(".composer-actions"))
      ) {
        open();
        return;
      }
      if (e.target.closest(`[data-cancel="${listName}"]`)) {
        close();
        return;
      }

      if (e.target.closest(`[data-add="${listName}"]`)) {
        const title = (ta?.value || "").trim();
        if (!title) {
          ta?.focus();
          return;
        }
        const dueVal = (due?.value || "").slice(0, 10) || "";
        const payload = {
          title,
          label: label?.value || "",
          due: due?.value || "",
          desc: "",
        };
        const created = await apiCreateCard(listName, payload);
        data[listName].unshift({
          id: created.id || created._id,
          list: created.list,
          order: created.order ?? 0,
          title: created.title,
          label: created.label,
          due: created.due || "",
          desc: created.desc,
          comments: [],
        });
        close();
        render();
        return;
      }
    });

    board.addEventListener("keydown", (e) => {
      const ta = e.target.closest("[data-composer] textarea");
      if (!ta) return;
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey))
        ta.closest("[data-composer]")?.querySelector("[data-add]")?.click();
      if (e.key === "Escape") {
        const box = ta.closest("[data-composer]");
        const listName = box?.getAttribute("data-composer");
        if (listName) box.querySelector(`[data-cancel="${listName}"]`)?.click();
      }
    });
  }

  /* ===== Detail panel ===== */
  function openDetail(id) {
    opened = { id, list: getCardRef(id)?.list || null };
    fillDetail(id);
    detail.dataset.cardId = id;
    detail.classList.add("open");
    detail.setAttribute("aria-hidden", "false");
  }
  function closeDetail() {
    opened = { id: null, list: null };
    detail.classList.remove("open");
    detail.setAttribute("aria-hidden", "true");
  }

  async function ensureCommentsLoaded(cardId) {
    const ref = getCardRef(cardId);
    if (!ref) return;
    if (ref.card._cmtLoaded) return;
    try {
      const res = await fetch(`${API.comments}/${cardId}`);
      const j = await res.json();
      ref.card.comments = (j.data || []).map((c) => ({
        cid: c.cid || c._id,
        author: c.author || "Guest",
        text: c.text || "",
        ts: c.ts,
        sid: c.sid, // nếu server có gửi
      }));
      ref.card._cmtLoaded = true;
    } catch (e) {
      console.warn("[comments] load error:", e);
      ref.card.comments ||= [];
    }
  }

  async function fillDetail(id) {
    const ref = getCardRef(id);
    if (!ref) return;
    const c = ref.card;
    await ensureCommentsLoaded(id);

    detail.dataset.cardId = id;
    detailTitle.value = c.title || "";
    detailDesc.value = c.desc || "";
    detailLabel.value = c.label || "";
    detailDue.value = (c.due || "").slice(0, 10);

    detailActivity.innerHTML = (c.comments || [])
      .map((cm) => {
        const canDel = (cm.sid && MY_SID && cm.sid === MY_SID) || false; // server nên gửi sid
        const delBtn = canDel
          ? `<button class="cmt-dot" data-cmt-del="${esc(
              cm.cid
            )}" title="Delete"></button>`
          : "";
        return `
        <div class="item" data-cmt-id="${esc(cm.cid)}">
          <div style="display:flex;align-items:center;gap:8px;">
            <b>${esc(cm.author || "Guest")}</b>
            <span style="opacity:.7">${new Date(cm.ts).toLocaleString()}</span>
            <span style="margin-left:auto; position:relative;">${delBtn}</span>
          </div>
          <div style="white-space:pre-wrap">${esc(cm.text)}</div>
        </div>`;
      })
      .join("");
  }

  document
    .querySelector("#detail-close")
    ?.addEventListener("click", closeDetail);
  detail.addEventListener("click", (e) => {
    if (e.target.hasAttribute("data-detail-close")) closeDetail();
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && detail.classList.contains("open")) closeDetail();
  });

  // Ghi dữ liệu: admin-only với title/desc/label/due → cập nhật DB
  detailTitle.addEventListener("blur", async () => {
    if (!IS_ADMIN) return;
    const id = detail.dataset.cardId;
    const ref = getCardRef(id);
    if (!ref) return;
    const v = (detailTitle.value || "").trim();
    if (!v) return;
    ref.card.title = v;
    await apiUpdateCard(id, { title: v });
    render();
  });
  detailDesc.addEventListener("blur", async () => {
    if (!IS_ADMIN) return;
    const id = detail.dataset.cardId;
    const ref = getCardRef(id);
    if (!ref) return;
    ref.card.desc = detailDesc.value || "";
    await apiUpdateCard(id, { desc: ref.card.desc });
  });
  detailLabel.addEventListener("change", async () => {
    if (!IS_ADMIN) return;
    const id = detail.dataset.cardId;
    const ref = getCardRef(id);
    if (!ref) return;
    ref.card.label = detailLabel.value || "";
    await apiUpdateCard(id, { label: ref.card.label });
    render();
  });
  detailDue.addEventListener("change", async () => {
    if (!IS_ADMIN) return;
    const id = detail.dataset.cardId;
    const ref = getCardRef(id);
    if (!ref) return;
    const ymd = (detailDue.value || "").slice(0, 10) || null;
    ref.card.due = ymd || "";
    await apiUpdateCard(id, { due: ymd });
    render();
  });

  // === COMMENT: mọi người có thể comment (server gắn cid/ts/author/sid) ===
  detailCmtInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const text = (detailCmtInput.value || "").trim();
      if (!text || !socket) return;
      const cardId = detail.dataset.cardId;
      socket.emit("comment:add", { boardId: BOARD_ID, cardId, text }, () => {});
      detailCmtInput.value = "";
    }
  });
  // XÓA bình luận — server kiểm tra quyền bằng socket.id
  detailActivity.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-cmt-del]");
    if (!btn || !socket) return;
    const cid = btn.getAttribute("data-cmt-del");
    const cardId = detail.dataset.cardId;
    socket.emit("comment:remove", { boardId: BOARD_ID, cardId, cid }, () => {});
  });

  /* ===== Drag helpers ===== */
  function cleanupPlaceholders() {
    document
      .querySelectorAll("#kb-board .placeholder")
      .forEach((p) => p.remove());
  }
  function getDragAfterElement(container, y) {
    const els = Array.from(
      container.querySelectorAll(".card-item:not(.ghost)")
    );
    let closest = { offset: Number.NEGATIVE_INFINITY, element: null };
    for (const child of els) {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset)
        closest = { offset, element: child };
    }
    return closest.element;
  }
  function insertPlaceholder(container, beforeEl) {
    let ph = container.querySelector(".placeholder");
    if (!ph) {
      ph = document.createElement("div");
      ph.className = "placeholder";
    }
    if (beforeEl == null) container.appendChild(ph);
    else container.insertBefore(ph, beforeEl);
  }
  function computeTargetIndex(container, beforeEl) {
    const items = Array.from(container.querySelectorAll(".card-item"));
    if (!beforeEl) return items.length;
    return items.indexOf(beforeEl);
  }
  function moveTo(targetList, targetIndex) {
    const fromArr = data[drag.from];
    const idx = fromArr.findIndex((c) => c.id === drag.id);
    if (idx === -1) return;
    const [card] = fromArr.splice(idx, 1);
    const toArr = data[targetList];
    const insertAt =
      drag.from === targetList && idx < targetIndex
        ? targetIndex - 1
        : targetIndex;
    toArr.splice(Math.max(0, Math.min(insertAt, toArr.length)), 0, card);
    cleanupPlaceholders();
  }

  /* ===== Clear buttons (admin only) ===== */
  if (IS_ADMIN) {
    document
      .querySelector("#kb-clear-done")
      ?.addEventListener("click", async () => {
        if (!data.done.length) return;
        if (!confirm("Move completed cards to history and delete from board?"))
          return;
        const now = Date.now();
        data.archive ||= [];
        for (const c of data.done) {
          data.archive.unshift({
            id: c.id,
            title: c.title,
            label: c.label || "",
            due: c.due || "",
            desc: c.desc || "",
            completedAt: now,
          });
          await apiDeleteCard(c.id); // xóa khỏi DB
        }
        data.done = [];
        render();
      });

    document
      .querySelector("#kb-clear-all")
      ?.addEventListener("click", async () => {
        if (!(data.todo.length || data.doing.length || data.done.length))
          return;
        if (!confirm("Delete all the cards on board?")) return;
        const all = [...data.todo, ...data.doing, ...data.done];
        await Promise.all(all.map((c) => apiDeleteCard(c.id)));
        data = { todo: [], doing: [], done: [], archive: data.archive || [] };
        closeDetail();
        render();
      });

    document
      .querySelector("#kb-archive-clear")
      ?.addEventListener("click", () => {
        if (!data.archive?.length) return;
        if (!confirm("Delete all completed history?")) return;
        data.archive = []; // history chỉ lưu client
        renderArchive();
      });
  }

  /* ===== INITIAL LOAD ===== */
  (async () => {
    data = await apiGetBoard();
    render();
  })();
}

/* ------------------------ END TO-DO (TRELLO-LIKE) ------------------------ */
