// アカウントメニュー（サイドバー下の自分のアイコンを押すと開く）
import { $ } from "./helpers.js";
import { currentUser } from "./auth.js";
import { openForm } from "./forms.js";

const button = $("#userButton");
const menu = $("#userMenu");
const items = () => [...menu.querySelectorAll(".menu-item")].filter((item) => item.offsetParent !== null);

function openMenu() {
  menu.hidden = false;
  button.setAttribute("aria-expanded", "true");
  items()[0]?.focus();
}

export function closeMenu({ focusButton = false } = {}) {
  if (menu.hidden) return;
  menu.hidden = true;
  button.setAttribute("aria-expanded", "false");
  if (focusButton) button.focus();
}

button.addEventListener("click", () => (menu.hidden ? openMenu() : closeMenu()));

// メニューの項目を押したら閉じる（画面切り替え・テーマ・ログアウトはそれぞれの処理が動く）
menu.addEventListener("click", (event) => {
  const item = event.target.closest(".menu-item");
  if (!item) return;
  // テーマはメニューを開いたまま何度でも切り替えられるようにする
  if (item.id !== "themeToggle") closeMenu();
  // 自分のプロフィール・パスワードは、管理者でなくても変更できる
  if (item.dataset.self) openForm(item.dataset.self, currentUser());
});

// 外を押す・Esc で閉じる。上下キーで項目を移動
document.addEventListener("click", (event) => {
  if (!menu.hidden && !event.target.closest("#userMenu, #userButton")) closeMenu();
});
menu.addEventListener("keydown", (event) => {
  const list = items();
  const index = list.indexOf(document.activeElement);
  if (event.key === "Escape") {
    event.preventDefault();
    closeMenu({ focusButton: true });
  } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    const step = event.key === "ArrowDown" ? 1 : -1;
    list[(index + step + list.length) % list.length]?.focus();
  } else if (event.key === "Tab") {
    closeMenu();
  }
});
