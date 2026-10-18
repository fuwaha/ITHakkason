// CSV 出力・取込
import { memberAssignedCount, nextId, save, state, toolById, usedCount } from "./state.js";
import { $, annualCost, noticeDeadline, notify, statusLabel } from "./helpers.js";
import { BILLING_TYPES, EMPLOYMENT_TYPES, LICENSE_TYPES } from "./constants.js";
import { isAdmin } from "./auth.js";
import { addLog } from "./logs.js";
import { render } from "./render.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// CSVの1セル分（Excelで数式として実行されないよう、先頭の記号やタブ・改行を無効化）
const csvCell = (value) => {
  let text = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};

function downloadCsv(filename, headers, rows) {
  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  // すぐに解放するとダウンロードが失敗するブラウザがあるので、少し待つ
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const dated = (name) => `${name}_${new Date().toLocaleDateString("sv-SE")}.csv`;

$("#exportLicensesButton").addEventListener("click", () =>
  downloadCsv(
    dated("licenses"),
    [
      "ライセンス名", "対象ツール", "ライセンスの種類", "契約数", "利用数", "ステータス",
      "契約開始日", "契約終了日", "次の更新日", "自動更新", "解約の申し出期限", "契約番号",
      "金額", "課金周期", "年額換算", "費用を負担する部署",
      "社内の担当者", "購入先", "購入先の連絡先", "契約書・見積書の保存場所", "備考",
    ],
    state.licenses.map((license) => [
      license.name,
      toolById(license.toolId)?.name,
      LICENSE_TYPES[license.licenseType],
      license.quantity,
      usedCount(license.id),
      statusLabel(license.status),
      license.startDate,
      license.endDate,
      license.renewal,
      license.autoRenew ? "あり" : "なし",
      noticeDeadline(license),
      license.contractNumber,
      license.price,
      BILLING_TYPES[license.billingType],
      annualCost(license),
      license.costCenter,
      license.owner,
      license.vendor,
      license.vendorContact,
      license.documentUrl,
      license.notes,
    ]),
  ),
);

$("#exportMembersButton").addEventListener("click", () =>
  downloadCsv(
    dated("members"),
    [
      "氏名", "メールアドレス", "社員番号", "部署", "役職", "上長", "雇用形態", "入社日",
      "契約終了日", "退職・異動の予定日", "割り当て数", "ステータス", "備考",
    ],
    state.members.map((member) => [
      member.name,
      member.email,
      member.number,
      member.department,
      member.position,
      state.members.find((other) => other.id === member.managerId)?.name,
      EMPLOYMENT_TYPES[member.employmentType ?? "regular"],
      member.hireDate,
      member.contractEndDate,
      member.leaveDate,
      memberAssignedCount(member.id),
      statusLabel(member.status),
      member.notes,
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

// UTF-8 として読めなければ Shift_JIS（Excel で保存した日本語CSVに多い）として読み直す
function decodeCsv(buffer) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer).replace(/^﻿/, "");
  } catch {
    return new TextDecoder("shift_jis").decode(buffer);
  }
}

// 見出し名から列の位置を探す（見つからなければ「氏名, メールアドレス, 社員番号, 部署」の順とみなす）
const COLUMN_NAMES = {
  name: ["氏名", "名前", "name"],
  email: ["メールアドレス", "メール", "email", "e-mail"],
  number: ["社員番号", "利用者番号", "従業員番号", "number", "member_number"],
  department: ["部署", "所属", "department"],
};
// あれば読み込む列（無くても取り込める）
const OPTIONAL_COLUMNS = {
  position: ["役職", "position"],
  employmentType: ["雇用形態", "employment_type"],
  hireDate: ["入社日", "hire_date"],
  contractEndDate: ["契約終了日", "contract_end_date"],
};

function columnIndexes(header) {
  const normalized = header.map((value) => value.trim().toLowerCase());
  const indexes = {};
  Object.entries(COLUMN_NAMES).forEach(([key, names], fallback) => {
    const found = normalized.findIndex((value) => names.includes(value));
    indexes[key] = found >= 0 ? found : fallback;
  });
  Object.entries(OPTIONAL_COLUMNS).forEach(([key, names]) => {
    indexes[key] = normalized.findIndex((value) => names.includes(value)); // 無ければ -1
  });
  return indexes;
}

// 「契約社員」→ contract。分からなければ正社員
const employmentKey = (label) =>
  Object.entries(EMPLOYMENT_TYPES).find(([key, text]) => text === label || key === label)?.[0] ?? "regular";
// 「2024/4/1」も「2024-04-01」にそろえる
const toDate = (value) => {
  const match = String(value).trim().match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  return match ? `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}` : "";
};

function importMembers(rows) {
  const [header, ...body] = rows;
  if (!header) return { added: 0, skipped: [] };
  const index = columnIndexes(header);
  let added = 0;
  const skipped = [];

  body.forEach((row, i) => {
    const line = i + 2; // 見出しが1行目
    const get = (key) => (index[key] >= 0 ? row[index[key]] ?? "" : "").trim();
    const name = get("name");
    const email = get("email").toLowerCase();
    const number = get("number");
    const department = get("department");

    if (!name || !email || !number || !department) return skipped.push(`${line}行目: 未入力の項目があります`);
    if (!EMAIL_PATTERN.test(email)) return skipped.push(`${line}行目: メールアドレスの形式が正しくありません`);
    if (
      state.members.some(
        (member) => member.email.toLowerCase() === email || member.number === number,
      )
    ) {
      return skipped.push(`${line}行目: メールアドレスか社員番号が登録済みです`);
    }

    state.members.push({
      id: nextId(state.members),
      name,
      email,
      number,
      department,
      position: get("position"),
      employmentType: employmentKey(get("employmentType")),
      hireDate: toDate(get("hireDate")),
      contractEndDate: toDate(get("contractEndDate")),
      status: "active",
    });
    added++;
  });
  return { added, skipped };
}

$("#importButton").addEventListener("click", () => {
  if (!isAdmin()) return notify("この操作には管理者権限が必要です。", true);
  $("#memberImport").click();
});

$("#memberImport").addEventListener("change", async (event) => {
  const input = event.target;
  const file = input.files[0];
  // 同じファイルを選び直しても反応するよう、先に選択を空にしておく
  input.value = "";
  if (!file) return;
  if (!isAdmin()) return notify("この操作には管理者権限が必要です。", true);

  try {
    const rows = parseCsv(decodeCsv(await file.arrayBuffer()));
    if (rows.length < 2) return notify("取り込めるデータがありません（1行目は見出しとして読み飛ばします）。", true);

    const { added, skipped } = importMembers(rows);
    if (added > 0) {
      addLog("CSV取込", `利用者: ${added}件`);
      save();
      render();
    }
    if (skipped.length) console.warn("CSV取込でスキップした行:\n" + skipped.join("\n"));
    const detail = skipped.length ? `（${skipped.length}件はスキップ: ${skipped.slice(0, 3).join(" / ")}${skipped.length > 3 ? " ほか" : ""}）` : "";
    notify(`${added}件を取り込みました${detail}`, added === 0);
  } catch (error) {
    console.error(error);
    notify("CSVファイルを読み込めませんでした。", true);
  }
});
