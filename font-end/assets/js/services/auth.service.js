//auth.service.js
const API_BASE = "http://10.100.201.25:4000/api";

async function apiFetch(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: opts.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
    body: opts.body,
  });
  if (!res.ok) {
    let msg = "Request failed";
    try {
      const data = await res.json();
      msg = data?.message || msg;
    } catch {}
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export async function login(code, password) {
  return apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ code, password }),
  });
}

export async function register({ code, password, firstName, lastName }) {
  return apiFetch("/auth/register", {
    method: "POST",
    body: JSON.stringify({ code, password, firstName, lastName }),
  });
}
