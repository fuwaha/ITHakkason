// 画面切り替えと再描画
import { $ } from "./helpers.js";
import { renderLogs } from "./logs.js";
import { renderDashboard } from "./dashboard.js";
import { renderTools } from "./tools.js";
import { renderLicenses } from "./licenses.js";
import { renderMembers } from "./members.js";
import { renderAssignments } from "./assignments.js";

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
  renderTools();
  renderLicenses();
  renderMembers();
  renderAssignments();
  renderLogs();
}

["toolSearch", "licenseSearch", "memberSearch"].forEach((id) =>
  $(`#${id}`).addEventListener("input", render),
);
