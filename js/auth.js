// ログイン・アカウント登録・ログアウト（権限や有効・無効の切り替えは「アカウント管理」で行う）
// ※ 現在はブラウザ内（localStorage）だけで完結する仮の認証。
//   API ができたら、ログイン・登録・ログアウトはサーバーに問い合わせる形に差し替える。
import { $, daysUntil, esc, notify } from "./helpers.js";
import { ROLE_LABELS } from "./constants.js";
import { supabase } from "./supabase.js";
import { state } from "./state.js";

let authMode = "login";
let authenticatedUser = null;

export async function initializeAuth() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!data.session) return;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, name, role")
    .eq("id", data.session.user.id)
    .single();
  if (profileError) throw profileError;

  authenticatedUser = {
    ...profile,
    email: data.session.user.email,
    status: "active",
  };
}

export const currentUser = () => authenticatedUser;
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

$("#loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = $("#loginEmail").value.trim().toLowerCase();
  const password = $("#loginPassword").value;

  if (authMode === "register") {
    const name = $("#loginName")?.value.trim() ?? "";
    if (!name) return notify("氏名を入力してください。", true);
    if (password.length < 8) return notify("パスワードは8文字以上で入力してください。", true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) {
      return notify(`アカウント登録に失敗しました: ${error.message}`, true);
    }

    $("#loginPassword").value = "";
    setAuthMode("login");
    return notify("アカウント登録は準備中です。アカウントが必要な場合は、管理者に作成を依頼してください。");
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return showLoginError("メールアドレスまたはパスワードが違います。");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, name, role")
    .eq("id", data.user.id)
    .single();
  if (profileError) {
    return showLoginError("ユーザー情報を取得できませんでした。");
  }

  authenticatedUser = {
    ...profile,
    email: data.user.email,
    status: "active",
  };
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
      ? `${authenticatedUser.name} としてログインしました。更新期限を過ぎたライセンスがあります。確認してください。`
      : `${authenticatedUser.name} としてログインしました`,
    expired,
  );
});

// 初期管理者のヒントは、開発環境（localhost）でだけ表示する
$("#loginHint")?.toggleAttribute("hidden", !["localhost", "127.0.0.1"].includes(location.hostname));

$("#registerToggle").addEventListener("click", () =>
  setAuthMode(authMode === "login" ? "register" : "login"),
);

// ログアウトは画面を読み込み直して、開いていたダイアログや入力内容をすべて消す
$("#logoutButton").addEventListener("click", async () => {
  const { error } = await supabase.auth.signOut();
  if (error) return notify(`ログアウトに失敗しました: ${error.message}`, true);
  authenticatedUser = null;
  location.reload();
});
