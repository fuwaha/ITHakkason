// クリック操作（画面切替・フォームを開く・編集・削除・返却）
import { save, state, usedCount } from "./state.js";
import { notify } from "./helpers.js";
import { COLLECTIONS, TYPE_LABELS } from "./constants.js";
import { isAdmin } from "./auth.js";
import { addLog, describe } from "./logs.js";
import { render, showView } from "./render.js";
import { openForm } from "./forms.js";
import { closeDetail, currentDetail, openDetail } from "./detail.js";
import { $ } from "./helpers.js";
import { accountChangeProblem } from "./accounts.js";

function deleteBlockedReason(type, item) {
  if (type === "tool" && state.licenses.some((license) => license.toolId === item.id)) {
    return "ライセンスが登録されているツールは削除できません。先にライセンスを削除するか、ステータスを「無効」にしてください。";
  }
  if (type === "license" && usedCount(item.id) > 0) {
    return "割り当て中のライセンスは削除できません。先に返却してください。";
  }
  if (
    type === "member" &&
    state.assignments.some((a) => a.memberId === item.id && a.status === "assigned")
  ) {
    return "ライセンスを利用中の社員は削除できません。先に返却してください。";
  }
  return "";
}

const findItem = (type, id) => state[COLLECTIONS[type]]?.find((item) => item.id === Number(id));

function deleteItem(type, id) {
  const items = state[COLLECTIONS[type]];
  const item = findItem(type, id);
  if (!item) return notify("対象のデータが見つかりません。画面を読み込み直してください。", true);

  const blocked = deleteBlockedReason(type, item);
  if (blocked) return notify(blocked, true);

  // 履歴がある場合は、削除ではなく「無効」にする方法も案内する
  const hasHistory =
    (type === "member" && state.assignments.some((a) => a.memberId === item.id)) ||
    (type === "license" && state.assignments.some((a) => a.licenseId === item.id));
  const note = hasHistory
    ? "\n\n割り当ての履歴があります。履歴を残したい場合は、削除せずにステータスを変更してください。"
    : "";
  if (!confirm(`${TYPE_LABELS[type]}「${item.name}」を削除しますか？${note}`)) return;

  addLog("削除", describe(type, item));
  items.splice(items.indexOf(item), 1);
  save();
  notify("削除しました");
  render();
}

// 返却は、返却日と理由を入力するフォームを開く
function releaseAssignment(id) {
  const assignment = state.assignments.find((item) => item.id === Number(id));
  if (!assignment || assignment.status !== "assigned") {
    return notify("対象の割り当てが見つかりません。画面を読み込み直してください。", true);
  }
  openForm("release", assignment);
}

// アカウントの有効・無効を切り替える（削除はせず、操作履歴を残すため無効にする）
function toggleAccount(id) {
  const user = state.users.find((item) => item.id === Number(id));
  if (!user) return notify("対象のアカウントが見つかりません。画面を読み込み直してください。", true);
  const next = user.status === "inactive" ? "active" : "inactive";
  const problem = accountChangeProblem(user, user.role, next);
  if (problem) return notify(problem, true);
  if (next === "inactive" && !confirm(`${user.name} さんのアカウントを無効にしますか？\n無効にすると、この人はログインできなくなります。`)) return;
  user.status = next;
  addLog(next === "inactive" ? "無効化" : "有効化", describe("account", user));
  save();
  notify(next === "inactive" ? "アカウントを無効にしました" : "アカウントを有効にしました");
  render();
}

// 詳細から編集・返却したときは、フォームを閉じたあと詳細に戻る
let returnTo = null;
const backToDetail = () => {
  if (!returnTo) return;
  const { type, id } = returnTo;
  returnTo = null;
  openDetail(type, id);
};
$("#formDialog").addEventListener("close", backToDetail);

document.addEventListener("click", (event) => {
  const target = event.target.closest(
    "[data-view], [data-view-target], [data-open-form], [data-detail], [data-edit], [data-delete], [data-release], [data-release-all], [data-assign-member], [data-assign-license], [data-password], [data-account-toggle]",
  );
  if (!target) return;
  const {
    view,
    viewTarget,
    openForm: formType,
    detail,
    edit,
    delete: deleteType,
    release,
    releaseAll,
    assignMember,
    assignLicense,
    password,
    accountToggle,
    id,
  } = target.dataset;

  if (view || viewTarget) return showView(view || viewTarget);
  // 詳細は誰でも見られる
  if (detail) return openDetail(detail, id);
  if (formType) return openForm(formType);

  if (!isAdmin()) return notify("この操作には管理者権限が必要です。", true);

  if (target.closest("#detailDialog")) returnTo = currentDetail();
  closeDetail();
  handleAdminAction({ edit, deleteType, release, releaseAll, assignMember, assignLicense, password, accountToggle, id });
  // フォームが開かなかった（エラーなど）ときは、すぐ詳細に戻す
  if (!$("#formDialog").open) backToDetail();
});

function handleAdminAction({ edit, deleteType, release, releaseAll, assignMember, assignLicense, password, accountToggle, id }) {
  // 詳細から割り当てるときは、社員かライセンスを入力済みでフォームを開く
  if (assignMember) return openForm("assignment", null, { memberId: Number(assignMember) });
  if (assignLicense) return openForm("assignment", null, { licenseId: Number(assignLicense) });
  if (edit) {
    const item = findItem(edit, id);
    if (!item) return notify("対象のデータが見つかりません。画面を読み込み直してください。", true);
    return openForm(edit, item);
  }
  if (deleteType) return deleteItem(deleteType, id);
  if (release) return releaseAssignment(release);
  if (releaseAll) {
    const member = state.members.find((item) => item.id === Number(releaseAll));
    if (!member) return notify("対象の社員が見つかりません。", true);
    return openForm("releaseAll", member);
  }
  if (password) {
    const user = state.users.find((item) => item.id === Number(password));
    if (!user) return notify("対象のアカウントが見つかりません。", true);
    return openForm("password", user);
  }
  if (accountToggle) return toggleAccount(accountToggle);
}
