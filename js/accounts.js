// アカウント管理（PassHub にログインする人）の描画
// ※ 本番では一覧・追加・権限変更はすべてサーバー側で権限チェックを行うこと
import { state } from "./state.js";
import { $, badge, blank, cell, detailLink, emptyRow, esc, matches, searchQuery } from "./helpers.js";
import { ROLE_LABELS } from "./constants.js";
import { currentUser } from "./auth.js";

// 「2026-10-17 09:12」→「2026/10/17 09:12」
export const formatDateTime = (value) => (value ? esc(String(value).replace(/-/g, "/")) : "");

export const roleTag = (role) => `<span class="role-tag role-${esc(role)}">${esc(ROLE_LABELS[role] ?? role)}</span>`;

export function renderAccounts() {
  const tbody = $("#accountsTable");
  if (!tbody) return;
  const query = searchQuery("#accountSearch");
  const me = currentUser();
  const rows = state.users.filter((user) => matches(query, user.name, user.email));

  $("#accountCount").textContent = `${rows.length}件`;
  tbody.innerHTML =
    rows
      .map((user) => {
        const self = user.id === me?.id;
        const active = user.status !== "inactive";
        // 自分自身は無効にできない（締め出し防止）
        const toggle = self
          ? ""
          : `<button type="button" class="link-button${active ? " danger" : ""}" data-account-toggle="${user.id}">${active ? "無効にする" : "有効にする"}</button>`;
        return [
          `<tr>`,
          cell("名前", `${detailLink("account", user.id, user.name)}${self ? ` <span class="tag">あなた</span>` : ""}`, "primary"),
          cell("メールアドレス", esc(user.email)),
          cell("権限", roleTag(user.role)),
          cell("最終ログイン", formatDateTime(user.lastLoginAt) || blank, "nowrap"),
          cell("状態", badge(active ? "active" : "inactive")),
          cell(
            "操作",
            [
              `<div class="row-actions admin-only">`,
              `<button type="button" class="link-button" data-edit="account" data-id="${user.id}">編集</button>`,
              `<button type="button" class="link-button" data-password="${user.id}">パスワード再設定</button>`,
              toggle,
              `</div>`,
            ].join(""),
            "actions",
          ),
          `</tr>`,
        ].join("");
      })
      .join("") || emptyRow(6, "該当するアカウントはありません");
}

// 管理者がいなくなる・自分を締め出す変更を防ぐ（問題なければ空文字）
export function accountChangeProblem(user, nextRole, nextStatus) {
  const me = currentUser();
  const losingAdmin = user.role === "admin" && user.status !== "inactive" && (nextRole !== "admin" || nextStatus === "inactive");
  if (user.id === me?.id && nextStatus === "inactive") return "自分自身のアカウントは無効にできません。";
  if (user.id === me?.id && nextRole !== "admin") return "自分自身の権限は変更できません。ほかの管理者に変更してもらってください。";
  if (losingAdmin) {
    const otherAdmins = state.users.filter(
      (other) => other.id !== user.id && other.role === "admin" && other.status !== "inactive",
    );
    if (otherAdmins.length === 0) return "有効な管理者が1人もいなくなるため、変更できません。";
  }
  return "";
}

$("#accountSearch")?.addEventListener("input", renderAccounts);
