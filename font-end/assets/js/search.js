// assets/js/search.js
// Kết nối các tab với Global Search trên topbar

export function getCurrentGlobalQuery() {
  const el = document.getElementById("topbar-search");
  return el ? el.value ?? "" : "";
}

export function onGlobalSearch(onQuery, opts = {}) {
  const { immediate = true, filter, signal } = opts;

  const handler = (e) => {
    const q = e?.detail?.query ?? "";
    if (typeof filter === "function" && !filter(q)) return;
    onQuery(q);
  };

  window.addEventListener("search-query-changed", handler);

  if (immediate) {
    const q = getCurrentGlobalQuery();
    if (typeof filter !== "function" || filter(q)) onQuery(q);
  }

  const off = () => window.removeEventListener("search-query-changed", handler);

  if (signal) {
    if (signal.aborted) off();
    else signal.addEventListener("abort", off, { once: true });
  }

  return off;
}

export function emitGlobalSearch(q) {
  const el = document.getElementById("topbar-search");
  if (el && el.value !== q) el.value = q;
  window.dispatchEvent(
    new CustomEvent("search-query-changed", { detail: { query: q } })
  );
}
