// CSV 出力・取込
import { nextId, save, state, toolById } from "./state.js";
import { $, notify, statusLabel } from "./helpers.js";
import { isAdmin } from "./auth.js";
import { addLog } from "./logs.js";
import { render } from "./render.js";

// CSVの1セル分（Excelで数式として実行されないよう先頭の記号を無効化）
const csvCell = (value) => {
  let text = String(value ?? "");
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};

function downloadCsv(filename, headers, rows) {
  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");

  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }));
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

$("#exportLicensesButton").addEventListener("click", () =>
  downloadCsv(
    "licenses.csv",
    ["ライセンス名", "対象ツール", "契約数", "利用数", "更新日", "ステータス"],
    state.licenses.map((license) => [
      license.name,
      toolById(license.toolId)?.name,
      license.quantity,
      state.assignments.filter(
        (item) => item.licenseId === license.id && item.status === "assigned",
      ).length,
      license.renewal,
      statusLabel(license.status),
    ]),
  ),
);

$("#exportMembersButton").addEventListener("click", () =>
  downloadCsv(
    "members.csv",
    ["氏名", "メールアドレス", "社員番号", "部署", "ステータス"],
    state.members.map((member) => [
      member.name,
      member.email,
      member.number,
      member.department,
      statusLabel(member.status),
    ]),
  ),
);

// ダブルクォート内のカンマ・改行にも対応した簡易CSVパーサー
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((value) => value.trim()));
}

$("#importButton").addEventListener("click", () => $("#memberImport").click());

$("#memberImport").addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    if (!isAdmin()) return notify("この操作には管理者権限が必要です。", true);

    // 1行目はヘッダーとして読み飛ばす
    const rows = parseCsv(String(reader.result).replace(/^\ufeff/, "")).slice(1);
    let added = 0;
    let skipped = 0;

    rows.forEach((row) => {
      const [name, email, number, department] = row.map((value) => value.trim());
      const invalid = !name || !email || !number || !department;
      const duplicated =
        !invalid &&
        state.members.some(
          (member) =>
            member.email.toLowerCase() === email.toLowerCase() || member.number === number,
        );

      if (invalid || duplicated) {
        skipped++;
        return;
      }
      state.members.push({
        id: nextId(state.members),
        name,
        email,
        number,
        department,
        status: "active",
      });
      added++;
    });

    addLog("CSV取込", `${added}件の利用者`);
    save();
    render();
    notify(`${added}件を取り込みました（${skipped}件はスキップ）`, added === 0 && skipped > 0);
    event.target.value = "";
  };
  reader.readAsText(file, "UTF-8");
});
