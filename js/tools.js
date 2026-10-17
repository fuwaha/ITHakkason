// ツール管理の描画
import { state } from "./state.js";
import { $, badge, blank, cell, detailLink, emptyRow, esc, externalLink, matches, searchQuery } from "./helpers.js";

export const rowActions = (type, id) =>
  cell(
    "操作",
    [
      `<div class="row-actions admin-only">`,
      `<button type="button" class="link-button" data-edit="${type}" data-id="${id}">編集</button>`,
      `<button type="button" class="link-button danger" data-delete="${type}" data-id="${id}">削除</button>`,
      `</div>`,
    ].join(""),
    "actions",
  );

export function renderTools() {
  const query = searchQuery("#toolSearch");
  const rows = state.tools.filter((tool) =>
    matches(query, tool.name, tool.provider, tool.category, tool.description),
  );

  $("#toolCount").textContent = `${rows.length}件`;
  $("#toolsTable").innerHTML =
    rows
      .map((tool) => {
        const licenses = state.licenses.filter((license) => license.toolId === tool.id);
        const seats = licenses.reduce((sum, license) => sum + (Number(license.quantity) || 0), 0);

        return [
          `<tr>`,
          cell("ツール名", detailLink("tool", tool.id, tool.name), "primary"),
          cell("提供会社", esc(tool.provider)),
          cell("カテゴリ", esc(tool.category)),
          cell("契約数合計", `${seats}席<small class="muted">（${licenses.length}件）</small>`, "num"),
          cell("管理画面", externalLink(tool.adminUrl, "開く") || blank),
          cell("ステータス", badge(tool.status)),
          rowActions("tool", tool.id),
          `</tr>`,
        ].join("");
      })
      .join("") || emptyRow(7, query ? "該当するツールはありません" : "ツールが登録されていません");
}
