// ログイン・アカウント登録・ログアウト
import { nextId, save, state } from "./state.js";
import { $, daysUntil, notify } from "./helpers.js";

let authMode = "login";


// ログイン中のユーザー（sessionStorage に user id を保存し、users から探す）
export const currentUser = () =>
  state.users.find((user) => user.id === Number(sessionStorage.getItem("licenseManagerUserId"))) ||
  null;
const authenticated = () => currentUser() !== null;
export const isAdmin = () => currentUser()?.role === "admin";

export function updateAuthView() {
  $("#loginScreen").classList.toggle("hidden", authenticated());
  const user = currentUser();
  if (user) $("#currentUser").textContent = `${user.name}（${user.role === "admin" ? "管理者" : "利用者"}）`;
}

export function setAuthMode(mode) {
  authMode = mode;
  const registering = mode === "register";
  // HTML側に要素が無くてもエラーで止まらないように ?. を付けている
  $("#authTitle")?.replaceChildren(registering ? "アカウント登録" : "ログイン");
  $("#authDescription")?.replaceChildren(registering ? "usersテーブルに新しいアカウントを登録します。" : "登録済みのアカウントでログインしてください。");
  if ($("#loginNameField")) $("#loginNameField").hidden = !registering;
  if ($("#loginName")) $("#loginName").required = registering;
  $("#loginPassword").autocomplete = registering ? "new-password" : "current-password";
  $("#loginForm .login-button").textContent = registering ? "アカウントを登録" : "ログイン";
  $("#registerToggle")?.replaceChildren(registering ? "ログイン画面に戻る" : "新しいアカウントを登録する");
  $("#loginError").hidden = true;
}

$("#loginForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const email = $("#loginEmail").value.trim().toLowerCase();
  const password = $("#loginPassword").value;

  // アカウント登録（users に追加するだけ。見かけ用のデモ）
  if (authMode === "register") {
    const name = $("#loginName")?.value.trim() ?? "";
    if (!name) return notify("氏名を入力してください。", true);
    if (password.length < 8) return notify("パスワードは8文字以上で入力してください。", true);
    if (state.users.some((item) => item.email === email)) {
      return notify("このメールアドレスは既に登録されています。", true);
    }
    state.users.push({ id: nextId(state.users), name, email, password, role: "user" });
    save();
    $("#loginPassword").value = "";
    setAuthMode("login");
    return notify("アカウントを登録しました。ログインしてください。");
  }

  // ログイン（users からメールアドレスで探してパスワードを照合）
  const user = state.users.find((item) => item.email === email);
  const valid = Boolean(user) && user.password === password;
  $("#loginError").hidden = valid;

  if (valid) {
    sessionStorage.setItem("licenseManagerUserId", String(user.id));
    $("#loginPassword").value = "";
    updateAuthView();
    document.dispatchEvent(new Event("auth-changed")); // ユーザーごとの表示（自分の出品など）を更新

    // ログイン直後に、更新期限を過ぎたライセンスがあれば一緒に知らせる
    const expired = state.licenses.some((license) => daysUntil(license.renewal) < 0);
    notify(
      expired
        ? `${user.name} としてログインしました。更新期限を過ぎたライセンスがあります。確認してください。`
        : `${user.name} としてログインしました`,
      expired,
    );
  }
});

$("#registerToggle").addEventListener("click", () =>
  setAuthMode(authMode === "login" ? "register" : "login"),
);

$("#logoutButton").addEventListener("click", () => {
  sessionStorage.removeItem("licenseManagerUserId");
  updateAuthView();
  document.dispatchEvent(new Event("auth-changed"));
});
