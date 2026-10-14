// 共通ヘルパー（DOM取得・HTMLエスケープ・日付・バッジ・通知）

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

export const formatDate = (date) =>
  date ? new Date(`${date}T00:00:00`).toLocaleDateString("ja-JP") : "-";

export const statusLabel = (status) =>
  ({
    active: "有効",
    assigned: "割り当て中",
    released: "返却済み",
    inactive: "無効",
  })[status] || status;

export const badge = (status, extra = "") =>
  `<span class="badge ${extra || status}">${esc(statusLabel(status))}</span>`;

// ローカル時間（日本時間など）での日付・日時
export const todayString = () => new Date().toLocaleDateString("sv-SE");
export const nowString = () => new Date().toLocaleString("sv-SE").slice(0, 16);

export const daysUntil = (date) =>
  Math.ceil((new Date(`${date}T00:00:00`) - new Date(`${todayString()}T00:00:00`)) / 86400000);

export const renewalBadge = (date) => {
  const days = daysUntil(date);
  if (days < 0) return `<span class="badge warning">期限切れ</span>`;
  return `<span class="badge ${days <= 30 ? "warning" : "active"}">あと${days}日</span>`;
};

let noticeTimer;

export function notify(message, error = false) {
  const element = $("#notice");
  element.textContent = message;
  element.className = `notice${error ? " error" : ""}`;
  element.hidden = false;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => {
    element.hidden = true;
  }, 2600);
}
