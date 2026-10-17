// 詳細ダイアログ（ライセンス・ツール・社員の全項目を表示）
import { licenseById, memberById, state, toolById, usedCount } from "./state.js";
import {
  $,
  annualCost,
  badge,
  blank,
  daysUntil,
  detailLink,
  esc,
  externalLink,
  formatDate,
  noticeDeadline,
  orBlank,
  renewalBadge,
  statusLabel,
  memberEnd,
  tenure,
  usageBar,
  yen,
} from "./helpers.js";
import { BILLING_TYPES, EMPLOYMENT_TYPES, LICENSE_TYPES, ROLE_DESCRIPTIONS, TYPE_LABELS, UNUSED_DAYS } from "./constants.js";
import { actionTag, targetLabel } from "./logs.js";
import { formatDateTime, roleTag } from "./accounts.js";

// [見出し, [[項目名, HTML], ...]] の並びから定義リストを作る
const section = (title, rows) =>
  [
    `<section class="detail-section">`,
    `<h3>${esc(title)}</h3>`,
    `<dl class="detail-list">`,
    rows.map(([label, html]) => `<dt>${esc(label)}</dt><dd>${html || blank}</dd>`).join(""),
    `</dl>`,
    `</section>`,
  ].join("");

const list = (title, items, empty) =>
  [
    `<section class="detail-section">`,
    `<h3>${esc(title)}</h3>`,
    items.length ? `<ul class="detail-items">${items.join("")}</ul>` : `<p class="muted">${esc(empty)}</p>`,
    `</section>`,
  ].join("");

const date = (value) => (value ? esc(formatDate(value)) : "");
const text = (value) => (value === null || value === undefined || value === "" ? "" : esc(value));
const multiline = (value) => (value ? `<span class="pre">${esc(value)}</span>` : "");

function licenseDetail(license) {
  const used = usedCount(license.id);
  const deadline = noticeDeadline(license);
  const deadlineDays = daysUntil(deadline);
  const annual = annualCost(license);
  const holders = state.assignments
    .filter((item) => item.licenseId === license.id && item.status === "assigned")
    .map((item) => {
      const member = memberById(item.memberId);
      const lastDays = daysUntil(item.lastUsedAt);
      const unused = lastDays !== null && -lastDays >= UNUSED_DAYS;
      const meta = [
        `${formatDate(item.assignedAt)}から`,
        item.lastUsedAt ? `最終利用 ${formatDate(item.lastUsedAt)}` : "",
        item.requestedBy ? `申請: ${item.requestedBy}` : "",
      ].filter(Boolean);
      return [
        `<li class="holding">`,
        `<span class="holding-main">${member ? detailLink("member", member.id, member.name) : "（削除済み）"}`,
        `<small>${esc(member?.department ?? "")}${unused ? `<span class="badge warning">${-lastDays}日未使用</span>` : ""}</small></span>`,
        `<span class="holding-meta muted">${esc(meta.join("・"))}</span>`,
        rowButtons(item.id),
        `</li>`,
      ].join("");
    });
  const seatsLeft = (Number(license.quantity) || 0) - used;
  const canAssign = license.status === "active" && !(daysUntil(license.renewal) < 0) && seatsLeft > 0;

  return {
    subtitle: toolById(license.toolId)?.name ?? "（削除済みのツール）",
    html: [
      section("概要", [
        ["対象ツール", license.toolId && toolById(license.toolId) ? detailLink("tool", license.toolId, toolById(license.toolId).name) : ""],
        ["ライセンスの種類", text(LICENSE_TYPES[license.licenseType])],
        ["利用状況", usageBar(used, Number(license.quantity) || 0)],
        ["ステータス", badge(license.status)],
      ]),
      section("契約期間", [
        ["契約開始日", date(license.startDate)],
        ["契約終了日", date(license.endDate)],
        ["次の更新日", license.renewal ? `${date(license.renewal)} ${license.status === "active" ? renewalBadge(license.renewal) : ""}` : ""],
        ["自動更新", license.autoRenew ? "あり" : "なし"],
        [
          "解約の申し出期限",
          deadline
            ? `${date(deadline)}<span class="muted">（更新日の${esc(license.noticeDays)}日前${deadlineDays !== null && deadlineDays >= 0 ? `・あと${deadlineDays}日` : ""}）</span>`
            : "",
        ],
        ["契約番号", text(license.contractNumber)],
      ]),
      section("費用", [
        [
          "金額",
          license.price !== null && license.price !== undefined && license.price !== ""
            ? `${yen(license.price)}<span class="muted">（${esc(BILLING_TYPES[license.billingType] ?? "")}）</span>`
            : "",
        ],
        ["年額換算", annual !== null ? `${yen(annual)}<span class="muted">（1席あたり ${yen(annual / (Number(license.quantity) || 1))}）</span>` : ""],
        ["費用を負担する部署", text(license.costCenter)],
      ]),
      section("担当・購入先", [
        ["社内の担当者", text(license.owner)],
        ["購入先", text(license.vendor)],
        ["購入先の連絡先", multiline(license.vendorContact)],
        ["契約書・見積書", externalLink(license.documentUrl, "保存場所を開く")],
      ]),
      section("メモ", [["備考", multiline(license.notes)]]),
      [
        `<section class="detail-section">`,
        headingWith(`使っている人（${used}人）`, [
          canAssign ? `<button type="button" class="link-button" data-assign-license="${license.id}">＋ 社員に割り当てる</button>` : "",
        ]),
        holders.length ? `<ul class="detail-items">${holders.join("")}</ul>` : `<p class="muted">まだ割り当てられていません</p>`,
        canAssign ? "" : `<p class="field-hint">${esc(seatsLeft <= 0 ? "空きがないため、これ以上は割り当てできません。" : "有効でないか更新期限を過ぎているため、割り当てできません。")}</p>`,
        `</section>`,
      ].join(""),
    ].join(""),
  };
}

function toolDetail(tool) {
  const licenses = state.licenses
    .filter((license) => license.toolId === tool.id)
    .map(
      (license) =>
        `<li>${detailLink("license", license.id, license.name)}<span class="muted">${usedCount(license.id)} / ${esc(license.quantity)}席・${esc(statusLabel(license.status))}</span></li>`,
    );
  return {
    subtitle: tool.provider ?? "",
    html: [
      section("基本情報", [
        ["提供会社", text(tool.provider)],
        ["カテゴリ", text(tool.category)],
        ["ステータス", badge(tool.status)],
        ["説明", multiline(tool.description)],
      ]),
      section("リンク", [
        ["管理画面", externalLink(tool.adminUrl, "管理画面を開く")],
        ["公式サイト", externalLink(tool.officialUrl, "公式サイトを開く")],
      ]),
      section("メモ", [["備考", multiline(tool.notes)]]),
      list(`ライセンス（${licenses.length}件）`, licenses, "ライセンスはまだ登録されていません"),
    ].join(""),
  };
}

// 割り当て1件ぶんの操作（管理者だけ）
const rowButtons = (assignmentId) =>
  [
    `<span class="holding-actions admin-only">`,
    `<button type="button" class="link-button" data-edit="assignment" data-id="${assignmentId}">編集</button>`,
    `<button type="button" class="link-button" data-release="${assignmentId}">返却</button>`,
    `</span>`,
  ].join("");

// 見出しと右側のボタン
const headingWith = (title, buttons) =>
  `<div class="detail-section-heading"><h3>${esc(title)}</h3><span class="heading-buttons admin-only">${buttons.filter(Boolean).join("")}</span></div>`;

// 詳細の上部に出す数字の帯
const stats = (items) =>
  `<div class="detail-stats">${items
    .map(([label, value, note = ""]) => `<div><span class="detail-stat-label">${esc(label)}</span><strong>${value}</strong>${note ? `<small>${note}</small>` : ""}</div>`)
    .join("")}</div>`;

// 1席あたりの年額（金額が無い・買い切りなら null）
const seatAnnual = (license) => {
  const annual = annualCost(license);
  return annual === null ? null : annual / (Number(license.quantity) || 1);
};

// 対象の名前を含む操作履歴（新しい順）
const logsAbout = (predicate, limit = 8) =>
  state.logs
    .filter(predicate)
    .slice(-limit)
    .reverse()
    .map(
      (log) =>
        `<li class="log-item">${actionTag(log.action)}<span class="log-target">${targetLabel(log.target)}</span><span class="muted">${esc(log.at)}・${esc(log.user)}</span></li>`,
    );

function memberDetail(member) {
  const end = memberEnd(member);
  const endDays = end ? daysUntil(end.date) : null;
  const manager = member.managerId ? memberById(member.managerId) : null;
  const reports = state.members.filter((other) => other.managerId === member.id);
  const mine = state.assignments.filter((item) => item.memberId === member.id);
  const active = mine.filter((item) => item.status === "assigned");
  const released = mine
    .filter((item) => item.status !== "assigned")
    .sort((a, b) => String(b.releasedAt).localeCompare(String(a.releasedAt)));

  const costs = active.map((item) => seatAnnual(licenseById(item.licenseId) ?? {}));
  const totalCost = costs.reduce((sum, value) => sum + (value ?? 0), 0);
  const unknown = costs.filter((value) => value === null).length;

  const activeItems = active.map((item) => {
    const license = licenseById(item.licenseId);
    const lastDays = daysUntil(item.lastUsedAt);
    const unused = lastDays !== null && -lastDays >= UNUSED_DAYS;
    const meta = [
      `${formatDate(item.assignedAt)}から`,
      item.lastUsedAt ? `最終利用 ${formatDate(item.lastUsedAt)}` : "",
      license && seatAnnual(license) !== null ? `年 ${yen(seatAnnual(license))}` : "",
    ].filter(Boolean);
    return [
      `<li class="holding">`,
      `<span class="holding-main">${license ? detailLink("license", license.id, license.name) : "（削除済み）"}`,
      `<small>${esc(toolById(license?.toolId)?.name ?? "")}${unused ? `<span class="badge warning">${-lastDays}日未使用</span>` : ""}</small></span>`,
      `<span class="holding-meta muted">${esc(meta.join("・"))}</span>`,
      rowButtons(item.id),
      `</li>`,
    ].join("");
  });

  const historyItems = released.map((item) => {
    const license = licenseById(item.licenseId);
    return [
      `<li class="holding">`,
      `<span class="holding-main">${license ? detailLink("license", license.id, license.name) : "（削除済み）"}`,
      `<small>${esc(item.releaseReason ?? "")}</small></span>`,
      `<span class="holding-meta muted">${esc(`${formatDate(item.assignedAt)} 〜 ${formatDate(item.releasedAt)}`)}</span>`,
      `</li>`,
    ].join("");
  });

  const holdingTitle = headingWith(`使っているライセンス（${active.length}件）`, [
    member.status === "active"
      ? `<button type="button" class="link-button" data-assign-member="${member.id}">＋ ライセンスを割り当てる</button>`
      : "",
    active.length ? `<button type="button" class="link-button danger" data-release-all="${member.id}">まとめて返却</button>` : "",
  ]);

  return {
    subtitle: [member.department, member.position, EMPLOYMENT_TYPES[member.employmentType ?? "regular"]].filter(Boolean).join(" / "),
    html: [
      stats([
        ["使っているライセンス", `${active.length}<small>件</small>`],
        ["年間費用（席単価の合計）", esc(yen(totalCost)), unknown ? esc(`金額未登録 ${unknown}件を除く`) : ""],
        [
          end ? `${end.label}の予定` : "退職・契約終了の予定",
          end ? esc(formatDate(end.date)) : "—",
          endDays !== null ? esc(endDays >= 0 ? `あと${endDays}日` : "過ぎています") : "",
        ],
      ]),
      `<section class="detail-section">${holdingTitle}${
        activeItems.length ? `<ul class="detail-items">${activeItems.join("")}</ul>` : `<p class="muted">割り当てられているライセンスはありません</p>`
      }</section>`,
      section("基本情報", [
        ["メールアドレス", text(member.email)],
        ["社員番号", text(member.number)],
        ["部署", text(member.department)],
        ["役職", text(member.position)],
        ["上長", manager ? detailLink("member", manager.id, manager.name) : ""],
        ["部下", reports.map((other) => detailLink("member", other.id, other.name)).join("、")],
        ["ステータス", badge(member.status)],
      ]),
      section("雇用", [
        ["雇用形態", text(EMPLOYMENT_TYPES[member.employmentType ?? "regular"])],
        ["入社日", member.hireDate ? `${date(member.hireDate)}<span class="muted">（${esc(tenure(member.hireDate))}）</span>` : ""],
        ["契約終了日", date(member.contractEndDate)],
        ["退職・異動の予定日", date(member.leaveDate)],
        ["備考", multiline(member.notes)],
      ]),
      list(`返却したライセンス（${released.length}件）`, historyItems, "返却の履歴はありません"),
      list("関連する操作", logsAbout((log) => String(log.target).includes(member.name)), "操作の履歴はありません"),
    ].join(""),
  };
}

function accountDetail(user) {
  const assignedCount = state.assignments.filter(
    (item) => item.assignedById === user.id || (!item.assignedById && item.assignedBy === user.name),
  ).length;
  const releasedCount = state.assignments.filter(
    (item) => item.releasedById === user.id || (!item.releasedById && item.releasedBy === user.name),
  ).length;
  return {
    subtitle: user.email,
    html: [
      stats([
        ["権限", roleTag(user.role)],
        ["最終ログイン", formatDateTime(user.lastLoginAt) || "—"],
        ["状態", badge(user.status === "inactive" ? "inactive" : "active")],
      ]),
      section("基本情報", [
        ["名前", text(user.name)],
        ["メールアドレス", text(user.email)],
        ["できること", esc(ROLE_DESCRIPTIONS[user.role] ?? "")],
        ["登録日", formatDateTime(String(user.createdAt ?? "").slice(0, 10))],
      ]),
      section("これまでの作業", [
        ["割り当てた件数", `${assignedCount}件`],
        ["返却を処理した件数", `${releasedCount}件`],
      ]),
      list("最近の操作", logsAbout((log) => log.user === user.name, 10), "操作の履歴はありません"),
    ].join(""),
  };
}

const BUILDERS = { license: licenseDetail, tool: toolDetail, member: memberDetail, account: accountDetail };
const FINDERS = {
  license: licenseById,
  tool: toolById,
  member: memberById,
  account: (id) => state.users.find((user) => user.id === Number(id)),
};

let current = null; // いま開いている詳細（フォームを閉じたあと戻るため）
export const currentDetail = () => current;

export function openDetail(type, id) {
  const item = FINDERS[type]?.(id);
  if (!item) return;
  current = { type, id: item.id };
  const { subtitle, html } = BUILDERS[type](item);
  $("#detailKind").textContent = `${TYPE_LABELS[type]}${subtitle ? `｜${subtitle}` : ""}`;
  $("#detailTitle").textContent = item.name;
  $("#detailBody").innerHTML = html;
  const edit = $("#detailEdit");
  edit.dataset.edit = type;
  edit.dataset.id = String(item.id);
  const dialog = $("#detailDialog");
  if (!dialog.open) dialog.showModal();
  $("#detailBody").scrollTop = 0;
}

export const closeDetail = () => {
  if ($("#detailDialog").open) $("#detailDialog").close();
};

$("#detailDialog").addEventListener("close", () => {
  current = null;
});

document.querySelectorAll("[data-close-detail]").forEach((button) => button.addEventListener("click", closeDetail));
