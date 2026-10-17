// エントリーポイント（HTMLの部品を差し込んでから、各ファイルを読み込んで初期表示）
import { loadPartials } from "./partials.js";
import { initTheme } from "./theme.js";

try {
  // 各ファイルは読み込み時に画面の要素を探すので、先にHTMLの部品を差し込む
  await loadPartials();
  initTheme();

  const { render } = await import("./render.js");
  await import("./forms.js");
  await import("./actions.js");
  await import("./csv.js");
  await import("./market-actions.js");
  await import("./user-menu.js");
  const { updateAuthView, setAuthMode } = await import("./auth.js");

  updateAuthView();
  setAuthMode("login");
  render();
} catch (error) {
  console.error(error);
  const message =
    location.protocol === "file:"
      ? "index.html を直接開くと部品を読み込めません。開発サーバー経由で開いてください。"
      : `読み込みに失敗しました: ${error.message}`;
  document.body.textContent = message;
}
