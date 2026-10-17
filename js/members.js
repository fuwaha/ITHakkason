// 社員情報の描画
import { memberAssignedCount, state } from "./state.js";
import {
  $,
  badge,
  blank,
  cell,
  daysUntil,
  detailLink,
  emptyRow,
  esc,
  formatDate,
  matches,
  memberEnd,
  searchQuery,
  stacked,
} from "./helpers.js";
import { ALERT_DAYS, EMPLOYMENT_TYPES } from "./constants.js";
import { rowActions } from "./tools.js";

// 退職・異動・契約終了のうち早い予定日：近い・過ぎていて、まだライセンスを持っていれば注意を出す
function endCell(member) {
  const end = memberEnd(member);
  if (!end) return blank;
  const days = daysUntil(end.date);
  const holding = memberAssignedCount(member.id) > 0;
  let note = esc(end.label);
  if (holding && days !== null && days <= ALERT_DAYS) {
    note = `<span class="badge ${days < 0 ? "danger" : "warning"}">要回収</span>${esc(end.label)}`;
  } else if (days !== null && days >= 0) {
    note = `${esc(end.label)}・あと${days}日`;
  }
  return stacked(formatDate(end.date), note);
}

// 雇用形態の印（正社員以外を目立たせる）
const employmentTag = (type) =>
  type ? `<span class="tag${type === "regular" ? "" : " tag-strong"}">${esc(EMPLOYMENT_TYPES[type] ?? type)}</span>` : blank;

export function renderMembers() {
  const query = searchQuery("#memberSearch");
  const type = $("#memberType")?.value ?? "";
  const rows = state.members.filter(
    (member) =>
      (!type || (member.employmentType ?? "regular") === type) &&
      matches(query, member.name, member.email, member.number, member.department, member.position),
  );

  $("#memberCount").textContent = `${rows.length}件`;
  $("#membersTable").innerHTML =
    rows
      .map((member) =>
        [
          `<tr>`,
          cell(
            "氏名",
            stacked(detailLink("member", member.id, member.name), esc([member.number, member.position].filter(Boolean).join("・"))),
            "primary",
          ),
          cell("部署", esc(member.department)),
          cell("雇用形態", employmentTag(member.employmentType ?? "regular")),
          cell("メールアドレス", esc(member.email)),
          cell("割り当て数", `${memberAssignedCount(member.id)}件`, "num"),
          cell("退職・契約終了", endCell(member), "nowrap"),
          cell("ステータス", badge(member.status)),
          rowActions("member", member.id),
          `</tr>`,
        ].join(""),
      )
      .join("") || emptyRow(8, query || type ? "該当する社員はいません" : "社員が登録されていません");
}
