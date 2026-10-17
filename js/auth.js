// ログイン・ログアウト（アカウントは管理者が「アカウント管理」で作る）
// ※ 現在はブラウザ内（localStorage）だけで完結する仮の認証。
//   API ができたら、ログイン・ログアウトはサーバーに問い合わせる形に差し替える。
import { save, state } from "./state.js";
import { $, daysUntil, esc, notify, nowString } from "./helpers.js";
import { ROLE_LABELS } from "./constants.js";

const SESSION_KEY = "licenseManagerUserId";
const EMAIL_KEY = "passhubSavedEmail"; // 「メールアドレスを保存する」で覚えておくメールアドレス

// ログイン中のユーザー（sessionStorage に user id を保存し、users から探す）
// 無効にされたアカウントはログインしていない扱いにする
export const currentUser = () =>
  state.users.find(
    (user) => user.id === Number(sessionStorage.getItem(SESSION_KEY)) && user.status !== "inactive",
  ) || null;
export const isAdmin = () => currentUser()?.role === "admin";

const isDevHost = () => ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);

export function updateAuthView() {
  const user = currentUser();
  $("#loginScreen").hidden = Boolean(user);
  $("#appLayout").hidden = !user;
  document.body.classList.toggle("is-admin", isAdmin());
  const initial = user ? esc([...user.name.trim()][0] ?? "?") : "";
  $("#currentUser").innerHTML = user
    ? `<span class="avatar" aria-hidden="true">${initial}</span>` +
      `<span>${esc(user.name)}<small>${esc(ROLE_LABELS[user.role] ?? user.role)}</small></span>`
    : "";
  $("#userButton")?.setAttribute("aria-label", user ? `${user.name}のアカウントメニュー` : "アカウントメニュー");
  // メニューの上部：名前・メールアドレス・権限
  if ($("#userMenuHead")) {
    $("#userMenuHead").innerHTML = user
      ? `<span class="avatar large" aria-hidden="true">${initial}</span>` +
        `<div><strong>${esc(user.name)}</strong><small>${esc(user.email)}</small>` +
        `<span class="role-tag role-${esc(user.role)}">${esc(ROLE_LABELS[user.role] ?? user.role)}</span></div>`
      : "";
  }
  if (!user) ($("#loginEmail")?.value ? $("#loginPassword") : $("#loginEmail"))?.focus();
}

function showLoginError(message) {
  const element = $("#loginError");
  element.textContent = message;
  element.hidden = !message;
}

// ログイン画面の初期表示：初期アカウントのヒントは、開発環境（localhost）でだけ出す
export function initLoginForm() {
  const hint = $("#loginHint");
  hint.textContent = "開発用の初期管理者: admin@example.jp / demo1234";
  hint.hidden = !isDevHost();
  showLoginError("");
  // 前回保存したメールアドレスを入れておく（プライベートブラウズなどで読めなくても止まらないように）
  try {
    const saved = localStorage.getItem(EMAIL_KEY);
    if (saved) {
      $("#loginEmail").value = saved;
      $("#rememberEmail").checked = true;
    }
  } catch {}
}

function login(email, password) {
  if (!email || !password) return showLoginError("メールアドレスとパスワードを入力してください。");
  const user = state.users.find((item) => item.email === email);
  if (!user || user.password !== password) {
    return showLoginError("メールアドレスまたはパスワードが違います。");
  }
  if (user.status === "inactive") {
    return showLoginError("このアカウントは無効になっています。管理者に連絡してください。");
  }

  // ログインできたときだけ保存する（チェックを外したら消す）
  try {
    if ($("#rememberEmail").checked) localStorage.setItem(EMAIL_KEY, email);
    else localStorage.removeItem(EMAIL_KEY);
  } catch {}

  user.lastLoginAt = nowString();
  save();
  sessionStorage.setItem(SESSION_KEY, String(user.id));
  $("#loginPassword").value = "";
  showLoginError("");
  updateAuthView();
  document.dispatchEvent(new CustomEvent("passhub:login"));

  // ログイン直後に、更新期限を過ぎたライセンスがあれば一緒に知らせる
  const expired = state.licenses.some(
    (license) => license.status === "active" && daysUntil(license.renewal) < 0,
  );
  notify(
    expired
      ? `${user.name} としてログインしました。更新期限を過ぎたライセンスがあります。確認してください。`
      : `${user.name} としてログインしました`,
    expired,
  );
}

// 送信中はボタンを押せなくして「ログイン中…」を出す（API につないだあとの待ち時間用）
$("#loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = $("#loginForm .login-button");
  if (button.disabled) return; // 二重送信を防ぐ
  const email = $("#loginEmail").value.trim().toLowerCase();
  const password = $("#loginPassword").value;
  button.disabled = true;
  button.classList.add("is-busy");
  button.textContent = "ログイン中…";
  try {
    await login(email, password);
  } finally {
    button.disabled = false;
    button.classList.remove("is-busy");
    button.textContent = "ログイン";
  }
});

// パスワードの表示／非表示（ログインと新規登録の両方。aria-controls の欄を切り替える）
document.querySelectorAll(".password-toggle").forEach((button) =>
  button.addEventListener("click", () => {
    const input = document.getElementById(button.getAttribute("aria-controls"));
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    button.textContent = show ? "隠す" : "表示";
    button.setAttribute("aria-pressed", String(show));
    input.focus();
  }),
);

// Caps Lock がオンのときに警告を出す
export function watchCapsLock(input, warning) {
  const update = (event) => {
    if (typeof event.getModifierState !== "function") return;
    warning.hidden = !event.getModifierState("CapsLock");
  };
  input.addEventListener("keydown", update);
  input.addEventListener("keyup", update);
  input.addEventListener("blur", () => (warning.hidden = true));
}
watchCapsLock($("#loginPassword"), $("#capsLockWarning"));

// ログアウトは画面を読み込み直して、開いていたダイアログや入力内容をすべて消す
$("#logoutButton").addEventListener("click", () => {
  sessionStorage.removeItem(SESSION_KEY);
  location.reload();
});
