// フォーム（登録・編集ダイアログ）と入力チェック
import { licenseById, memberById, nextId, save, state, usedCount } from "./state.js";
import { $, esc, notify, todayString } from "./helpers.js";
import { COLLECTIONS, DEFAULTS, TYPE_LABELS } from "./constants.js";
import { currentUser, isAdmin } from "./auth.js";
import { addLog } from "./logs.js";
import { render } from "./render.js";

let formContext = null;


// 割り当て可否のチェック（問題なければ空文字を返す）
function validateAssignment(memberId, licenseId) {
  const license = licenseById(licenseId);
  const member = memberById(memberId);

  if (!member || member.status !== "active") {
    return "在籍中の利用者を選択してください。";
  }
  if (!license || license.status !== "active") {
    return "有効なライセンスを選択してください。";
  }
  if (
    state.assignments.some(
      (item) =>
        item.memberId === memberId && item.licenseId === licenseId && item.status === "assigned",
    )
  ) {
    return "この利用者には同じライセンスが既に割り当てられています。";
  }

  const used = state.assignments.filter(
    (item) => item.licenseId === licenseId && item.status === "assigned",
  ).length;
  if (used >= license.quantity) {
    return "利用可能なライセンス数を超えているため、割り当てできません。";
  }

  return "";
}

const field = (name, label, type = "text", value = "", options = "", attrs = "") =>
  `<div class="field"><label for="field-${name}">${label}</label>${
    type === "select"
      ? `<select id="field-${name}" name="${name}" required>${options}</select>`
      : `<input id="field-${name}" name="${name}" type="${type}" value="${esc(value)}" ${attrs} required>`
  }</div>`;

export function openForm(type, item = null) {
  // 出品は管理者でなくてもできる
  if (type !== "listing" && !isAdmin()) return notify("この操作には管理者権限が必要です。", true);
  formContext = { type, id: item?.id };
  const edit = Boolean(item);
  let title = `${edit ? "編集" : "登録"}`;
  let fields = "";

  if (type === "tool") {
    fields =
      field("name", "ツール名", "text", item?.name) +
      field("provider", "提供会社", "text", item?.provider) +
      field("category", "カテゴリ", "text", item?.category);
  }

  if (type === "license") {
    fields =
      field("name", "ライセンス名", "text", item?.name) +
      field(
        "toolId",
        "対象ツール",
        "select",
        "",
        state.tools
          .map(
            (tool) =>
              `<option value="${tool.id}" ${item?.toolId === tool.id ? "selected" : ""}>${esc(tool.name)}</option>`,
          )
          .join(""),
      ) +
      field("quantity", "契約数", "number", item?.quantity || 1, "", 'min="1" step="1"') +
      field("renewal", "更新日", "date", item?.renewal);
  }

  if (type === "listing") {
    fields =
      field("name", "商品名", "text", item?.name) +
      field("description", "説明", "text", item?.description) +
      field("category", "カテゴリ", "text", item?.category) +
      field(
        "billing",
        "販売方法",
        "select",
        "",
        `<option value="monthly">月額</option><option value="one-time">買い切り</option>`,
      ) +
      field("price", "価格（円）", "number", item?.price ?? 1000, "", 'min="0" step="1"');
  }

  if (type === "member") {
    fields =
      field("name", "氏名", "text", item?.name) +
      field("email", "メールアドレス", "email", item?.email) +
      field("number", "社員番号", "text", item?.number) +
      field("department", "部署", "text", item?.department);
  }

  if (type === "assignment") {
    fields =
      field(
        "memberId",
        "利用者",
        "select",
        "",
        state.members
          .map((member) => `<option value="${member.id}">${esc(member.name)}</option>`)
          .join(""),
      ) +
      field(
        "licenseId",
        "ライセンス",
        "select",
        "",
        state.licenses
          .map((license) => `<option value="${license.id}">${esc(license.name)}</option>`)
          .join(""),
      ) +
      field("assignedAt", "割り当て日", "date", todayString());
  }

  $("#dialogTitle").textContent =
    type === "listing"
      ? "出品する"
      : `${title}${{ tool: "ツール", license: "ライセンス", member: "利用者", assignment: "割り当て" }[type]
      }`;
  $("#formFields").innerHTML = fields;
  hideFormError();
  $("#formDialog").showModal();
}

const showFormError = (message) => {
  const element = $("#formError");
  element.textContent = message;
  element.hidden = false;
};

const hideFormError = () => {
  $("#formError").hidden = true;
};

// フォームの値（すべて文字列）を、保存する型に直す
function normalizeValues(type, values) {
  if (type === "license") {
    return { ...values, quantity: Number(values.quantity), toolId: Number(values.toolId) };
  }
  if (type === "assignment") {
    return { ...values, memberId: Number(values.memberId), licenseId: Number(values.licenseId) };
  }
  if (type === "listing") {
    return { ...values, price: Number(values.price) };
  }
  return values;
}

// 保存前のチェック（問題なければ空文字を返す）
function validateForm(type, id, data) {
  if (type === "assignment" && !id) {
    return validateAssignment(data.memberId, data.licenseId);
  }
  if (type === "license") {
    if (!(data.quantity >= 1)) return "契約数は1以上にしてください。";
    if (id && data.quantity < usedCount(id)) {
      return `現在${usedCount(id)}件割り当て中のため、契約数をそれより少なくできません。`;
    }
  }
  if (type === "listing" && !(Number.isInteger(data.price) && data.price >= 0)) {
    return "価格は0以上の整数で入力してください。";
  }
  if (type === "member") {
    const duplicated = state.members.some(
      (member) =>
        member.id !== id &&
        (member.email.toLowerCase() === data.email.toLowerCase() || member.number === data.number),
    );
    if (duplicated) return "同じメールアドレスまたは社員番号の利用者が既に登録されています。";
  }
  return "";
}

$("#entityForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const { type, id } = formContext;
  const trimmed = [...new FormData(event.currentTarget)].map(([key, value]) => [
    key,
    String(value).trim(),
  ]);
  const data = normalizeValues(type, Object.fromEntries(trimmed));

  const message = validateForm(type, id, data);
  if (message) return showFormError(message);

  const items = state[COLLECTIONS[type]];
  if (id) {
    Object.assign(
      items.find((item) => item.id === id),
      data,
    );
  } else {
    const extra =
      type === "assignment"
        ? { assignedBy: currentUser()?.name ?? "管理者" }
        : type === "listing"
          ? { sellerId: currentUser()?.id, seller: currentUser()?.name }
          : {};
    items.push({ id: nextId(items), ...DEFAULTS[type], ...data, ...extra });
  }
  
  if (type === "listing") addLog("出品", data.name);
  else addLog(id ? "更新" : "登録", TYPE_LABELS[type]);
  save();
  $("#formDialog").close();
  notify("保存しました");
  render();
});

$("#closeFormButton").addEventListener("click", () => $("#formDialog").close());

$("#cancelFormButton").addEventListener("click", () => $("#formDialog").close());

$("#addToolButton").addEventListener("click", () => openForm("tool"));

$("#addLicenseButton").addEventListener("click", () => openForm("license"));

$("#addMemberButton").addEventListener("click", () => openForm("member"));

$("#addAssignmentButton").addEventListener("click", () => openForm("assignment"));
