// ログイン・アカウント登録・ログアウト（権限や有効・無効の切り替えは「アカウント管理」で行う）
// ※ 現在はブラウザ内（localStorage）だけで完結する仮の認証。
//   API ができたら、ログイン・登録・ログアウトはサーバーに問い合わせる形に差し替える。
import { nextId, save, state } from "./state.js";
import { $, daysUntil, esc, notify, nowString } from "./helpers.js";
import { ROLE_LABELS } from "./constants.js";

const SESSION_KEY = "licenseManagerUserId";
const EMAIL_KEY = "passhubSavedEmail"; // 「メールアドレスを保存する」で覚えておくメールアドレス
let authMode = "login";

// 新規登録のパスワードの条件（画面の一覧と、登録するときのチェックで使う）
const PASSWORD_RULES = {
  length: (value) => value.length >= 8,
  letter: (value) => /[A-Za-z]/.test(value),
  number: (value) => /[0-9]/.test(value),
};

// 保存してあるメールアドレス（無ければ空）
const savedEmail = () => {
  try {
    return localStorage.getItem(EMAIL_KEY) ?? "";
  } catch {
    return "";
  }
};

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
// 新規登録だけで使う欄（氏名・確認用パスワード）は、ログインのときはページから外しておく。
// 隠しているだけだと、Edge などが「新規登録のフォーム」と判断して、ログイン画面でも強力なパスワードを提案してしまうため
const confirmField = $("#loginConfirmField");
const confirmInput = $("#loginConfirm");
const registerOnly = [$("#loginNameField"), confirmField].map((field) => {
  const mark = document.createComment(field.id); // 戻す場所の目印
  field.before(mark);
  field.remove();
  return { field, mark };
});

export function setAuthMode(mode) {
  authMode = mode;
  const registering = mode === "register";
  registerOnly.forEach(({ field, mark }) => (registering ? mark.after(field) : field.remove()));
  // HTML側に要素が無くてもエラーで止まらないように ?. を付けている
  $("#authTitle")?.replaceChildren(registering ? "アカウント登録" : "ログイン");
  $("#authDescription")?.replaceChildren(
    registering ? "必要な項目を入力してください。" : "登録済みのアカウントでログインしてください。",
  );
  if ($("#loginNameField")) $("#loginNameField").hidden = !registering;
  if ($("#loginName")) $("#loginName").required = registering;
  // ブラウザ（Edge など）は、ページを開いたときの autocomplete を見て「強力なパスワードの提案」を出す欄を決める。
  // 切り替えたあとに欄を入れ直して、ブラウザにもう一度読み直してもらう
  const passwordInput = $("#loginPassword");
  passwordInput.setAttribute("autocomplete", registering ? "new-password" : "current-password");
  passwordInput.parentElement.prepend(passwordInput);
  $("#loginForm .login-button").textContent = registering ? "アカウントを登録" : "ログイン";
  $("#registerToggle")?.replaceChildren(registering ? "ログイン画面に戻る" : "新しいアカウントを登録する");
  // 確認用のパスワードは登録のときだけ、保存と忘れた場合の案内はログインのときだけ出す
  confirmField.hidden = !registering;
  confirmInput.value = "";
  $("#rememberField").hidden = registering;
  $("#forgotPassword").hidden = registering;
  $("#passwordRules").hidden = !registering;
  // 入力は引き継がない（ログインに戻るときは、保存したメールアドレスだけ入れ直す）
  $("#loginEmail").value = registering ? "" : savedEmail();
  $("#loginPassword").value = "";
  if ($("#loginName")) $("#loginName").value = "";
  // パスワードの表示は「隠す」状態に戻す
  [...document.querySelectorAll(".password-toggle"), confirmField.querySelector(".password-toggle")].forEach((button) => {
    button.closest(".password-wrap").querySelector("input").type = "password";
    button.textContent = "表示";
    button.setAttribute("aria-pressed", "false");
  });
  updateConfirmField();
  showLoginError("");
}

// 確認用のパスワードは、先にパスワードを入れるまで入力できないようにする
// （ログインのときは常に使えないままにする。使える状態だとブラウザが「新規登録の画面」と判断することがあるため）
function updateConfirmField() {
  const ready = authMode === "register" && $("#loginPassword").value !== "";
  const confirm = confirmInput;
  confirm.disabled = !ready;
  confirm.placeholder = ready ? "" : "先にパスワードを入力してください";
  confirmField.querySelector(".password-toggle").disabled = !ready;
  if (!ready) confirm.value = "";
  // 条件を満たしたものに印を付ける
  const value = $("#loginPassword").value;
  document.querySelectorAll("#passwordRules [data-rule]").forEach((item) => {
    item.classList.toggle("is-ok", PASSWORD_RULES[item.dataset.rule](value));
  });
}
$("#loginPassword").addEventListener("input", updateConfirmField);

// ブラウザの「強力なパスワードの提案」を選ぶと、入力中の欄では文字が見えたままになる。
// 提案（自動入力）で入ったときは確認用の欄へ移って、パスワードを隠した状態にする。
// キーボードで打ったときは inputType が "insertText" などになるので、ここでは何もしない
$("#loginPassword").addEventListener("input", (event) => {
  if (authMode !== "register" || !$("#loginPassword").value) return;
  if (event.inputType === undefined || event.inputType === "insertReplacementText") confirmInput.focus();
});

$("#loginForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const email = $("#loginEmail").value.trim().toLowerCase();
  const password = $("#loginPassword").value;

  // アカウント登録（今は画面だけで保存しない。誰でもアカウントを作れてしまうため。
  // API ができたら「申請 → 管理者が承認」の流れにする）
  if (authMode === "register") {
    const name = $("#loginName")?.value.trim() ?? "";
    if (!name) return showLoginError("氏名を入力してください。");
    if (!Object.values(PASSWORD_RULES).every((rule) => rule(password))) {
      return showLoginError("パスワードは8文字以上で、英字と数字を両方含めてください。");
    }
    if (password !== confirmInput.value) return showLoginError("確認用のパスワードが一致しません。");
    if (state.users.some((item) => item.email === email)) {
      return showLoginError("このメールアドレスはすでに登録されています。");
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

  // ログインできたときだけメールアドレスを保存する（チェックを外していたら消す）
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
  document.dispatchEvent(new Event("auth-changed")); // ユーザーごとの表示（自分の出品など）を更新

  // ログイン直後に、更新期限を過ぎたライセンスがあれば一緒に知らせる
  const expired = state.licenses.some(
    (license) => license.status === "active" && daysUntil(license.renewal) < 0,
  );
  notify(
    expired
      ? `${user.name}さんとしてログインしました。更新期限を過ぎたライセンスがあります。確認してください。`
      : `${user.name}さんとしてログインしました`,
    expired,
  );
});

// パスワードの表示／非表示
// （確認用の欄はこの時点でページから外れているので、別に指定する）
[...document.querySelectorAll(".password-toggle"), confirmField.querySelector(".password-toggle")].forEach((button) =>
  button.addEventListener("click", () => {
    const input = button.closest(".password-wrap").querySelector("input");
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    button.textContent = show ? "隠す" : "表示";
    button.setAttribute("aria-pressed", String(show));
    input.focus();
  }),
);

// Caps Lock がオンのときに警告を出す
const updateCapsLock = (event) => {
  if (typeof event.getModifierState !== "function") return;
  $("#capsLockWarning").hidden = !event.getModifierState("CapsLock");
};
$("#loginPassword").addEventListener("keydown", updateCapsLock);
$("#loginPassword").addEventListener("keyup", updateCapsLock);

// 前回保存したメールアドレスを入れておく
try {
  const saved = localStorage.getItem(EMAIL_KEY);
  if (saved) {
    $("#loginEmail").value = saved;
    $("#rememberEmail").checked = true;
  }
} catch {}

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
