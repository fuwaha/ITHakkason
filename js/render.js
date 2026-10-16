// 画面切り替えと再描画
import { $ } from "./helpers.js";
import { renderLogs } from "./logs.js";
import { renderDashboard } from "./dashboard.js";
import { renderTools } from "./tools.js";
import { renderLicenses } from "./licenses.js";
import { renderMembers } from "./members.js";
import { renderAssignments } from "./assignments.js";
import { renderMarket } from "./market.js";

export function showView(view) {
  document
    .querySelectorAll(".view")
    .forEach((element) => element.classList.toggle("active", element.id === view));
  document
    .querySelectorAll(".nav-item")
    .forEach((element) => element.classList.toggle("active", element.dataset.view === view));
  render();
}

export function render() {
  renderDashboard();
  renderMarket();
  renderTools();
  renderLicenses();
  renderMembers();
  renderAssignments();
  renderLogs();
}

// ログイン・ログアウトで表示内容（自分の出品など）が変わるので再描画する
document.addEventListener("auth-changed", render);
 
["toolSearch", "licenseSearch", "memberSearch", "marketSearch", "marketFilter"].forEach((id) =>
  $(`#${id}`).addEventListener("input", render),
);
