// pages/login.js
import { navigate } from "../router.js";
import { login, register } from "../services/auth.service.js";

/** ====== CẤU HÌNH API BACKEND ====== */
const API_BASE = "http://10.100.201.25:4000/api"; // đổi theo môi trường của bạn

/** ====== HTML VIEW GỘP LOGIN + REGISTER + FORGOT ====== */
export function renderLogin() {
  return renderAuth("login");
}

export function renderRegister() {
  return renderAuth("register");
}

function renderAuth(initialTab = "login") {
  const isRegister = initialTab === "register";
  const isForgot = initialTab === "forgot";
  const captcha = generateCaptcha();
  sessionStorage.setItem("captcha_code", captcha);

  return `
    <section class="login-bg">
      <div class="login-glass">
        <!-- LOGIN FORM -->
        <form id="login-form" style="${
          isRegister || isForgot ? "display:none" : ""
        }">
          <h1>Login</h1>
          <label class="field-label" for="login-username">Employee Code</label>
          <div class="input-ico">
            <span class="i-mail"></span>
            <input id="login-username" type="text" placeholder="VT0XXXXX" required autofocus />
          </div>
          <label class="field-label" for="login-password">Password</label>
          <div class="input-ico">
            <span class="i-lock"></span>
            <input id="login-password" type="password" placeholder="••••••••" required />
            <button class="eye" type="button" id="toggle-eye" aria-label="Show password">
              <span id="eye-ico" class="i-eye"></span>
            </button>
          </div>
          <div class="login-row">
            <label class="chk">
              <input id="remember" type="checkbox" />
              <span>Remember me</span>
            </label>
            <a class="link" href="javascript:void(0)" id="forgot-link">Forgot Password?</a>
          </div>
          <button class="btn login-primary" id="btn-login" type="submit">Login</button>
          <p id="login-error" class="error-msg" style="display:none;margin-top:8px"></p>
          <p class="muted small mt8">
            Don’t have account?
            <a class="link" href="javascript:void(0)" id="switch-to-register">Register</a>
          </p>
        </form>

        <!-- REGISTER FORM -->
        <form id="reg-form" style="${isRegister ? "" : "display:none"}">
          <h1>Register</h1>
          <label class="field-label" for="reg-code">Employee Code</label>
          <div class="input-ico">
            <span class="i-mail"></span>
            <input id="reg-code" type="text" placeholder="VT0XXXXX" required autofocus />
          </div>
          <label class="field-label" for="reg-password">Password</label>
          <div class="input-ico">
            <span class="i-lock"></span>
            <input id="reg-password" type="password" placeholder="••••••••" required />
          </div>
          <label class="field-label" for="reg-confirm">Confirm Password</label>
          <div class="input-ico">
            <span class="i-lock"></span>
            <input id="reg-confirm" type="password" placeholder="••••••••" required />
          </div>
          <label class="field-label" for="reg-firstname">First Name</label>
          <div class="input-ico">
            <span class="i-user"></span>
            <input id="reg-firstname" type="text" placeholder="Nguyen" required />
          </div>
          <label class="field-label" for="reg-lastname">Last Name</label>
          <div class="input-ico">
            <span class="i-user"></span>
            <input id="reg-lastname" type="text" placeholder="Van A" required />
          </div>
          <label class="field-label" for="reg-captcha-input">Enter Verification Code</label>
          <div style="display:flex;align-items:center;gap:12px;">
            <div class="input-ico" style="flex:1;">
              <span class="i-shield"></span>
              <input id="reg-captcha-input" type="text" placeholder="Enter code" required />
            </div>
            <span id="captcha-code" class="captcha-code" style="color:white;">${captcha}</span>
            <button type="button" id="refresh-captcha" class="btn small">↻</button>
          </div>
          <p id="reg-error" class="error-msg" style="display:none;color:red;"></p>
          <button class="btn login-primary" id="btn-register" type="submit">Create account</button>
          <p class="muted small mt8">
            Already have account?
            <a class="link" href="javascript:void(0)" id="switch-to-login">Login</a>
          </p>
        </form>

        <!-- FORGOT PASSWORD FORM -->
        <form id="forgot-form" style="${isForgot ? "" : "display:none"}">
          <h1>Reset Password</h1>
          <label class="field-label" for="fp-code">Employee Code</label>
          <div class="input-ico">
            <span class="i-mail"></span>
            <input id="fp-code" type="text" placeholder="VT0XXXXX" required />
          </div>
          <div style="display:flex; gap:10px; align-items:flex-end;">
            <div style="flex:1;">
              <label class="field-label" for="fp-otp">OTP (check admin email)</label>
              <div style="display:flex; gap:10px;">
                <div style="flex:1;">
                  <div class="input-ico">
                    <span class="i-shield"></span>
                    <input id="fp-otp" type="text" placeholder="6-digit OTP" required />
                  </div>
                </div>
                <button type="button" id="btn-send-otp" class="btn login-primary" style="width:auto; padding:10px 16px">
                  Send OTP
                </button>
              </div>
            </div>
          </div>
          <label class="field-label" for="fp-pass">New Password</label>
          <div class="input-ico">
            <span class="i-lock"></span>
            <input id="fp-pass" type="password" placeholder="••••••••" required />
          </div>
          <label class="field-label" for="fp-confirm">Confirm New Password</label>
          <div class="input-ico">
            <span class="i-lock"></span>
            <input id="fp-confirm" type="password" placeholder="••••••••" required />
          </div>
          <p id="fp-error" class="error-msg" style="display:none"></p>
          <p id="fp-ok" class="small" style="display:none;color:#d1fae5;">OTP sent. Please check with admin.</p>
          <button class="btn login-primary" id="btn-reset" type="submit">Reset Password</button>
          <p class="muted small mt8">
            Back to
            <a class="link" href="javascript:void(0)" id="back-login">Login</a>
          </p>
        </form>
      </div>
    </section>
  `;
}

/** ====== BIND SỰ KIỆN CHO VIEW GỘP ====== */
export function bindLoginEvents() {
  const initial =
    location.hash === "#/register"
      ? "register"
      : location.hash === "#/forgot"
      ? "forgot"
      : "login";
  bindAuthEvents(initial);
}

export function bindRegisterEvents() {
  bindAuthEvents("register");
}

function bindAuthEvents(initialTab = "login") {
  const loginForm = document.getElementById("login-form");
  const regForm = document.getElementById("reg-form");
  const forgotForm = document.getElementById("forgot-form");

  const showLogin = () => {
    loginForm.style.display = "";
    regForm.style.display = "none";
    forgotForm.style.display = "none";
    if (location.hash !== "#/login") navigate("/login");
    document.getElementById("login-username")?.focus();
  };

  const showRegister = () => {
    loginForm.style.display = "none";
    regForm.style.display = "";
    forgotForm.style.display = "none";
    if (location.hash !== "#/register") navigate("/register");
    document.getElementById("reg-code")?.focus();
  };

  const showForgot = () => {
    loginForm.style.display = "none";
    regForm.style.display = "none";
    forgotForm.style.display = "";
    if (location.hash !== "#/forgot") navigate("/forgot");
    document.getElementById("fp-code")?.focus();
  };

  document.getElementById("forgot-link")?.addEventListener("click", showForgot);
  document.getElementById("back-login")?.addEventListener("click", showLogin);
  document
    .getElementById("switch-to-register")
    ?.addEventListener("click", showRegister);
  document
    .getElementById("switch-to-login")
    ?.addEventListener("click", showLogin);

  if (initialTab === "register") showRegister();
  else if (initialTab === "forgot") showForgot();
  else showLogin();

  /** ---- LOGIN handlers ---- */
  const uEl = document.getElementById("login-username");
  const pEl = document.getElementById("login-password");
  const errLogin = document.getElementById("login-error");
  const btnLogin = document.getElementById("btn-login");

  document.getElementById("toggle-eye")?.addEventListener("click", () => {
    const ico = document.getElementById("eye-ico");
    const isPwd = pEl.type === "password";
    pEl.type = isPwd ? "text" : "password";
    ico.className = isPwd ? "i-eye-off" : "i-eye";
    const btn = document.getElementById("toggle-eye");
    btn.setAttribute("aria-label", isPwd ? "Hide password" : "Show password");
  });

  const hideLoginError = () => (errLogin.style.display = "none");
  uEl?.addEventListener("input", hideLoginError);
  pEl?.addEventListener("input", hideLoginError);

  loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const code = uEl.value.trim();
    const password = pEl.value;
    const remember = document.getElementById("remember")?.checked;

    if (!code || !password) return;

    try {
      setLoading(btnLogin, true);
      const res = await login(code, password);
      saveTokens(res.accessToken, res.refreshToken, remember);
      const userInfo = {
        code: res.user.code,
        firstName: res.user.firstName,
        lastName: res.user.lastName,
      };
      const storage = remember ? localStorage : sessionStorage;
      storage.setItem("user_info", JSON.stringify(userInfo));

      document.body.classList.remove("no-chrome");
      location.reload();
    } catch (err) {
      errLogin.textContent = getErrMsg(
        err,
        "Wrong username or password. Try again or click to Forgot password to reset it."
      );
      errLogin.style.display = "block";
    } finally {
      setLoading(btnLogin, false);
    }
  });

  /** ---- REGISTER handlers ---- */
  const errReg = document.getElementById("reg-error");
  const btnReg = document.getElementById("btn-register");

  const hideRegError = () => (errReg.style.display = "none");
  regForm?.addEventListener("input", hideRegError);

  const regen = () => {
    const code = generateCaptcha();
    sessionStorage.setItem("captcha_code", code);
    const span = document.getElementById("captcha-code");
    if (span) span.textContent = code;
  };
  document.getElementById("refresh-captcha")?.addEventListener("click", regen);

  regForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const code = document.getElementById("reg-code").value.trim();
    const password = document.getElementById("reg-password").value;
    const confirm = document.getElementById("reg-confirm").value;
    const firstName = document.getElementById("reg-firstname").value.trim();
    const lastName = document.getElementById("reg-lastname").value.trim();
    const inputCaptcha = document
      .getElementById("reg-captcha-input")
      .value.trim()
      .toUpperCase();
    const realCaptcha = (
      sessionStorage.getItem("captcha_code") || ""
    ).toUpperCase();

    if (password !== confirm) {
      errReg.textContent = "Confirm password is not correct.";
      errReg.style.display = "block";
      return;
    }
    if (!realCaptcha || inputCaptcha !== realCaptcha) {
      errReg.textContent = "Wrong Captcha.";
      errReg.style.display = "block";
      regen();
      return;
    }

    try {
      setLoading(btnReg, true);
      const res = await register({ code, password, firstName, lastName });
      saveTokens(res.accessToken, res.refreshToken, true);
      navigate("/info/air");
    } catch (err) {
      errReg.textContent = getErrMsg(
        err,
        "Registration failed. Please try again."
      );
      errReg.style.display = "block";
      regen();
    } finally {
      setLoading(btnReg, false);
    }
  });

  /** ---- FORGOT handlers ---- */
  const codeEl = document.getElementById("fp-code");
  const otpEl = document.getElementById("fp-otp");
  const passEl = document.getElementById("fp-pass");
  const confirmEl = document.getElementById("fp-confirm");
  const errFp = document.getElementById("fp-error");
  const okFp = document.getElementById("fp-ok");
  const btnSendOtp = document.getElementById("btn-send-otp");
  const btnReset = document.getElementById("btn-reset");

  const clearFP = () => {
    errFp.style.display = "none";
    okFp.style.display = "none";
  };
  forgotForm?.addEventListener("input", clearFP);

  // Gửi OTP (đi tới email admin cố định)
  btnSendOtp?.addEventListener("click", async () => {
    clearFP();
    const code = codeEl.value.trim();
    if (!code) return;
    try {
      setLoading(btnSendOtp, true);
      const r = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (!r.ok) throw new Error((await r.json()).message || "Send OTP failed");
      okFp.textContent = "OTP sent. Please check with admin.";
      okFp.style.display = "block";
      otpEl.focus();
    } catch (e) {
      errFp.textContent = e.message || "Send OTP failed";
      errFp.style.display = "block";
    } finally {
      setLoading(btnSendOtp, false);
    }
  });

  // Reset mật khẩu bằng OTP
  forgotForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearFP();
    const code = codeEl.value.trim();
    const otp = otpEl.value.trim();
    const p1 = passEl.value;
    const p2 = confirmEl.value;

    if (!code || !otp || !p1) {
      errFp.textContent = "Missing Informations.";
      errFp.style.display = "block";
      return;
    }
    if (p1 !== p2) {
      errFp.textContent = "Confirm password is not correct.";
      errFp.style.display = "block";
      return;
    }
    try {
      setLoading(btnReset, true);
      const r = await fetch(`${API_BASE}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, otp, newPassword: p1 }),
      });
      if (!r.ok) throw new Error((await r.json()).message || "Reset failed");
      alert("Reset password successfully. You can login with new password.");
      showLogin();
    } catch (e) {
      errFp.textContent = e.message || "Reset password failed.";
      errFp.style.display = "block";
    } finally {
      setLoading(btnReset, false);
    }
  });
}

/** ====== TIỆN ÍCH GỌI API & TOKEN ====== */
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

function saveTokens(accessToken, refreshToken, remember) {
  const storage = remember ? localStorage : sessionStorage;
  storage.setItem("auth_token", accessToken);
  storage.setItem("refresh_token", refreshToken);
  const other = remember ? sessionStorage : localStorage;
  other.removeItem("auth_token");
  other.removeItem("refresh_token");
}

function setLoading(btn, isLoading) {
  if (!btn) return;
  btn.disabled = isLoading;
  btn.dataset.originalText ??= btn.textContent;
  btn.textContent = isLoading ? "Processing..." : btn.dataset.originalText;
}

function getErrMsg(err, fallback) {
  if (err?.status === 401)
    return "Wrong username or password. Try again or click to Forgot password to reset it.";
  if (err?.status === 409) return "Employee code already exists.";
  return err?.message || fallback;
}

/** ====== CAPTCHA (DEMO UI) ====== */
function generateCaptcha() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 6; i++)
    result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}
