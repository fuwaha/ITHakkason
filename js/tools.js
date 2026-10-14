// ツール管理の描画
import { state } from "./state.js";
import { $, badge, esc } from "./helpers.js";

export function renderTools() {
  const query = ($("#toolSearch")?.value || "").toLowerCase();
  const rows = state.tools.filter((tool) =>
    `${tool.name} ${tool.provider}`.toLowerCase().includes(query),
  );

  $("#toolCount").textContent = `${rows.length}件`;
  $("#toolsTable").innerHTML =
    rows
      .map((tool) => {
        const count = state.licenses
          .filter((license) => license.toolId === tool.id)
          .reduce((sum, license) => sum + license.quantity, 0);

        return [
          `<tr>`,
          `<td><strong>${esc(tool.name)}</strong></td>`,
          `<td>${esc(tool.provider)}</td>`,
          `<td>${esc(tool.category)}</td>`,
          `<td>${count}</td>`,
          `<td>${badge(tool.status)}</td>`,
          `<td><div class="row-actions">`,
          `<button class="link-button" data-edit="tool" data-id="${tool.id}">編集</button>`,
          `<button class="link-button danger" data-delete="tool" data-id="${tool.id}">削除</button>`,
          `</div></td>`,
          `</tr>`,
        ].join("");
      })
      .join("") || '<tr><td class="empty" colspan="6">該当するツールはありません</td></tr>';
}
