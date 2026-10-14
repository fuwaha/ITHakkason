// クリック操作（画面切替・編集・削除・返却）
import { licenseById, save, state, usedCount } from "./state.js";
import { notify } from "./helpers.js";
import { COLLECTIONS } from "./constants.js";
import { isAdmin } from "./auth.js";
import { addLog } from "./logs.js";
import { render, showView } from "./render.js";
import { openForm } from "./forms.js";

function deleteBlockedReason(type, item) {
  if (type === "tool" && state.licenses.some((license) => license.toolId === item.id)) {
    return "ライセンスが登録されているツールは削除できません。先にライセンスを削除してください。";
  }
  if (type === "license" && usedCount(item.id) > 0) {
    return "割り当て中のライセンスは削除できません。先に返却してください。";
  }
  if (
    type === "member" &&
    state.assignments.some((a) => a.memberId === item.id && a.status === "assigned")
  ) {
    return "ライセンスを利用中の利用者は削除できません。先に返却してください。";
  }
  return "";
}

document.addEventListener("click", (event) => {
  const target = event.target.closest(
    "[data-view], [data-view-target], [data-edit], [data-delete], [data-release]",
  );
  if (!target) return;

  if (target.dataset.view || target.dataset.viewTarget) {
    return showView(target.dataset.view || target.dataset.viewTarget);
  }

  const type = target.dataset.edit || target.dataset.delete;

  if (target.dataset.edit) {
    return openForm(
      type,
      { tool: state.tools, license: state.licenses, member: state.members }[type].find(
        (item) => item.id === Number(target.dataset.id),
      ),
    );
  }

  if (target.dataset.delete) {
    if (!isAdmin()) return notify("この操作には管理者権限が必要です。", true);
    const items = state[COLLECTIONS[type]];
    const item = items.find((entry) => entry.id === Number(target.dataset.id));

    const blocked = deleteBlockedReason(type, item);
    if (blocked) return notify(blocked, true);
    if (!confirm(`${item.name}を削除しますか？`)) return;

    items.splice(items.indexOf(item), 1);
    addLog("削除", item.name);
    save();
    notify("削除しました");
    render();
  }

  if (target.dataset.release) {
    if (!isAdmin()) return notify("この操作には管理者権限が必要です。", true);
    const assignment = state.assignments.find((item) => item.id === Number(target.dataset.release));
    assignment.status = "released";
    addLog("返却", licenseById(assignment.licenseId)?.name);
    save();
    notify("返却しました");
    render();
  }
});
