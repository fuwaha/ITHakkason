// 操作履歴（記録と一覧の描画）
import { licenseById, memberById, nextId, state } from "./state.js";
import { $, cell, emptyRow, esc, matches, nowString, searchQuery } from "./helpers.js";
import { TYPE_LABELS } from "./constants.js";
import { currentUser } from "./auth.js";

const PAGE_SIZE = 50;
let shown = PAGE_SIZE;

// 「ツール: Slack」のように、何を操作したかが分かる対象名を作る
export function describe(type, item) {
  if (!item) return TYPE_LABELS[type] ?? type;
  if (type === "assignment") {
    const member = memberById(item.memberId)?.name ?? "（削除済み）";
    const license = licenseById(item.licenseId)?.name ?? "（削除済み）";
    return `${TYPE_LABELS.assignment}: ${member} / ${license}`;
  }
  return `${TYPE_LABELS[type]}: ${item.name}`;
}

// 操作の種類ごとの色（削除は赤、返却は灰色 など）
const ACTION_TONES = {
  登録: "active",
  更新: "info",
  削除: "danger",
  返却: "released",
  CSV取込: "info",
  無効化: "danger",
  有効化: "active",
  パスワード再設定: "warning",
  パスワード変更: "warning",
};
export const actionTag = (action) =>
  `<span class="badge ${ACTION_TONES[action] ?? "inactive"}">${esc(action)}</span>`;

// 「ライセンス: Figma Pro」→ 種類を小さく、名前を太く
export function targetLabel(target) {
  const text = String(target ?? "");
  const index = text.indexOf(": ");
  if (index < 0) return esc(text);
  return `<span class="target"><small>${esc(text.slice(0, index))}</small>${esc(text.slice(index + 2))}</span>`;
}

export function renderLogs() {
  const query = searchQuery("#logSearch");
  const rows = state.logs
    .slice()
    .reverse()
    .filter((log) => matches(query, log.action, log.target, log.user));

  $("#logCount").textContent = `${rows.length}件`;
  $("#logsTable").innerHTML =
    rows
      .slice(0, shown)
      .map((log) =>
        [
          `<tr>`,
          cell("日時", `<span class="muted">${esc(log.at)}</span>`),
          cell("操作", actionTag(log.action)),
          cell("対象", targetLabel(log.target), "primary"),
          cell("実行者", esc(log.user)),
          `</tr>`,
        ].join(""),
      )
      .join("") || emptyRow(4, query ? "該当する操作履歴はありません" : "操作履歴はありません");

  const more = $("#logMoreButton");
  more.hidden = rows.length <= shown;
  more.textContent = `さらに表示（残り ${Math.max(rows.length - shown, 0)}件）`;
}

export function addLog(action, target) {
  state.logs.push({
    id: nextId(state.logs),
    action,
    target,
    at: nowString(),
    user: currentUser()?.name ?? "（不明）",
  });
}

$("#logMoreButton").addEventListener("click", () => {
  shown += PAGE_SIZE;
  renderLogs();
});

$("#logSearch").addEventListener("input", () => {
  shown = PAGE_SIZE;
  renderLogs();
});
