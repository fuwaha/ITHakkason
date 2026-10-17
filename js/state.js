// 状態管理（localStorageへの保存・読み込みと、IDで探す関数）
import { seed } from "./seed.js";

const loadState = () => {
  try {
    return JSON.parse(localStorage.getItem("licenseManagerState") || "null") || seed;
  } catch {
    return seed; // 保存データが壊れていても起動できるようにする
  }
};
export const state = loadState();
const storedUsers = Array.isArray(state.users) ? state.users : [];
state.users = [...seed.users, ...storedUsers]
  .filter((user, index, users) => user?.email && users.findIndex((item) => item.email.toLowerCase() === user.email.toLowerCase()) === index)
  .map((user) => ({ ...user, email: user.email.trim().toLowerCase() }));
if (!Array.isArray(state.users) || state.users.length !== storedUsers.length) localStorage.setItem("licenseManagerState", JSON.stringify(state));
if (!Array.isArray(state.listings)) {
  state.listings = seed.listings; // 古い保存データには出品がないので補う
  localStorage.setItem("licenseManagerState", JSON.stringify(state));
}

export const save = () => localStorage.setItem("licenseManagerState", JSON.stringify(state));

export const nextId = (items) => items.reduce((max, item) => Math.max(max, item.id), 0) + 1;

// あとから増えたサンプル出品を、保存済みのデータにも追加する（商品名で重複を判定）
seed.listings
  .filter((sample) => !state.listings.some((listing) => listing.name === sample.name))
  .forEach((sample) => state.listings.push({ ...sample, id: nextId(state.listings) }));

export const toolById = (id) => state.tools.find((tool) => tool.id === Number(id));
export const licenseById = (id) => state.licenses.find((license) => license.id === Number(id));
export const memberById = (id) => state.members.find((member) => member.id === Number(id));

export const usedCount = (licenseId) =>
  state.assignments.filter((item) => item.licenseId === licenseId && item.status === "assigned")
    .length;
