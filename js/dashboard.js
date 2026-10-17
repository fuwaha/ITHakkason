// ダッシュボードの描画（数値の帯・対応が必要なこと・入館パス・最近の操作）
import { licenseById, memberAssignedCount, memberById, state, toolById, usedCount } from "./state.js";
import {
  $,
  annualCost,
  daysUntil,
  esc,
  formatDate,
  memberEnd,
  noticeDeadline,
  renewalBadge,
  shortYen,
  yen,
} from "./helpers.js";
import { ALERT_DAYS, UNUSED_DAYS } from "./constants.js";
import { actionTag, targetLabel } from "./logs.js";

const MAX_CELLS = 20; // 席メーターのマスの最大数

// 席メーター：席が20以下なら1マス=1席、多いときは1マスで数席ぶんにする
function seatMeter(used, total) {
  const cells = Math.max(1, Math.min(total, MAX_CELLS));
  const perCell = total / cells;
  const filled = used === 0 ? 0 : Math.min(cells, Math.max(1, Math.round(used / perCell)));
  const seats = Array.from({ length: cells }, (_, i) => `<span class="seat${i < filled ? " used" : ""}"></span>`).join("");
  const scale =
    perCell > 1 ? `<div class="seat-scale">1マス ≒ ${Math.round(perCell * 10) / 10}席</div>` : "";
  return [
    `<div class="seat-meter" style="--cells:${cells}" role="img" aria-label="${total}席中${used}席を使用中">${seats}</div>`,
    scale,
  ].join("");
}

// 半券の下に出す一言（自動更新・解約の申し出期限）
function passMeta(license) {
  if (!license.autoRenew) return "";
  const deadline = noticeDeadline(license);
  return `<span class="pass-meta">自動更新${deadline ? `・解約は${esc(formatDate(deadline))}まで` : ""}</span>`;
}

// パス1枚。どこを押しても詳細が開く（キーボードではライセンス名のボタンで開く）
function passCard(license, days) {
  const used = usedCount(license.id);
  const total = Number(license.quantity) || 0;
  const left = Math.max(total - used, 0);
  const tone = [
    days !== null && days < 0 ? "is-expired" : days !== null && days <= ALERT_DAYS ? "is-warning" : "",
    left === 0 ? "is-full" : "",
  ].join(" ");

  return [
    `<article class="pass ${tone}" data-detail="license" data-id="${license.id}">`,
    `<div class="pass-stub">`,
    `<span class="pass-slot" aria-hidden="true"></span>`,
    `<span class="pass-tool">${esc(toolById(license.toolId)?.name ?? "（削除済み）")}</span>`,
    `<button type="button" class="pass-name" data-detail="license" data-id="${license.id}">${esc(license.name)}</button>`,
    passMeta(license),
    `</div>`,
    `<div class="pass-body">`,
    `<div class="pass-seats"><span><strong>${used}</strong>/ ${total}席 使用中</span><span>${left === 0 ? "満席" : `残り ${left}席`}</span></div>`,
    seatMeter(used, total),
    `<div class="pass-foot"><span>更新日 ${formatDate(license.renewal)}</span>${renewalBadge(license.renewal)}</div>`,
    `</div>`,
    `</article>`,
  ].join("");
}

// ---- 対応が必要なこと ----
// order が小さいほど上に出す（期限切れ・期限が近いものほど上）
function collectAlerts(activeLicenses) {
  const alerts = [];

  for (const license of activeLicenses) {
    const days = daysUntil(license.renewal);
    if (days !== null && days < 0) {
      alerts.push({
        tone: "danger",
        label: "期限切れ",
        text: `${license.name} の更新日を過ぎています`,
        sub: `更新日 ${formatDate(license.renewal)}`,
        type: "license",
        id: license.id,
        order: days,
      });
    }

    const deadline = noticeDeadline(license);
    const deadlineDays = daysUntil(deadline);
    if (deadlineDays !== null && deadlineDays >= 0 && deadlineDays <= ALERT_DAYS && !(days !== null && days < 0)) {
      alerts.push({
        tone: "warning",
        label: "解約判断",
        text: `${license.name} を続けるか決めてください`,
        sub: `解約の申し出期限 ${formatDate(deadline)}（あと${deadlineDays}日・過ぎると自動更新）`,
        type: "license",
        id: license.id,
        order: deadlineDays,
      });
    }

    const used = usedCount(license.id);
    if (Number(license.quantity) > 0 && used >= Number(license.quantity)) {
      alerts.push({
        tone: "warning",
        label: "満席",
        text: `${license.name} の空きがありません`,
        sub: `${used} / ${license.quantity}席 使用中`,
        type: "license",
        id: license.id,
        order: ALERT_DAYS + 1,
      });
    }
  }

  // 退職・異動・契約終了が近い（過ぎた）のに、ライセンスを持っている人
  for (const member of state.members) {
    const end = memberEnd(member);
    const days = end ? daysUntil(end.date) : null;
    const count = memberAssignedCount(member.id);
    if (days !== null && days <= ALERT_DAYS && count > 0) {
      alerts.push({
        tone: days < 0 ? "danger" : "warning",
        label: end.label === "契約終了" ? "契約終了" : "回収",
        text: `${member.name} さんのライセンス${count}件を回収してください`,
        sub: `${end.label}の予定日 ${formatDate(end.date)}${days >= 0 ? `（あと${days}日）` : "（過ぎています）"}`,
        type: "member",
        id: member.id,
        order: days,
      });
    }
  }

  for (const assignment of state.assignments) {
    const days = daysUntil(assignment.lastUsedAt);
    if (assignment.status !== "assigned" || days === null || -days < UNUSED_DAYS) continue;
    const member = memberById(assignment.memberId);
    const license = licenseById(assignment.licenseId);
    if (!license) continue;
    alerts.push({
      tone: "info",
      label: "未使用",
      text: `${member?.name ?? "（削除済み）"} さんの ${license.name} が${-days}日使われていません`,
      sub: `最終利用 ${formatDate(assignment.lastUsedAt)}・返却すると席が空きます`,
      type: "license",
      id: license.id,
      order: ALERT_DAYS + 2,
    });
  }

  return alerts.sort((a, b) => a.order - b.order);
}

const alertRow = (alert) =>
  [
    `<button type="button" class="alert-row" data-detail="${alert.type}" data-id="${alert.id}">`,
    `<span class="badge ${alert.tone}">${esc(alert.label)}</span>`,
    `<span class="alert-text"><span class="list-main">${esc(alert.text)}</span><span class="list-sub">${esc(alert.sub)}</span></span>`,
    `</button>`,
  ].join("");

export function renderDashboard() {
  // 集計は「有効」なライセンスだけを対象にする
  const activeLicenses = state.licenses.filter((license) => license.status === "active");
  const total = activeLicenses.reduce((sum, license) => sum + (Number(license.quantity) || 0), 0);
  const assigned = activeLicenses.reduce((sum, license) => sum + usedCount(license.id), 0);
  const rate = total ? Math.round((assigned / total) * 100) : 0;

  const annuals = activeLicenses.map(annualCost);
  const annual = annuals.reduce((sum, value) => sum + (value ?? 0), 0);
  const unpriced = annuals.filter((value) => value === null).length;
  const cost = shortYen(annual);

  const alerts = collectAlerts(activeLicenses);
  const urgent = alerts.filter((alert) => alert.tone === "danger").length;

  const metrics = [
    ["有効なライセンス", activeLicenses.length, "件", `ツール ${state.tools.length}件`, ""],
    ["契約している席", total, "席", `使用中 ${assigned}席（${rate}%）`, ""],
    ["空いている席", Math.max(total - assigned, 0), "席", "割り当て可能", ""],
    ["年間費用の見込み", cost.value, cost.unit, unpriced ? `金額未登録・買い切り ${unpriced}件を除く` : `月あたり ${yen(annual / 12)}`, ""],
    [
      "対応が必要",
      alerts.length,
      "件",
      urgent ? `うち至急 ${urgent}件` : alerts.length ? "下の一覧を確認してください" : "対応が必要なものはありません",
      urgent ? "danger" : alerts.length ? "warning" : "",
    ],
  ];

  $("#metrics").innerHTML = metrics
    .map(([label, value, unit, note, tone]) =>
      [
        `<div class="metric">`,
        `<div class="metric-label">${esc(label)}</div>`,
        `<div class="metric-value">${esc(value)}<small>${esc(unit)}</small></div>`,
        `<div class="metric-note ${tone}">${esc(note)}</div>`,
        `</div>`,
      ].join(""),
    )
    .join("");

  $("#alertList").innerHTML =
    alerts.map(alertRow).join("") || '<div class="empty">対応が必要なものはありません</div>';

  // 期限切れ → 期限が近い順 → 日付なし、の順に並べる
  const passes = activeLicenses
    .map((license) => ({ license, days: daysUntil(license.renewal) }))
    .sort((a, b) => (a.days ?? Infinity) - (b.days ?? Infinity));
  $("#passList").innerHTML =
    passes.map(({ license, days }) => passCard(license, days)).join("") ||
    '<div class="empty">有効なライセンスはまだありません。ライセンス管理から登録してください。</div>';

  $("#recentLogs").innerHTML =
    state.logs
      .slice(-5)
      .reverse()
      .map((log) =>
        [
          `<div class="list-row">`,
          `<div class="log-line">`,
          actionTag(log.action),
          `<div class="list-main">${targetLabel(log.target)}</div>`,
          `</div>`,
          `<div class="list-sub">${esc(log.at)}<br>${esc(log.user)}</div>`,
          `</div>`,
        ].join(""),
      )
      .join("") || '<div class="empty">操作履歴はまだありません</div>';
}
