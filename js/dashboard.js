// ダッシュボードの描画
import { state, toolById } from "./state.js";
import { $, daysUntil, esc, formatDate, renewalBadge } from "./helpers.js";

export function renderDashboard() {
  const assigned = state.assignments.filter((item) => item.status === "assigned").length;
  const activeLicenses = state.licenses.filter((license) => license.status === "active");
  const renewable = activeLicenses.filter((license) => license.renewal); // 買い切りは更新日なし
  const total = activeLicenses.reduce((sum, item) => sum + item.quantity, 0);
  const expiring = renewable.filter((license) => daysUntil(license.renewal) <= 30);
  const renewals = [...renewable]
    .sort((a, b) => a.renewal.localeCompare(b.renewal))
    .slice(0, 3);

  $("#metrics").innerHTML = [
    ["登録ツール", state.tools.length, "管理対象のサービス"],
    ["ライセンス総数", total, "契約済みライセンス"],
    ["割り当て済み", assigned, "現在利用中"],
    ["利用可能数", total - assigned, "割り当て可能"],
    ["期限30日以内", expiring.length, expiring.length ? "更新確認が必要" : "問題ありません"],
  ]
    .map(([label, value, note]) =>
      [
        `<div class="metric">`,
        `<div class="metric-label">${label}</div>`,
        `<div class="metric-value">${value}</div>`,
        `<div class="metric-note">${note}</div>`,
        `</div>`,
      ].join(""),
    )
    .join("");

  $("#renewalList").innerHTML =
    renewals
      .map((license) =>
        [
          `<div class="list-row">`,
          `<div>`,
          `<div class="list-main">${esc(license.name)}</div>`,
          `<div class="list-sub">${esc(toolById(license.toolId)?.name)} / 更新日 ${formatDate(license.renewal)}</div>`,
          `</div>`,
          renewalBadge(license.renewal),
          `</div>`,
        ].join(""),
      )
      .join("") || '<div class="empty">更新予定はありません</div>';

  $("#recentLogs").innerHTML =
    state.logs
      .slice(-4)
      .reverse()
      .map((log) =>
        [
          `<div class="list-row">`,
          `<div>`,
          `<div class="list-main">${esc(log.action)}</div>`,
          `<div class="list-sub">${esc(log.target)} ・ ${esc(log.user)}</div>`,
          `</div>`,
          `<div class="list-sub">${esc(log.at)}</div>`,
          `</div>`,
        ].join(""),
      )
      .join("") || '<div class="empty">操作履歴はありません</div>';
}
