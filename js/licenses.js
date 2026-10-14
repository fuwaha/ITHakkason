// ライセンス管理の描画
import { state, toolById } from "./state.js";
import { $, badge, esc, formatDate } from "./helpers.js";

export function renderLicenses() {
  const query = ($("#licenseSearch")?.value || "").toLowerCase();
  const rows = state.licenses.filter((license) =>
    `${license.name} ${toolById(license.toolId)?.name}`.toLowerCase().includes(query),
  );

  $("#licenseCount").textContent = `${rows.length}件`;
  $("#licensesTable").innerHTML =
    rows
      .map((license) => {
        const used = state.assignments.filter(
          (item) => item.licenseId === license.id && item.status === "assigned",
        ).length;

        return [
          `<tr>`,
          `<td><strong>${esc(license.name)}</strong></td>`,
          `<td>${esc(toolById(license.toolId)?.name)}</td>`,
          `<td>${license.quantity}</td>`,
          `<td>${used}</td>`,
          `<td>${formatDate(license.renewal)}</td>`,
          `<td>${badge(license.status)}</td>`,
          `<td><div class="row-actions">`,
          `<button class="link-button" data-edit="license" data-id="${license.id}">編集</button>`,
          `<button class="link-button danger" data-delete="license" data-id="${license.id}">削除</button>`,
          `</div></td>`,
          `</tr>`,
        ].join("");
      })
      .join("") || '<tr><td class="empty" colspan="7">該当するライセンスはありません</td></tr>';
}
