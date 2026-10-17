// ライセンス割り当ての描画（一覧・検索・状態の絞り込み）
import { licenseById, memberById, state } from "./state.js";
import { $, badge, blank, cell, detailLink, emptyRow, esc, formatDate, matches, searchQuery, stacked } from "./helpers.js";

export function renderAssignments() {
  const query = searchQuery("#assignmentSearch");
  const status = $("#assignmentStatus")?.value ?? "";
  const rows = state.assignments.filter((assignment) => {
    const member = memberById(assignment.memberId);
    const license = licenseById(assignment.licenseId);
    return (
      (!status || assignment.status === status) &&
      matches(query, member?.name, license?.name, assignment.assignedBy)
    );
  });

  $("#assignmentCount").textContent = `${rows.length}件`;
  $("#assignmentsTable").innerHTML =
    rows
      .map((assignment) => {
        const member = memberById(assignment.memberId);
        const license = licenseById(assignment.licenseId);
        const released = assignment.status === "released";
        return [
          `<tr>`,
          cell("利用者", member ? detailLink("member", member.id, member.name) : "（削除済み）", "primary"),
          cell("ライセンス", license ? detailLink("license", license.id, license.name) : "（削除済み）"),
          cell("割り当て日", formatDate(assignment.assignedAt), "nowrap"),
          cell(
            "状態",
            stacked(badge(assignment.status), released && assignment.releasedAt ? `${esc(formatDate(assignment.releasedAt))}に返却` : ""),
          ),
          cell("割り当て者", assignment.assignedBy ? esc(assignment.assignedBy) : blank),
          cell(
            "操作",
            released
              ? ""
              : `<div class="row-actions admin-only"><button type="button" class="link-button" data-edit="assignment" data-id="${assignment.id}">編集</button><button type="button" class="link-button danger" data-release="${assignment.id}">返却</button></div>`,
            "actions",
          ),
          `</tr>`,
        ].join("");
      })
      .join("") ||
    emptyRow(6, query || status ? "該当する割り当てはありません" : "割り当てはありません");
}
