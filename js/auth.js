// ログイン・アカウント登録・ログアウト（権限や有効・無効の切り替えは「アカウント管理」で行う）
// ※ 現在はブラウザ内（localStorage）だけで完結する仮の認証。
//   API ができたら、ログイン・登録・ログアウトはサーバーに問い合わせる形に差し替える。
import { nextId, save, state } from "./state.js";
import { $, daysUntil, esc, notify, nowString } from "./helpers.js";
import { ROLE_LABELS } from "./constants.js";

const SESSION_KEY = "licenseManagerUserId";
let authMode = "login";

// ログイン中のユーザー（sessionStorage に user id を保存し、users から探す）
// 無効にされたアカウントはログインしていない扱いにする
export const currentUser = () =>
  state.users.find(
    (user) => user.id === Number(sessionStorage.getItem(SESSION_KEY)) && user.status !== "inactive",
  ) || null;
export const isAdmin = () => currentUser()?.role === "admin";

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

// ログイン画面とアカウント登録を切り替える（同じフォームの表示を変えるだけ）
export function setAuthMode(mode) {
  authMode = mode;
  const registering = mode === "register";
  // HTML側に要素が無くてもエラーで止まらないように ?. を付けている
  $("#authTitle")?.replaceChildren(registering ? "アカウント登録" : "ログイン");
  $("#authDescription")?.replaceChildren(
    registering ? "usersテーブルに新しいアカウントを登録します。" : "登録済みのアカウントでログインしてください。",
  );
  if ($("#loginNameField")) $("#loginNameField").hidden = !registering;
  if ($("#loginName")) $("#loginName").required = registering;
  $("#loginPassword").autocomplete = registering ? "new-password" : "current-password";
  $("#loginForm .login-button").textContent = registering ? "アカウントを登録" : "ログイン";
  $("#registerToggle")?.replaceChildren(registering ? "ログイン画面に戻る" : "新しいアカウントを登録する");
  showLoginError("");
}

$("#loginForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const email = $("#loginEmail").value.trim().toLowerCase();
  const password = $("#loginPassword").value;

  // アカウント登録（今は画面だけで保存しない。誰でもアカウントを作れてしまうため。
  // API ができたら「申請 → 管理者が承認」の流れにする）
  if (authMode === "register") {
    const name = $("#loginName")?.value.trim() ?? "";
    if (!name) return notify("氏名を入力してください。", true);
    if (password.length < 8) return notify("パスワードは8文字以上で入力してください。", true);
    if (state.users.some((item) => item.email === email)) {
      return notify("このメールアドレスは既に登録されています。", true);
    }
    $("#loginPassword").value = "";
    setAuthMode("login");
    return notify("アカウント登録は準備中です。アカウントが必要な場合は、管理者に作成を依頼してください。");
  }

  // ログイン（users からメールアドレスで探してパスワードを照合）
  const user = state.users.find((item) => item.email === email);
  if (!user || user.password !== password) {
    return showLoginError("メールアドレスまたはパスワードが違います。");
  }
  if (user.status === "inactive") {
    return showLoginError("このアカウントは無効になっています。管理者に連絡してください。");
  }

  user.lastLoginAt = nowString();
  save();
  sessionStorage.setItem(SESSION_KEY, String(user.id));
  $("#loginPassword").value = "";
  showLoginError("");
  updateAuthView();
  document.dispatchEvent(new Event("auth-changed")); // ユーザーごとの表示（自分の出品など）を更新

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
});

// 初期管理者のヒントは、開発環境（localhost）でだけ表示する
$("#loginHint")?.toggleAttribute("hidden", !["localhost", "127.0.0.1"].includes(location.hostname));

$("#registerToggle").addEventListener("click", () =>
  setAuthMode(authMode === "login" ? "register" : "login"),
);

// ログアウトは画面を読み込み直して、開いていたダイアログや入力内容をすべて消す
$("#logoutButton").addEventListener("click", () => {
  sessionStorage.removeItem(SESSION_KEY);
  location.reload();
});
