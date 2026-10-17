// 共通ヘルパー（DOM取得・HTMLエスケープ・日付・バッジ・通知）
import { STATUS_LABELS } from "./constants.js";

export const $ = (selector) => document.querySelector(selector);

export const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char],
  );

// 日付の書式（YYYY-MM-DD を前提にし、それ以外は「-」）
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export const isDateString = (value) => DATE_PATTERN.test(String(value ?? ""));

export const formatDate = (date) =>
  isDateString(date) ? new Date(`${date}T00:00:00`).toLocaleDateString("ja-JP") : "-";

export const statusLabel = (status) => STATUS_LABELS[status] || status || "-";

// class 属性に入れる値は英数字・_・- だけに絞る
const safeClass = (value) => String(value ?? "").replace(/[^\w-]/g, "");

export const badge = (status, extra = "") =>
  `<span class="badge ${safeClass(extra || status)}">${esc(statusLabel(status))}</span>`;

// ローカル時間（日本時間など）での日付・日時
export const todayString = () => new Date().toLocaleDateString("sv-SE");
export const nowString = () => new Date().toLocaleString("sv-SE").slice(0, 16);

// 今日から何日後か（日付が無い・不正なときは null）
export const daysUntil = (date) =>
  isDateString(date)
    ? Math.round((new Date(`${date}T00:00:00`) - new Date(`${todayString()}T00:00:00`)) / 86400000)
    : null;

export const renewalBadge = (date) => {
  const days = daysUntil(date);
  if (days === null) return "";
  if (days < 0) return `<span class="badge expired">期限切れ</span>`;
  if (days === 0) return `<span class="badge warning">今日まで</span>`;
  return `<span class="badge ${days <= 30 ? "warning" : "active"}">あと${days}日</span>`;
};

// 空の一覧に出す行
export const emptyRow = (colspan, message) =>
  `<tr class="empty-row"><td class="empty" colspan="${colspan}">${esc(message)}</td></tr>`;

// 表のセル。data-label はスマホでカード表示にしたとき、項目名として表示する
export const cell = (label, html, className = "") =>
  `<td data-label="${esc(label)}"${className ? ` class="${className}"` : ""}>${html}</td>`;

// 「日付 + その下に小さく担当者」のように、主と補足を1マスに重ねる
export const stacked = (main, sub = "") =>
  `<span class="stack"><span>${main}</span>${sub ? `<small>${sub}</small>` : ""}</span>`;

// ---- お金 ----
const yenFormat = new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" });
export const yen = (value) =>
  value === null || value === undefined || value === "" || Number.isNaN(Number(value))
    ? "-"
    : yenFormat.format(Math.round(Number(value)));

// 大きな金額は「231.6万円」のように短くする（数値の帯用）
export function shortYen(value) {
  const n = Math.round(Number(value) || 0);
  if (n >= 10000) return { value: String(Math.round(n / 1000) / 10), unit: "万円" };
  return { value: n.toLocaleString("ja-JP"), unit: "円" };
}

// 年額に換算した費用（買い切り・その他は年額にできないので null）
export function annualCost(license) {
  const price = Number(license?.price);
  if (!license || license.price === null || license.price === undefined || license.price === "" || Number.isNaN(price)) return null;
  if (license.billingType === "monthly") return price * 12;
  if (license.billingType === "yearly") return price;
  return null;
}

// ---- 日付の計算 ----
// 日付から日数を引いた日付（YYYY-MM-DD）
export function subtractDays(date, days) {
  if (!isDateString(date)) return "";
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() - (Number(days) || 0));
  return d.toLocaleDateString("sv-SE");
}

// 解約の申し出期限（更新日の noticeDays 日前）。自動更新でない・日数未入力なら空
export const noticeDeadline = (license) =>
  license?.autoRenew && license.noticeDays !== null && license.noticeDays !== undefined && license.noticeDays !== ""
    ? subtractDays(license.renewal, license.noticeDays)
    : "";

// 社員がいなくなる予定日（退職・異動の予定日と契約終了日のうち早いほう）
export function memberEnd(member) {
  const candidates = [
    { date: member?.leaveDate, label: "退職・異動" },
    { date: member?.contractEndDate, label: "契約終了" },
  ].filter((item) => isDateString(item.date));
  candidates.sort((a, b) => a.date.localeCompare(b.date));
  return candidates[0] ?? null;
}

// 入社日からの勤続年数（「3年2か月」）
export function tenure(hireDate) {
  if (!isDateString(hireDate)) return "";
  const start = new Date(`${hireDate}T00:00:00`);
  const now = new Date(`${todayString()}T00:00:00`);
  let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (now.getDate() < start.getDate()) months--;
  if (months < 0) return "入社前";
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return [years ? `${years}年` : "", rest || !years ? `${rest}か月` : ""].join("");
}

// ---- リンク ----
// http(s) だけを許可する（javascript: などを防ぐ）
export const safeUrl = (value) => (/^https?:\/\/\S+$/i.test(String(value ?? "")) ? String(value) : "");
export const externalLink = (url, label = "開く") => {
  const href = safeUrl(url);
  return href
    ? `<a class="ext-link" href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`
    : "";
};

// 未入力のときの表示
export const blank = '<span class="muted">—</span>';
export const orBlank = (value) => (value === null || value === undefined || value === "" ? blank : esc(value));

// 名前を押すと詳細が開くボタン
export const detailLink = (type, id, label) =>
  `<button type="button" class="name-link" data-detail="${type}" data-id="${id}">${esc(label)}</button>`;

// 席の使用状況（数字と細いバー）
export function usageBar(used, total) {
  const rate = total > 0 ? Math.min(used / total, 1) : 0;
  const tone = total > 0 && used >= total ? " is-full" : "";
  return [
    `<span class="usage${tone}">`,
    `<span class="usage-text"><strong>${esc(used)}</strong> / ${esc(total)}席</span>`,
    `<span class="usage-bar" aria-hidden="true"><span style="width:${Math.round(rate * 100)}%"></span></span>`,
    `</span>`,
  ].join("");
}

// 検索欄の文字列（小文字・前後の空白を除く）
export const searchQuery = (selector) => ($(selector)?.value || "").trim().toLowerCase();
export const matches = (query, ...values) =>
  !query || values.join(" ").toLowerCase().includes(query);

let noticeTimer;

export function notify(message, error = false) {
  const element = $("#notice");
  if (!element) return;
  element.textContent = message;
  element.className = `notice${error ? " error" : ""}`;
  element.setAttribute("role", error ? "alert" : "status");
  element.hidden = false;
  clearTimeout(noticeTimer);
  // エラーは読み終わる前に消えないよう長めに表示する
  noticeTimer = setTimeout(() => {
    element.hidden = true;
  }, error ? 6000 : 3000);
}
