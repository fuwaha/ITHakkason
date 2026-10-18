// ライセンス管理の描画
import { state, toolById, usedCount } from "./state.js";
import {
  $,
  annualCost,
  badge,
  blank,
  cell,
  detailLink,
  emptyRow,
  esc,
  formatDate,
  matches,
  orBlank,
  renewalBadge,
  searchQuery,
  stacked,
  usageBar,
  yen,
} from "./helpers.js";
import { BILLING_TYPES } from "./constants.js";

// 費用の列：年額換算を大きく、元の金額と周期を小さく
function costCell(license) {
  const annual = annualCost(license);
  const hasPrice = license.price !== null && license.price !== undefined && license.price !== "";
  if (!hasPrice) return blank;
  const cycle = BILLING_TYPES[license.billingType] ?? "";
  // 月額は年額に換算して大きく出し、元の月額を下に小さく出す
  if (license.billingType === "monthly" && annual !== null) {
    return stacked(`${esc(yen(annual))}<small class="unit">/年</small>`, esc(`${yen(license.price)} / ${cycle}`));
  }
  return stacked(esc(yen(license.price)), esc(cycle));
}

export function renderLicenses() {
  const query = searchQuery("#licenseSearch");
  const rows = state.licenses.filter((license) =>
    matches(
      query,
      license.name,
      toolById(license.toolId)?.name,
      license.contractNumber,
      license.vendor,
      license.owner,
      license.costCenter,
    ),
  );

  $("#licenseCount").textContent = `${rows.length}件`;
  $("#licensesTable").innerHTML =
    rows
      .map((license) => {
        const renewalSub = [
          license.status === "active" ? renewalBadge(license.renewal) : "",
          license.autoRenew ? `<span class="tag">自動更新</span>` : "",
        ].join("");
        return [
          `<tr>`,
          cell(
            "ライセンス名",
            stacked(detailLink("license", license.id, license.name), esc(toolById(license.toolId)?.name ?? "（削除済み）")),
            "primary",
          ),
          cell("利用状況", usageBar(usedCount(license.id), Number(license.quantity) || 0)),
          cell("更新日", stacked(formatDate(license.renewal), renewalSub), "nowrap"),
          cell("費用", costCell(license), "nowrap"),
          cell("担当者", orBlank(license.owner), "nowrap"),
          cell("ステータス", badge(license.status)),
          // 月額ライセンスの解約・再開は管理者でなくてもできる。編集・削除は管理者だけ
          cell(
            "操作",
            [
              `<div class="row-actions">`,
              (license.billing ?? license.billingType) === "monthly"
                ? `<button type="button" class="link-button${license.status === "active" ? " danger" : ""}" data-license-toggle="${license.id}">${license.status === "active" ? "解約" : "再開"}</button>`
                : "",
              `<button type="button" class="link-button admin-only" data-edit="license" data-id="${license.id}">編集</button>`,
              `<button type="button" class="link-button danger admin-only" data-delete="license" data-id="${license.id}">削除</button>`,
              `</div>`,
            ].join(""),
            "actions",
          ),
          `</tr>`,
        ].join("");
      })
      .join("") ||
    emptyRow(7, query ? "該当するライセンスはありません" : "ライセンスが登録されていません");
}
