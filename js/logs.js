// 操作履歴（記録と一覧の描画）
import { nextId, state } from "./state.js";
import { $, esc, nowString } from "./helpers.js";
import { currentUser } from "./auth.js";

export function renderLogs() {
  $("#logsTable").innerHTML = state.logs
    .slice()
    .reverse()
    .map((log) =>
      [
        `<tr>`,
        `<td>${esc(log.at)}</td>`,
        `<td>${esc(log.action)}</td>`,
        `<td>${esc(log.target)}</td>`,
        `<td>${esc(log.user)}</td>`,
        `</tr>`,
      ].join(""),
    )
    .join("");
}

export function addLog(action, target) {
  state.logs.push({
    id: nextId(state.logs),
    action,
    target,
    at: nowString(),
    user: currentUser()?.name ?? "管理者",
  });
}
