// 画面切り替えと再描画
import { $ } from "./helpers.js";
import { renderLogs } from "./logs.js";
import { renderDashboard } from "./dashboard.js";
import { renderMarket } from "./market.js";
import { renderTools } from "./tools.js";
import { renderLicenses } from "./licenses.js";
import { renderMembers } from "./members.js";
import { renderAssignments } from "./assignments.js";
import { renderAccounts } from "./accounts.js";
import { isAdmin } from "./auth.js";

const RENDERERS = {
  dashboard: renderDashboard,
  market: renderMarket,
  tools: renderTools,
  licenses: renderLicenses,
  members: renderMembers,
  assignments: renderAssignments,
  logs: renderLogs,
  accounts: renderAccounts,
};

// 管理者だけが開ける画面
const ADMIN_VIEWS = new Set(["accounts"]);

export function showView(view) {
  if (!RENDERERS[view]) return;
  if (ADMIN_VIEWS.has(view) && !isAdmin()) return;
  document
    .querySelectorAll(".view")
    .forEach((element) => element.classList.toggle("active", element.id === view));
  document.querySelectorAll(".nav-item").forEach((element) => {
    const active = element.dataset.view === view;
    element.classList.toggle("active", active);
    if (active) {
      element.setAttribute("aria-current", "page");
      // スマホの横スクロールメニューで、選んだ項目が見える位置まで動かす
      element.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
    } else element.removeAttribute("aria-current");
  });
  render();
  window.scrollTo({ top: 0 });
}

export function render() {
  Object.values(RENDERERS).forEach((renderer) => renderer());
}

// ログイン・ログアウトで表示内容（自分の出品など）が変わるので再描画する
document.addEventListener("auth-changed", render);

// 検索欄・絞り込みは、その画面だけを描き直す
[
  ["#toolSearch", "input", renderTools],
  ["#licenseSearch", "input", renderLicenses],
  ["#memberSearch", "input", renderMembers],
  ["#memberType", "change", renderMembers],
  ["#marketSearch", "input", renderMarket],
  ["#marketFilter", "change", renderMarket],
  ["#assignmentSearch", "input", renderAssignments],
  ["#assignmentStatus", "change", renderAssignments],
].forEach(([selector, type, renderer]) => $(selector).addEventListener(type, renderer));
