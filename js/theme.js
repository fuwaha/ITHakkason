// テーマ（ライト / ダーク）の切り替え
// 選んだテーマは localStorage に保存する。まだ選んでいないときは OS の設定に従う。
const KEY = "passhubTheme";
const media = matchMedia("(prefers-color-scheme: dark)");

const load = () => {
  try {
    const value = localStorage.getItem(KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
};

// テーマ切り替えボタンのアイコン（絵文字は環境で見た目が変わるので SVG にする）
const ICONS = {
  sun: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  moon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>',
};

let chosen = load();
const effective = () => chosen ?? (media.matches ? "dark" : "light");

function apply() {
  const root = document.documentElement;
  if (chosen) root.dataset.theme = chosen;
  else delete root.dataset.theme;

  const button = document.querySelector("#themeToggle");
  if (!button) return;
  const dark = effective() === "dark";
  button.innerHTML = dark ? `${ICONS.sun}<span>ライト</span>` : `${ICONS.moon}<span>ダーク</span>`;
  button.setAttribute("aria-label", dark ? "ライトモードに切り替え" : "ダークモードに切り替え");
}

// 読み込み直後に、保存してあるテーマを先に反映しておく
apply();

// HTMLの部品（サイドバー）を差し込んだあとに呼ぶ
export function initTheme() {
  apply();
  document.querySelector("#themeToggle")?.addEventListener("click", () => {
    chosen = effective() === "dark" ? "light" : "dark";
    try {
      localStorage.setItem(KEY, chosen);
    } catch {
      // 保存できなくても、このページを開いている間は切り替わる
    }
    apply();
  });
  media.addEventListener("change", apply);
}