// 新規登録（利用申請）の画面
// ※ 今は画面だけ。入力チェックまでして、データは保存しない。
//   API ができたら、submit の中の「準備中」の部分を申請APIの呼び出しに差し替える。
//   （申請 → 管理者が「アカウント管理」で承認 → ログインできる、という流れを想定）
import { $ } from "./helpers.js";
import { watchCapsLock } from "./auth.js";

const PASSWORD_MIN = 8;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const forms = { login: $("#loginForm"), register: $("#registerForm") };

function showMessage(id, message) {
  const element = $(id);
  element.textContent = message;
  element.hidden = !message;
}

function clearRegister() {
  forms.register.reset();
  forms.register.querySelectorAll("[aria-invalid]").forEach((input) => input.removeAttribute("aria-invalid"));
  showMessage("#registerError", "");
  showMessage("#registerNotice", "");
}

// ログイン ⇔ 新規登録 の切り替え
export function showAuthForm(mode) {
  const registering = mode === "register";
  forms.login.hidden = registering;
  forms.register.hidden = !registering;
  if (registering) clearRegister();
  showMessage("#loginError", "");
  (registering ? $("#registerName") : $("#loginEmail")).focus();
}

document.querySelectorAll("[data-auth-switch]").forEach((button) =>
  button.addEventListener("click", () => showAuthForm(button.dataset.authSwitch)),
);

watchCapsLock($("#registerPassword"), $("#registerCapsLock"));

// 入力チェック：問題があれば [メッセージ, 欄のid] を返す
function registerProblem() {
  const name = $("#registerName").value.trim();
  const email = $("#registerEmail").value.trim();
  const password = $("#registerPassword").value;
  const confirm = $("#registerConfirm").value;
  if (!name) return ["氏名を入力してください。", "registerName"];
  if (!EMAIL_PATTERN.test(email)) return ["メールアドレスの形式が正しくありません。", "registerEmail"];
  if (password.length < PASSWORD_MIN) return [`パスワードは${PASSWORD_MIN}文字以上で入力してください。`, "registerPassword"];
  if (password !== confirm) return ["確認用のパスワードが一致しません。", "registerConfirm"];
  return null;
}

forms.register.addEventListener("submit", (event) => {
  event.preventDefault();
  forms.register.querySelectorAll("[aria-invalid]").forEach((input) => input.removeAttribute("aria-invalid"));
  showMessage("#registerNotice", "");

  const problem = registerProblem();
  if (problem) {
    const [message, fieldId] = problem;
    showMessage("#registerError", message);
    $(`#${fieldId}`).setAttribute("aria-invalid", "true");
    $(`#${fieldId}`).focus();
    return;
  }

  // ここから先は API ができたら差し替える（今は保存しない）
  showMessage("#registerError", "");
  $("#registerPassword").value = "";
  $("#registerConfirm").value = "";
  showMessage(
    "#registerNotice",
    "利用申請は現在準備中です。アカウントが必要な場合は、管理者に作成を依頼してください。",
  );
});
