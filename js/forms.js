// フォーム（登録・編集・返却ダイアログ）と入力チェック
// 項目は schema() にまとめて定義している。項目を増やすときはここに1行足すだけでよい。
import { licenseById, memberById, nextId, save, state, usedCount } from "./state.js";
import { $, daysUntil, esc, formatDate, notify, nowString, statusLabel, todayString } from "./helpers.js";
import {
  BILLING_TYPES,
  COLLECTIONS,
  EMPLOYMENT_TYPES,
  DEFAULTS,
  LICENSE_TYPES,
  RELEASE_REASONS,
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  STATUS_OPTIONS,
  TYPE_LABELS,
} from "./constants.js";
import { currentUser, isAdmin, updateAuthView } from "./auth.js";
import { addLog, describe } from "./logs.js";
import { render } from "./render.js";
import { accountChangeProblem } from "./accounts.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_PATTERN = /^https?:\/\/\S+$/i;
const PASSWORD_MIN = 8;
// パスワードの条件（ログイン画面の新規登録と同じ：8文字以上・英字と数字を両方含む）
const strongPassword = (value) => value.length >= PASSWORD_MIN && /[A-Za-z]/.test(value) && /[0-9]/.test(value);
const PASSWORD_HINT = `${PASSWORD_MIN}文字以上・英字と数字を両方含む`;
const PASSWORD_ERROR = `パスワードは${PASSWORD_MIN}文字以上で、英字と数字を両方含めてください。`;

let formContext = null;

// ---------------------------------------------------------------
// 割り当てのルール
// ---------------------------------------------------------------

// 割り当てできるライセンスか（有効で、更新期限を過ぎていない）
const isAssignable = (license) =>
  license?.status === "active" && !(daysUntil(license.renewal) < 0);

function validateAssignment(memberId, licenseId) {
  const license = licenseById(licenseId);
  const member = memberById(memberId);

  if (!member || member.status !== "active") return error("在籍中の利用者を選択してください。", "memberId");
  if (!license || license.status !== "active") return error("有効なライセンスを選択してください。", "licenseId");
  if (!isAssignable(license)) return error("更新期限を過ぎたライセンスは割り当てできません。", "licenseId");
  if (
    state.assignments.some(
      (item) =>
        item.memberId === memberId && item.licenseId === licenseId && item.status === "assigned",
    )
  ) {
    return error("この利用者には同じライセンスが既に割り当てられています。", "licenseId");
  }
  if (usedCount(licenseId) >= license.quantity) {
    return error("利用可能なライセンス数を超えているため、割り当てできません。", "licenseId");
  }
  return null;
}

// ---------------------------------------------------------------
// 項目の定義
//   type: text / email / url / date / number / select / textarea / checkbox / info
//   required: 必須 / wide: 2列ぶんの幅 / numeric: 選択肢の値を数値で保存
// ---------------------------------------------------------------

const entries = (map) => Object.entries(map).map(([value, label]) => ({ value, label }));
const statusOptions = (type) => STATUS_OPTIONS[type].map((value) => ({ value, label: statusLabel(value) }));

const roleOptions = () => Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }));

// 利用者が使っている割り当て（まとめて返却で使う）
const activeAssignmentsOf = (memberId) =>
  state.assignments.filter((assignment) => assignment.memberId === memberId && assignment.status === "assigned");

function schema(type, item, preset = null) {
  if (type === "account") {
    const fields = [
      { name: "name", label: "名前", required: true },
      { name: "email", label: "メールアドレス", type: "email", required: true, attrs: 'autocomplete="off"' },
      {
        name: "role",
        label: "権限",
        type: "select",
        required: true,
        placeholder: false,
        options: roleOptions(),
        wide: true,
        default: "user", // 新しいアカウントは一番弱い権限から始める
        hint: ROLE_DESCRIPTIONS[item?.role ?? "user"],
      },
    ];
    if (item) {
      fields.push({ name: "status", label: "状態", type: "select", required: true, placeholder: false, options: statusOptions("account") });
    } else {
      fields.push({
        name: "password",
        label: "初期パスワード",
        type: "password",
        required: true,
        raw: true,
        attrs: 'autocomplete="new-password"',
        hint: `${PASSWORD_HINT}。本人に伝えたら、ログイン後に変えてもらってください`,
      });
    }
    return [{ title: "アカウント", fields }];
  }

  // 自分のアカウント（だれでも変更できる）
  if (type === "profile") {
    return [
      {
        title: "プロフィール",
        fields: [
          { name: "name", label: "名前", required: true },
          { name: "email", label: "メールアドレス", type: "email", required: true, hint: "ログインに使うメールアドレスです", attrs: 'autocomplete="email"' },
        ],
      },
    ];
  }

  if (type === "changePassword") {
    return [
      {
        title: "パスワード変更",
        fields: [
          { name: "currentPassword", label: "今のパスワード", type: "password", required: true, raw: true, wide: true, attrs: 'autocomplete="current-password"' },
          { name: "password", label: "新しいパスワード", type: "password", required: true, raw: true, attrs: 'autocomplete="new-password"', hint: PASSWORD_HINT },
          { name: "passwordConfirm", label: "確認のためもう一度", type: "password", required: true, raw: true, attrs: 'autocomplete="new-password"' },
        ],
      },
    ];
  }

  if (type === "password") {
    return [
      {
        title: "パスワード再設定",
        fields: [
          { type: "info", wide: true, html: summary([["名前", item.name], ["メールアドレス", item.email]]) },
          { name: "password", label: "新しいパスワード", type: "password", required: true, raw: true, attrs: 'autocomplete="new-password"', hint: PASSWORD_HINT },
          { name: "passwordConfirm", label: "確認のためもう一度", type: "password", required: true, raw: true, attrs: 'autocomplete="new-password"' },
        ],
      },
    ];
  }

  if (type === "releaseAll") {
    const list = activeAssignmentsOf(item.id).map((assignment) => [
      "ライセンス",
      `${licenseById(assignment.licenseId)?.name ?? "（削除済み）"}（${formatDate(assignment.assignedAt)}から）`,
    ]);
    return [
      {
        title: "まとめて返却",
        fields: [
          { type: "info", wide: true, html: summary([["利用者", item.name], ...list]) },
          { name: "releasedAt", label: "返却日", type: "date", required: true, default: todayString() },
          {
            name: "releaseReason",
            label: "返却理由",
            type: "select",
            required: true,
            options: RELEASE_REASONS.map((value) => ({ value, label: value })),
          },
          { name: "releaseNote", label: "補足", type: "textarea", wide: true },
        ],
      },
    ];
  }

  // マーケットへの出品（管理者でなくてもできる）
  if (type === "listing") {
    return [
      {
        title: "出品内容",
        fields: [
          { name: "name", label: "商品名", required: true, wide: true },
          { name: "description", label: "説明", wide: true },
          { name: "category", label: "カテゴリ" },
          {
            name: "billing",
            label: "販売方法",
            type: "select",
            required: true,
            placeholder: false,
            options: [
              { value: "monthly", label: "月額" },
              { value: "one-time", label: "買い切り" },
            ],
          },
          { name: "price", label: "価格", type: "number", required: true, min: 0, integer: true, suffix: "円", default: 1000 },
        ],
      },
    ];
  }

  if (type === "tool") {
    return [
      {
        title: "基本情報",
        fields: [
          { name: "name", label: "ツール名", required: true, wide: true },
          { name: "provider", label: "提供会社", required: true },
          { name: "category", label: "カテゴリ", required: true, placeholder: "例: 業務ツール" },
          { name: "status", label: "ステータス", type: "select", required: true, placeholder: false, options: statusOptions("tool") },
          { name: "description", label: "説明", type: "textarea", wide: true, placeholder: "何に使うツールか" },
        ],
      },
      {
        title: "リンク",
        fields: [
          { name: "adminUrl", label: "管理画面のURL", type: "url", wide: true, placeholder: "https://" },
          { name: "officialUrl", label: "公式サイトのURL", type: "url", wide: true, placeholder: "https://" },
        ],
      },
      { title: "メモ", fields: [{ name: "notes", label: "備考", type: "textarea", wide: true }] },
    ];
  }

  if (type === "license") {
    const tools = state.tools
      .filter((tool) => tool.status === "active" || tool.id === item?.toolId)
      .map((tool) => ({ value: tool.id, label: tool.name }));
    return [
      {
        title: "基本情報",
        fields: [
          { name: "name", label: "ライセンス名", required: true, wide: true, placeholder: "例: Microsoft 365 Business Standard" },
          { name: "toolId", label: "対象ツール", type: "select", required: true, numeric: true, options: tools },
          { name: "licenseType", label: "ライセンスの種類", type: "select", required: true, placeholder: false, options: entries(LICENSE_TYPES) },
          {
            name: "quantity",
            label: "契約数",
            type: "number",
            required: true,
            min: 1,
            integer: true,
            suffix: "席",
            hint: item ? `現在の利用数: ${usedCount(item.id)}席` : "",
          },
          { name: "status", label: "ステータス", type: "select", required: true, placeholder: false, options: statusOptions("license") },
        ],
      },
      {
        title: "契約期間",
        fields: [
          { name: "startDate", label: "契約開始日", type: "date" },
          { name: "endDate", label: "契約終了日", type: "date" },
          { name: "renewal", label: "次の更新日", type: "date", hint: "期限の表示や通知はこの日付で計算します（買い切りは空のままで構いません）" },
          { name: "contractNumber", label: "契約番号", placeholder: "ベンダーの契約・注文番号" },
          { name: "autoRenew", label: "自動更新", type: "checkbox", text: "何もしなければ自動で更新される" },
          {
            name: "noticeDays",
            label: "解約の申し出期限",
            type: "number",
            min: 0,
            integer: true,
            prefix: "更新日の",
            suffix: "日前まで",
            hint: "自動更新の契約で、解約するなら連絡が必要な期限",
          },
        ],
      },
      {
        title: "費用",
        fields: [
          { name: "price", label: "金額（1回の請求あたり）", type: "number", min: 0, suffix: "円", hint: "全席分の合計金額（税込）" },
          { name: "billingType", label: "課金周期", type: "select", required: true, placeholder: false, options: entries(BILLING_TYPES) },
          { name: "costCenter", label: "費用を負担する部署", placeholder: "例: 情報システム部" },
        ],
      },
      {
        title: "担当・購入先",
        fields: [
          { name: "owner", label: "社内の担当者", placeholder: "更新や支払いを判断する人" },
          { name: "vendor", label: "購入先", placeholder: "例: 〇〇販売（代理店）" },
          { name: "vendorContact", label: "購入先の連絡先", type: "textarea", rows: 2, wide: true, placeholder: "担当者名・メールアドレス・電話番号" },
          { name: "documentUrl", label: "契約書・見積書の保存場所", type: "url", wide: true, placeholder: "https://（共有フォルダなどのURL）" },
        ],
      },
      {
        title: "メモ",
        fields: [
          {
            name: "notes",
            label: "備考",
            type: "textarea",
            wide: true,
            hint: "ライセンスキーやパスワードは書かず、パスワード管理ツールの保管場所だけを書いてください",
          },
        ],
      },
    ];
  }

  if (type === "member") {
    // 上長は自分以外の在籍中の利用者から選ぶ
    const managers = state.members
      .filter((member) => member.id !== item?.id && (member.status === "active" || member.id === item?.managerId))
      .map((member) => ({ value: member.id, label: `${member.name}（${member.department ?? ""}）` }));
    return [
      {
        title: "基本情報",
        fields: [
          { name: "name", label: "氏名", required: true },
          { name: "number", label: "社員番号", required: true },
          { name: "email", label: "メールアドレス", type: "email", required: true, wide: true, attrs: 'autocomplete="off"' },
          { name: "department", label: "部署", required: true },
          { name: "position", label: "役職", placeholder: "例: 課長" },
          { name: "managerId", label: "上長", type: "select", numeric: true, options: managers, placeholder: "なし" },
          { name: "status", label: "ステータス", type: "select", required: true, placeholder: false, options: statusOptions("member") },
        ],
      },
      {
        title: "雇用",
        fields: [
          { name: "employmentType", label: "雇用形態", type: "select", required: true, placeholder: false, options: entries(EMPLOYMENT_TYPES) },
          { name: "hireDate", label: "入社日", type: "date" },
          {
            name: "contractEndDate",
            label: "契約終了日",
            type: "date",
            hint: "契約社員・派遣社員などの契約期限。近づくと回収を知らせます",
          },
          { name: "leaveDate", label: "退職・異動の予定日", type: "date", hint: "近づくとダッシュボードで回収を知らせます" },
        ],
      },
      { title: "メモ", fields: [{ name: "notes", label: "備考", type: "textarea", wide: true }] },
    ];
  }

  if (type === "assignment" && item) {
    // 編集では利用者とライセンスは変えられない（変えるときは返却して登録し直す）
    return [
      {
        title: "割り当て",
        fields: [
          {
            type: "info",
            wide: true,
            html: summary([
              ["利用者", memberById(item.memberId)?.name ?? "（削除済み）"],
              ["ライセンス", licenseById(item.licenseId)?.name ?? "（削除済み）"],
              ["割り当て日", formatDate(item.assignedAt)],
            ]),
          },
          { name: "lastUsedAt", label: "最終利用日", type: "date", attrs: `max="${todayString()}"`, hint: "管理画面などで確認した最後の利用日" },
        ],
      },
      {
        title: "申請",
        fields: [
          { name: "requestedBy", label: "申請者" },
          { name: "reason", label: "申請理由" },
          { name: "notes", label: "備考", type: "textarea", wide: true },
        ],
      },
    ];
  }

  if (type === "assignment") {
    // 詳細から開いたときは、利用者かライセンスが決まっている。すでに持っている組み合わせは選択肢から外す
    const holds = (memberId, licenseId) =>
      state.assignments.some(
        (assignment) => assignment.memberId === memberId && assignment.licenseId === licenseId && assignment.status === "assigned",
      );
    const members = state.members
      .filter((member) => member.status === "active")
      .filter((member) => !preset?.licenseId || !holds(member.id, preset.licenseId))
      .map((member) => ({ value: member.id, label: `${member.name}（${member.number}）` }));
    const licenses = state.licenses
      .filter(isAssignable)
      .filter((license) => !preset?.memberId || !holds(preset.memberId, license.id))
      .map((license) => ({
        value: license.id,
        label: `${license.name}（残り ${license.quantity - usedCount(license.id)}）`,
      }));
    return [
      {
        title: "割り当て",
        fields: [
          { name: "memberId", label: "利用者", type: "select", required: true, numeric: true, wide: true, options: members },
          { name: "licenseId", label: "ライセンス", type: "select", required: true, numeric: true, wide: true, options: licenses },
          { name: "assignedAt", label: "割り当て日", type: "date", required: true, default: todayString() },
        ],
      },
      {
        title: "申請",
        fields: [
          { name: "requestedBy", label: "申請者", placeholder: "例: 部署の上長" },
          { name: "reason", label: "申請理由", placeholder: "例: 新規入社" },
          { name: "notes", label: "備考", type: "textarea", wide: true },
        ],
      },
    ];
  }

  if (type === "release") {
    return [
      {
        title: "返却",
        fields: [
          {
            type: "info",
            wide: true,
            html: summary([
              ["利用者", memberById(item.memberId)?.name ?? "（削除済み）"],
              ["ライセンス", licenseById(item.licenseId)?.name ?? "（削除済み）"],
              ["割り当て日", formatDate(item.assignedAt)],
            ]),
          },
          { name: "releasedAt", label: "返却日", type: "date", required: true, default: todayString(), attrs: `min="${esc(item.assignedAt ?? "")}"` },
          {
            name: "releaseReason",
            label: "返却理由",
            type: "select",
            required: true,
            options: RELEASE_REASONS.map((value) => ({ value, label: value })),
          },
          { name: "releaseNote", label: "補足", type: "textarea", wide: true },
        ],
      },
    ];
  }
  return [];
}

// 編集できない情報の表示（返却・割り当ての編集で使う）
const summary = (rows) =>
  `<dl class="form-summary">${rows.map(([label, value]) => `<dt>${esc(label)}</dt><dd>${esc(value)}</dd>`).join("")}</dl>`;

// ---------------------------------------------------------------
// HTMLの組み立て
// ---------------------------------------------------------------

function renderControl(def, value) {
  const id = `field-${def.name}`;
  const required = def.required ? " required" : "";

  if (def.type === "select") {
    const placeholder =
      def.placeholder === false ? "" : `<option value="">${esc(def.placeholder ?? "選択してください")}</option>`;
    const options = def.options
      .map(
        ({ value: optionValue, label }) =>
          `<option value="${esc(optionValue)}"${String(optionValue) === String(value) ? " selected" : ""}>${esc(label)}</option>`,
      )
      .join("");
    return `<select id="${id}" name="${def.name}"${required}>${placeholder}${options}</select>`;
  }
  if (def.type === "textarea") {
    return `<textarea id="${id}" name="${def.name}" rows="${def.rows ?? 3}" placeholder="${esc(def.placeholder ?? "")}"${required}>${esc(value)}</textarea>`;
  }
  if (def.type === "checkbox") {
    return `<label class="check"><input type="checkbox" id="${id}" name="${def.name}"${value ? " checked" : ""}><span>${esc(def.text ?? "")}</span></label>`;
  }

  const type = def.type ?? "text";
  const extra = [
    def.min !== undefined ? `min="${def.min}"` : "",
    def.type === "number" ? `step="${def.integer ? 1 : "any"}" inputmode="numeric"` : "",
    def.attrs ?? "",
  ].join(" ");
  const input = `<input id="${id}" name="${def.name}" type="${type}" value="${esc(value)}" placeholder="${esc(def.placeholder ?? "")}" ${extra}${required}>`;
  if (!def.prefix && !def.suffix) return input;
  return [
    `<div class="input-affix">`,
    def.prefix ? `<span>${esc(def.prefix)}</span>` : "",
    input,
    def.suffix ? `<span>${esc(def.suffix)}</span>` : "",
    `</div>`,
  ].join("");
}

function renderField(def, item) {
  if (def.type === "info") return `<div class="field wide">${def.html}</div>`;
  const raw = item?.[def.name];
  const value = raw === null || raw === undefined ? (def.default ?? "") : raw;
  const mark = def.required ? `<span class="required-mark">必須</span>` : "";
  const label =
    def.type === "checkbox"
      ? `<span class="field-label">${esc(def.label)}</span>`
      : `<label for="field-${def.name}">${esc(def.label)}${mark}</label>`;
  const hint = def.hint ? `<p class="field-hint" id="hint-${def.name}">${esc(def.hint)}</p>` : "";
  return `<div class="field${def.wide ? " wide" : ""}">${label}${renderControl(def, value)}${hint}</div>`;
}

const renderSections = (sections, item) =>
  sections
    .map(
      (section) =>
        `<fieldset class="form-section"><legend>${esc(section.title)}</legend><div class="form-grid">${section.fields
          .map((def) => renderField(def, item))
          .join("")}</div></fieldset>`,
    )
    .join("");

// ---------------------------------------------------------------
// 値の読み取りとチェック
// ---------------------------------------------------------------

const fieldsOf = (sections) => sections.flatMap((section) => section.fields).filter((def) => def.name);

function readForm(form, sections) {
  const data = {};
  for (const def of fieldsOf(sections)) {
    const element = form.elements[def.name];
    if (!element) continue;
    const text = def.raw ? String(element.value ?? "") : String(element.value ?? "").trim();
    if (def.type === "checkbox") data[def.name] = element.checked;
    else if (def.type === "number" || def.numeric) data[def.name] = text === "" ? null : Number(text);
    else data[def.name] = text;
  }
  return data;
}

const error = (message, field = "") => ({ message, field });

// 項目の定義に沿った共通チェック
function validateFields(sections, data) {
  for (const def of fieldsOf(sections)) {
    const value = data[def.name];
    const empty = value === "" || value === null || value === undefined;
    if (def.required && (empty || Number.isNaN(value))) {
      return error(`「${def.label}」を入力してください。`, def.name);
    }
    if (empty) continue;
    if (def.type === "number") {
      if (Number.isNaN(value) || value < (def.min ?? 0)) {
        return error(`「${def.label}」は${def.min ?? 0}以上の数値で入力してください。`, def.name);
      }
      if (def.integer && !Number.isInteger(value)) return error(`「${def.label}」は整数で入力してください。`, def.name);
    }
    if (def.type === "url" && !URL_PATTERN.test(value)) {
      return error(`「${def.label}」は https:// から始まるURLで入力してください。`, def.name);
    }
    if (def.type === "email" && !EMAIL_PATTERN.test(value)) {
      return error("メールアドレスの形式が正しくありません。", def.name);
    }
  }
  return null;
}

// 種類ごとのチェック
function validateRules(type, id, data, item) {
  if (type === "account") {
    const duplicated = state.users.some((user) => user.id !== id && user.email.toLowerCase() === data.email);
    if (duplicated) return error("このメールアドレスのアカウントは既にあります。", "email");
    if (!id && !strongPassword(data.password)) {
      return error(PASSWORD_ERROR, "password");
    }
    if (id) {
      const problem = accountChangeProblem(item, data.role, data.status);
      if (problem) return error(problem, data.status === "inactive" ? "status" : "role");
    }
  }

  if (type === "profile") {
    const duplicated = state.users.some((user) => user.id !== item.id && user.email.toLowerCase() === data.email);
    if (duplicated) return error("このメールアドレスは、ほかのアカウントで使われています。", "email");
  }

  if (type === "changePassword") {
    if (data.currentPassword !== item.password) return error("今のパスワードが違います。", "currentPassword");
    if (data.password === data.currentPassword) return error("今と違うパスワードにしてください。", "password");
  }

  if (type === "password" || type === "changePassword") {
    if (!strongPassword(data.password)) return error(PASSWORD_ERROR, "password");
    if (data.password !== data.passwordConfirm) return error("確認用のパスワードが一致しません。", "passwordConfirm");
  }

  if (type === "releaseAll" && activeAssignmentsOf(item.id).some((assignment) => assignment.assignedAt && data.releasedAt < assignment.assignedAt)) {
    return error("返却日は、どの割り当て日よりも後にしてください。", "releasedAt");
  }

  if (type === "assignment" && !id) return validateAssignment(data.memberId, data.licenseId);

  if (type === "assignment" && id && data.lastUsedAt && data.lastUsedAt > todayString()) {
    return error("最終利用日に未来の日付は入れられません。", "lastUsedAt");
  }

  if (type === "release" && item.assignedAt && data.releasedAt < item.assignedAt) {
    return error("返却日は割り当て日より後にしてください。", "releasedAt");
  }

  if (type === "license") {
    if (id && data.quantity < usedCount(id)) {
      return error(`現在${usedCount(id)}席が割り当て中のため、契約数をそれより少なくできません。`, "quantity");
    }
    if (data.startDate && data.endDate && data.endDate < data.startDate) {
      return error("契約終了日は契約開始日より後にしてください。", "endDate");
    }
    // 買い切り以外は、期限の表示や通知のために更新日が必要
    if (data.billingType !== "one-time" && !data.renewal) {
      return error("「次の更新日」を入力してください。", "renewal");
    }
  }

  if (type === "member") {
    const duplicated = state.members.some(
      (member) =>
        member.id !== id &&
        (member.email.toLowerCase() === data.email || member.number === data.number),
    );
    if (duplicated) return error("同じメールアドレスまたは社員番号の利用者が既に登録されています。", "email");
    if (data.hireDate && data.contractEndDate && data.contractEndDate < data.hireDate) {
      return error("契約終了日は入社日より後にしてください。", "contractEndDate");
    }
    if (id && data.managerId === id) return error("自分自身を上長にはできません。", "managerId");
    if (
      id &&
      data.status !== "active" &&
      state.assignments.some((assignment) => assignment.memberId === id && assignment.status === "assigned")
    ) {
      return error("ライセンスを利用中の利用者は、在籍中以外にできません。先に返却してください。", "status");
    }
  }
  return null;
}

// ---------------------------------------------------------------
// ダイアログの開閉
// ---------------------------------------------------------------

// 登録できない状態ならその理由を返す（フォームを開く前に確認）
function blockedReason(type, preset = null) {
  if (type === "assignment" && preset?.memberId) {
    const member = memberById(preset.memberId);
    if (!member || member.status !== "active") return "在籍中の利用者にだけ割り当てできます。";
  }
  if (type === "assignment" && preset?.licenseId) {
    const license = licenseById(preset.licenseId);
    if (!isAssignable(license)) return "このライセンスは有効でないか、更新期限を過ぎているため割り当てできません。";
    if (usedCount(license.id) >= license.quantity) return "このライセンスは満席です。契約数を増やすか、返却してから割り当ててください。";
  }
  if (type === "license" && !state.tools.some((tool) => tool.status === "active")) {
    return "先に有効なツールを登録してください。";
  }
  if (type === "assignment") {
    if (!state.members.some((member) => member.status === "active")) {
      return "在籍中の利用者がいません。先に利用者を登録してください。";
    }
    if (!state.licenses.some(isAssignable)) return "割り当てできる有効なライセンスがありません。";
  }
  return "";
}

const TITLES = {
  listing: () => "出品する",
  release: () => "ライセンスを返却",
  releaseAll: () => "ライセンスをまとめて返却",
  password: () => "パスワードを再設定",
  profile: () => "プロフィールを編集",
  changePassword: () => "パスワードを変更",
};
const SAVE_LABELS = {
  listing: "出品する",
  release: "返却する",
  releaseAll: "すべて返却する",
  password: "再設定する",
  changePassword: "変更する",
};
// 既存の値を初期値にしないフォーム（入力するのは新しい記録だから）
const FRESH_FORMS = new Set(["release", "releaseAll", "password", "changePassword"]);
// 自分のアカウントのフォームは、管理者でなくても開ける
const SELF_FORMS = new Set(["profile", "changePassword"]);
// 出品は、管理者でなくてもできる
const PUBLIC_FORMS = new Set(["listing"]);

// preset：新しく登録するときの初期値（例：利用者の詳細から開いたら { memberId }）
export function openForm(type, item = null, preset = null) {
  if (SELF_FORMS.has(type)) item = currentUser(); // 自分のアカウント以外は変更させない
  else if (!PUBLIC_FORMS.has(type) && !isAdmin()) return notify("この操作には管理者権限が必要です。", true);
  if (SELF_FORMS.has(type) && !item) return;
  if (!item) {
    const reason = blockedReason(type, preset);
    if (reason) return notify(reason, true);
  }

  const sections = schema(type, item, preset);
  // 決まっていない側の選択肢が1つもなければ、開かずに理由を伝える
  const emptyChoice = fieldsOf(sections).find(
    (def) => def.type === "select" && def.required && def.options?.length === 0 && !(preset && def.name in preset),
  );
  if (!item && emptyChoice) {
    return notify(
      emptyChoice.name === "licenseId"
        ? "割り当てできるライセンスがありません（すでに持っているか、空きがありません）。"
        : "割り当てできる利用者がいません（全員がすでに持っています）。",
      true,
    );
  }

  formContext = { type, id: item?.id ?? null, sections, item };
  $("#dialogTitle").textContent = TITLES[type]?.() ?? `${TYPE_LABELS[type]}を${item ? "編集" : "登録"}`;
  $("#saveButton").textContent = SAVE_LABELS[type] ?? "保存";
  $("#formFields").innerHTML = renderSections(sections, FRESH_FORMS.has(type) ? null : item ?? preset);
  hideFormError();
  $("#formDialog").showModal();
  $("#formFields").scrollTop = 0;
}

function showFormError({ message, field }) {
  const element = $("#formError");
  element.textContent = message;
  element.hidden = false;
  if (field) {
    const input = $(`#field-${field}`);
    input?.setAttribute("aria-invalid", "true");
    input?.focus();
  }
}

function hideFormError() {
  $("#formError").hidden = true;
  document.querySelectorAll("#formFields [aria-invalid]").forEach((el) => el.removeAttribute("aria-invalid"));
}

// ---------------------------------------------------------------
// 保存
// ---------------------------------------------------------------

function finish(message) {
  if (!save()) return showFormError(error("保存に失敗しました。ブラウザの保存容量を確認してください。"));
  $("#formDialog").close();
  notify(message);
  render();
}

function releaseOne(assignment, data) {
  const user = currentUser();
  Object.assign(assignment, {
    status: "released",
    releasedAt: data.releasedAt,
    releaseReason: data.releaseReason,
    releaseNote: data.releaseNote,
    releasedBy: user?.name ?? "",
    releasedById: user?.id ?? null,
  });
  addLog("返却", describe("assignment", assignment));
}

function saveRelease(assignment, data) {
  releaseOne(assignment, data);
  finish("返却しました");
}

function saveReleaseAll(member, data) {
  const targets = activeAssignmentsOf(member.id);
  targets.forEach((assignment) => releaseOne(assignment, data));
  finish(`${member.name}さんのライセンス${targets.length}件を返却しました`);
}

function saveProfile(user, data) {
  Object.assign(user, { name: data.name, email: data.email });
  addLog("更新", describe("account", user));
  finish("プロフィールを保存しました");
  updateAuthView(); // サイドバーの名前・メニューを新しい名前にする
}

function saveOwnPassword(user, data) {
  user.password = data.password;
  addLog("パスワード変更", describe("account", user));
  finish("パスワードを変更しました");
}

// パスワードは操作履歴に残さない
function savePassword(user, data) {
  user.password = data.password;
  addLog("パスワード再設定", describe("account", user));
  finish("パスワードを再設定しました");
}

$("#entityForm").addEventListener("submit", (event) => {
  event.preventDefault();
  if (!formContext) return;
  if (!isAdmin() && !SELF_FORMS.has(formContext.type) && !PUBLIC_FORMS.has(formContext.type)) {
    return showFormError(error("この操作には管理者権限が必要です。"));
  }
  hideFormError();

  const { type, id, sections, item } = formContext;
  const data = readForm(event.currentTarget, sections);
  if (["member", "account", "profile"].includes(type) && data.email) data.email = data.email.toLowerCase();

  const problem = validateFields(sections, data) ?? validateRules(type, id, data, item);
  if (problem) return showFormError(problem);

  if (type === "release") return saveRelease(item, data);
  if (type === "releaseAll") return saveReleaseAll(item, data);
  if (type === "password") return savePassword(item, data);
  if (type === "changePassword") return saveOwnPassword(item, data);
  if (type === "profile") return saveProfile(item, data);

  const items = state[COLLECTIONS[type]];
  let saved;
  if (id) {
    saved = items.find((entry) => entry.id === id);
    Object.assign(saved, data);
  } else {
    const user = currentUser();
    saved = {
      id: nextId(items),
      ...DEFAULTS[type],
      ...data,
      ...(type === "assignment" ? { assignedBy: user?.name ?? "", assignedById: user?.id ?? null } : {}),
      ...(type === "account" ? { createdAt: nowString() } : {}),
      ...(type === "listing" ? { sellerId: user?.id ?? null, seller: user?.name ?? "" } : {}),
    };
    items.push(saved);
  }

  if (type === "listing") addLog("出品", saved.name);
  else addLog(id ? "更新" : "登録", describe(type, saved));
  finish(type === "listing" ? "出品しました" : "保存しました");
});

// 入力し直したら、その欄のエラー表示を消す
$("#formFields").addEventListener("input", (event) => event.target.removeAttribute?.("aria-invalid"));

// 権限を選び直したら、その権限でできることを表示し直す
$("#formFields").addEventListener("change", (event) => {
  if (event.target.id !== "field-role") return;
  const hint = $("#hint-role");
  if (hint) hint.textContent = ROLE_DESCRIPTIONS[event.target.value] ?? "";
});

$("#closeFormButton").addEventListener("click", () => $("#formDialog").close());
$("#cancelFormButton").addEventListener("click", () => $("#formDialog").close());
$("#formDialog").addEventListener("close", () => {
  formContext = null;
});
