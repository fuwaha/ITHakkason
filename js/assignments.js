// ライセンス割り当ての描画
import { licenseById, memberById, state } from "./state.js";
import { $, badge, esc, formatDate } from "./helpers.js";

export function renderAssignments() {
  $("#assignmentsTable").innerHTML =
    state.assignments
      .map((assignment) =>
        [
          `<tr>`,
          `<td>${esc(memberById(assignment.memberId)?.name ?? "（削除済み）")}</td>`,
          `<td>${esc(licenseById(assignment.licenseId)?.name ?? "（削除済み）")}</td>`,
          `<td>${formatDate(assignment.assignedAt)}</td>`,
          `<td>${badge(assignment.status)}</td>`,
          `<td>${esc(assignment.assignedBy)}</td>`,
          `<td>${assignment.status === "assigned" ? `<button class="link-button" data-release="${assignment.id}">返却</button>` : ""}</td>`,
          `</tr>`,
        ].join(""),
      )
      .join("") || '<tr><td class="empty" colspan="6">割り当てはありません</td></tr>';
}
