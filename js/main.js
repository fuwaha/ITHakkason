// エントリーポイント（HTMLの部品を差し込んでから、各ファイルを読み込んで初期表示）
import { loadPartials } from "./partials.js";

try {
  // 各ファイルは読み込み時に画面の要素を探すので、先にHTMLの部品を差し込む
  await loadPartials();

  await import("./render.js");
  await import("./forms.js");
  await import("./actions.js");
  await import("./csv.js");
  await import("./market-actions.js");
  const { updateAuthView, setAuthMode } = await import("./auth.js");
  const { render } = await import("./render.js");

  updateAuthView();
  setAuthMode("login");
  render();
} catch (error) {
  console.error(error);
  document.body.textContent = `読み込みに失敗しました: ${error.message}`;
}