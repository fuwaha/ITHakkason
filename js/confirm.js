// 確認ウィンドウ（confirm() の代わり。OKならtrue、キャンセル・Escならfalseを返す）
import { $ } from "./helpers.js";

export function askConfirm({ title, message, okLabel = "OK", danger = false }) {
  const dialog = $("#confirmDialog");
  if (dialog.open) return Promise.resolve(false); // すでに開いているときは何もしない

  const ok = $("#confirmOk");
  const cancel = $("#confirmCancel");

  $("#confirmTitle").textContent = title;
  $("#confirmMessage").textContent = message;
  ok.textContent = okLabel;
  ok.classList.toggle("is-danger", danger);

  return new Promise((resolve) => {
    const finish = (result) => {
      ok.removeEventListener("click", onOk);
      cancel.removeEventListener("click", onCancel);
      dialog.removeEventListener("cancel", onEscape);
      dialog.close();
      resolve(result);
    };
    const onOk = () => finish(true);
    const onCancel = () => finish(false);
    const onEscape = (event) => {
      event.preventDefault(); // 標準の閉じ方ではなく、finish で閉じる
      finish(false);
    };

    ok.addEventListener("click", onOk);
    cancel.addEventListener("click", onCancel);
    dialog.addEventListener("cancel", onEscape);
    dialog.showModal();
  });
}
