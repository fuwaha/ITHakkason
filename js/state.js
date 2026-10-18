// 状態管理（localStorageへの保存・読み込みと、IDで探す関数）
// ※ API とつなぐときは、loadState() と save() をサーバー呼び出しに差し替える
import { seed } from "./seed.js";

const STORAGE_KEY = "licenseManagerState";
const LOG_LIMIT = 1000; // localStorage（約5MB）があふれないよう、履歴は新しい順にこの件数だけ残す
const KEYS = ["users", "tools", "licenses", "members", "assignments", "logs", "listings"];

const readStored = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
  } catch {
    return null; // 保存データが壊れていても起動できるようにする
  }
};

const normalizeEmail = (email) => String(email ?? "").trim().toLowerCase();

function loadState() {
  const stored = readStored();
  // seed は直接書き換えないようにコピーして使う
  const base = structuredClone(seed);
  if (!stored || typeof stored !== "object") return base;

  // 保存データに欠けているキーは seed で補う
  const loaded = {};
  for (const key of KEYS) {
    loaded[key] = Array.isArray(stored[key]) ? stored[key] : base[key];
  }

  // ユーザーは保存データを優先し、seed にしかいないアカウントだけ足す
  // （以前は seed が優先されていて、パスワードを変えても起動のたびに戻っていた）
  const users = loaded.users
    .filter((user) => user?.email)
    .map((user) => ({ ...user, email: normalizeEmail(user.email) }));
  for (const user of base.users) {
    if (!users.some((item) => item.email === normalizeEmail(user.email))) {
      users.push({ ...user, id: nextId(users) });
    }
  }
  loaded.users = users;
  return loaded;
}

export function nextId(items) {
  return items.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
}

export const state = loadState();

export function save() {
  if (state.logs.length > LOG_LIMIT) state.logs.splice(0, state.logs.length - LOG_LIMIT);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}
save();

// あとから増えたサンプル出品を、保存済みのデータにも追加する（商品名で重複を判定）
seed.listings
  .filter((sample) => !state.listings.some((listing) => listing.name === sample.name))
  .forEach((sample) => state.listings.push({ ...sample, id: nextId(state.listings) }));

export const toolById = (id) => state.tools.find((tool) => tool.id === Number(id));
export const licenseById = (id) => state.licenses.find((license) => license.id === Number(id));
export const memberById = (id) => state.members.find((member) => member.id === Number(id));
export const userById = (id) => state.users.find((user) => user.id === Number(id));

// 割り当て中の数（ライセンス単位・利用者単位）。数える処理はここにまとめる
export const usedCount = (licenseId) =>
  state.assignments.filter(
    (item) => item.licenseId === Number(licenseId) && item.status === "assigned",
  ).length;

export const memberAssignedCount = (memberId) =>
  state.assignments.filter(
    (item) => item.memberId === Number(memberId) && item.status === "assigned",
  ).length;
