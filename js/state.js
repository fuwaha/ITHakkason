// 状態管理（画面用キャッシュ。正式な保存先はSupabase）
import { seed } from "./seed.js";
import { supabase } from "./supabase.js";

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
const normalizeDate = (value) => {
  const date = String(value ?? "").trim();
  if (!date) return null;
  if (!date.includes("T")) return date.slice(0, 10);
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime())
    ? date.slice(0, 10)
    : parsed.toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
};

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

const remoteReaders = {
  tools: async () => {
    const { data, error } = await supabase.from("tools").select("*").order("id");
    if (error) throw error;
    return data.map((tool) => ({
      ...tool,
      provider: tool.provider_name,
      adminUrl: tool.admin_url,
      officialUrl: tool.official_url,
    }));
  },
  licenses: async () => {
    const { data, error } = await supabase.from("license_plans").select("*").order("id");
    if (error) throw error;
    return data.map((license) => ({
      ...license,
      toolId: license.tool_id,
      name: license.plan_name,
      quantity: license.total_quantity,
      startDate: license.start_date,
      endDate: license.end_date,
      renewal: license.renewal_date,
      autoRenew: license.auto_renew,
      billingType: license.billing_type,
      contractNumber: license.contract_number,
      noticeDays: license.notice_days,
      costCenter: license.cost_center,
      owner: license.owner,
      vendor: license.vendor,
      vendorContact: license.vendor_contact,
      documentUrl: license.document_url,
    }));
  },
  members: async () => {
    const { data, error } = await supabase.from("members").select("*").order("id");
    if (error) throw error;
    return data.map((member) => ({
      ...member,
      number: member.member_number,
      managerId: member.manager_id,
      employmentType: member.employment_type,
      hireDate: member.hire_date,
      contractEndDate: member.contract_end_date,
      leaveDate: member.leave_date,
    }));
  },
  assignments: async () => {
    const { data, error } = await supabase.from("license_assignments").select("*").order("id");
    if (error) throw error;
    return data.map((assignment) => ({
      ...assignment,
      licenseId: assignment.license_plan_id,
      memberId: assignment.member_id,
      assignedBy: assignment.assigned_by,
      assignedAt:
        normalizeDate(assignment.assigned_at) ||
        seed.assignments.find((item) => item.id === assignment.id)?.assignedAt ||
        null,
      requestedBy: assignment.requested_by,
      reason: assignment.reason,
      lastUsedAt: assignment.last_used_at,
    }));
  },
  logs: async () => {
    const { data, error } = await supabase.from("operation_logs").select("*").order("id");
    if (error) throw error;
    return data.map((log) => ({
      ...log,
      action: log.action_type,
      target: log.target_type,
      at: log.created_at,
      user: log.user_id,
    }));
  },
};

export async function loadRemoteState() {
  const entries = await Promise.all(
    Object.entries(remoteReaders).map(async ([key, reader]) => [key, await reader()]),
  );

  for (const [key, items] of entries) {
    // Keep the local demo data until the corresponding Supabase table is seeded.
    if (items.length > 0) {
      state[key] = items.map((item) => {
        const seedItem = (seed[key] || []).find((candidate) => candidate.id === item.id);
        const localItem = (state[key] || []).find((candidate) => candidate.id === item.id);
        const fallbackItem = { ...(seedItem || {}), ...(localItem || {}) };
        for (const [field, value] of Object.entries(seedItem || {})) {
          if (fallbackItem[field] === null || fallbackItem[field] === "") {
            fallbackItem[field] = value;
          }
        }
        if (!seedItem && !localItem) return item;
        return Object.fromEntries(
          Object.entries({ ...fallbackItem, ...item }).map(([field, value]) => [
            field,
            value === null || value === "" ? fallbackItem[field] ?? value : value,
          ]),
        );
      });
    }
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

async function syncCollection(table, rows, mapRow) {
  const payload = rows.map(mapRow);
  if (payload.length > 0) {
    const { error } = await supabase.from(table).upsert(payload, { onConflict: "id" });
    if (error) throw error;
  }
}

async function syncRemoteState() {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (!sessionData.session) return;
  const userId = sessionData.session.user.id;

  await syncCollection("tools", state.tools, (tool) => ({
    id: tool.id,
    name: tool.name,
    provider_name: tool.provider ?? tool.provider_name ?? null,
    category: tool.category ?? null,
    description: tool.description ?? null,
    admin_url: tool.adminUrl ?? tool.admin_url ?? null,
    official_url: tool.officialUrl ?? tool.official_url ?? null,
    status: tool.status ?? "active",
    notes: tool.notes ?? null,
  }));
  await syncCollection("license_plans", state.licenses, (license) => ({
    id: license.id,
    tool_id: license.toolId ?? license.tool_id,
    plan_name: license.name ?? license.plan_name,
    total_quantity: license.quantity ?? license.total_quantity ?? 0,
    start_date: normalizeDate(license.startDate ?? license.start_date),
    end_date: normalizeDate(license.endDate ?? license.end_date),
    renewal_date: normalizeDate(license.renewal ?? license.renewal_date),
    auto_renew: license.autoRenew ?? license.auto_renew ?? false,
    billing_type: license.billingType ?? license.billing_type ?? "monthly",
    price: license.price ?? 0,
    status: license.status ?? "active",
    contract_number: license.contractNumber ?? license.contract_number ?? null,
    notice_days: license.noticeDays ?? license.notice_days ?? null,
    cost_center: license.costCenter ?? license.cost_center ?? null,
    owner: license.owner ?? null,
    vendor: license.vendor ?? null,
    vendor_contact: license.vendorContact ?? license.vendor_contact ?? null,
    document_url: license.documentUrl ?? license.document_url ?? null,
    notes: license.notes ?? null,
  }));
  await syncCollection("members", state.members, (member) => ({
    id: member.id,
    name: member.name,
    email: member.email,
    member_number: member.number ?? member.member_number,
    department: member.department ?? null,
    position: member.position ?? null,
    manager_id: member.managerId ?? member.manager_id ?? null,
    employment_type: member.employmentType ?? member.employment_type ?? null,
    hire_date: normalizeDate(member.hireDate ?? member.hire_date),
    contract_end_date: normalizeDate(member.contractEndDate ?? member.contract_end_date),
    leave_date: normalizeDate(member.leaveDate ?? member.leave_date),
    status: member.status ?? "active",
    notes: member.notes ?? null,
  }));
  await syncCollection("license_assignments", state.assignments, (assignment) => ({
    id: assignment.id,
    license_plan_id: assignment.licenseId ?? assignment.license_plan_id,
    member_id: assignment.memberId ?? assignment.member_id,
    assigned_at: normalizeDate(assignment.assignedAt ?? assignment.assigned_at),
    status: assignment.status ?? "assigned",
    requested_by: assignment.requestedBy ?? assignment.requested_by ?? null,
    reason: assignment.reason ?? assignment.reason ?? null,
    last_used_at: normalizeDate(assignment.lastUsedAt ?? assignment.last_used_at),
    notes: assignment.notes ?? null,
  }));
  const { data: existingLogs, error: existingLogsError } = await supabase
    .from("operation_logs")
    .select("id");
  if (existingLogsError) throw existingLogsError;
  const existingLogIds = new Set(existingLogs.map((log) => log.id));
  const newLogs = state.logs.filter((log) => !existingLogIds.has(log.id));
  await syncCollection("operation_logs", newLogs, (log) => ({
    user_id: userId,
    action_type: log.action ?? log.action_type,
    target_type: log.target ?? log.target_type,
    target_id: log.targetId ?? log.target_id ?? null,
    created_at: log.at ?? log.created_at,
  }));
}

export function save() {
  if (state.logs.length > LOG_LIMIT) state.logs.splice(0, state.logs.length - LOG_LIMIT);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    void syncRemoteState().catch((error) => {
      console.error("Supabaseへの保存に失敗しました", error);
    });
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

// 割り当て中の数（ライセンス単位・社員単位）。数える処理はここにまとめる
export const usedCount = (licenseId) =>
  state.assignments.filter(
    (item) => item.licenseId === Number(licenseId) && item.status === "assigned",
  ).length;

export const memberAssignedCount = (memberId) =>
  state.assignments.filter(
    (item) => item.memberId === Number(memberId) && item.status === "assigned",
  ).length;
