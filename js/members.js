// 利用者管理の描画
import { state } from "./state.js";
import { $, badge, esc } from "./helpers.js";

export function renderMembers() {
  const query = ($("#memberSearch")?.value || "").toLowerCase();
  const rows = state.members.filter((member) =>
    `${member.name} ${member.email} ${member.department}`.toLowerCase().includes(query),
  );

  $("#memberCount").textContent = `${rows.length}件`;
  $("#membersTable").innerHTML =
    rows
      .map((member) =>
        [
          `<tr>`,
          `<td><strong>${esc(member.name)}</strong></td>`,
          `<td>${esc(member.email)}</td>`,
          `<td>${esc(member.number)}</td>`,
          `<td>${esc(member.department)}</td>`,
          `<td>${state.assignments.filter((item) => item.memberId === member.id && item.status === "assigned").length}</td>`,
          `<td>${badge(member.status)}</td>`,
          `<td><div class="row-actions">`,
          `<button class="link-button" data-edit="member" data-id="${member.id}">編集</button>`,
          `<button class="link-button danger" data-delete="member" data-id="${member.id}">削除</button>`,
          `</div></td>`,
          `</tr>`,
        ].join(""),
      )
      .join("") || '<tr><td class="empty" colspan="7">該当する利用者はいません</td></tr>';
}
