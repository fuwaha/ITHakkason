const seed = {
  tools: [
    { id: 1, name: "Microsoft 365", provider: "Microsoft", category: "業務ツール", status: "active" },
    { id: 2, name: "Adobe Creative Cloud", provider: "Adobe", category: "デザイン", status: "active" },
    { id: 3, name: "Slack", provider: "Salesforce", category: "コミュニケーション", status: "active" }
  ],
  licenses: [
    { id: 1, toolId: 1, name: "Microsoft 365 Business Standard", quantity: 100, renewal: "2026-11-30", status: "active" },
    { id: 2, toolId: 2, name: "Creative Cloud Pro", quantity: 20, renewal: "2026-12-15", status: "active" },
    { id: 3, toolId: 3, name: "Slack Pro", quantity: 50, renewal: "2027-03-31", status: "active" }
  ],
  members: [
    { id: 1, name: "田中 太郎", email: "t.tanaka@example.jp", number: "E001", department: "情報システム部", status: "active" },
    { id: 2, name: "佐藤 花子", email: "h.sato@example.jp", number: "E002", department: "企画部", status: "active" },
    { id: 3, name: "鈴木 一郎", email: "i.suzuki@example.jp", number: "E003", department: "営業部", status: "active" }
  ],
  assignments: [
    { id: 1, licenseId: 1, memberId: 1, assignedAt: "2026-10-01", status: "assigned", assignedBy: "管理者" },
    { id: 2, licenseId: 2, memberId: 2, assignedAt: "2026-10-02", status: "assigned", assignedBy: "管理者" },
    { id: 3, licenseId: 1, memberId: 3, assignedAt: "2026-10-03", status: "assigned", assignedBy: "管理者" }
  ],
  logs: [{ id: 1, action: "初期データを読み込み", target: "システム", at: "2026-10-11 15:00", user: "管理者" }]
};

const state = JSON.parse(localStorage.getItem("licenseManagerState") || "null") || seed;
let formContext = null;
const $ = (selector) => document.querySelector(selector);
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
const save = () => localStorage.setItem("licenseManagerState", JSON.stringify(state));
const nextId = (items) => items.reduce((max, item) => Math.max(max, item.id), 0) + 1;
const toolById = (id) => state.tools.find((tool) => tool.id === Number(id));
const licenseById = (id) => state.licenses.find((license) => license.id === Number(id));
const memberById = (id) => state.members.find((member) => member.id === Number(id));
const formatDate = (date) => date ? new Date(`${date}T00:00:00`).toLocaleDateString("ja-JP") : "-";
const statusLabel = (status) => ({ active: "有効", assigned: "割り当て中", released: "返却済み", inactive: "無効" }[status] || status);
const badge = (status, extra = "") => `<span class="badge ${extra || status}">${esc(statusLabel(status))}</span>`;
const authenticated = () => sessionStorage.getItem("licenseManagerAuthenticated") === "true";

function updateAuthView() {
  $("#loginScreen").classList.toggle("hidden", authenticated());
}

function downloadCsv(filename, headers, rows) {
  const csv = [headers, ...rows].map((row) => row.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }));
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function validateAssignment(memberId, licenseId) {
  const license = licenseById(licenseId);
  const member = memberById(memberId);
  if (!member || member.status !== "active") return "在籍中の利用者を選択してください。";
  if (!license || license.status !== "active") return "有効なライセンスを選択してください。";
  if (state.assignments.some((item) => item.memberId === memberId && item.licenseId === licenseId && item.status === "assigned")) return "この利用者には同じライセンスが既に割り当てられています。";
  const used = state.assignments.filter((item) => item.licenseId === licenseId && item.status === "assigned").length;
  if (used >= license.quantity) return "利用可能なライセンス数を超えているため、割り当てできません。";
  return "";
}

function showView(view) {
  document.querySelectorAll(".view").forEach((element) => element.classList.toggle("active", element.id === view));
  document.querySelectorAll(".nav-item").forEach((element) => element.classList.toggle("active", element.dataset.view === view));
  render();
}

function notify(message, error = false) {
  const element = $("#notice");
  element.textContent = message;
  element.className = `notice${error ? " error" : ""}`;
  element.hidden = false;
  setTimeout(() => { element.hidden = true; }, 2600);
}

function renderDashboard() {
  const assigned = state.assignments.filter((item) => item.status === "assigned").length;
  const total = state.licenses.reduce((sum, item) => sum + item.quantity, 0);
  const renewals = [...state.licenses].sort((a, b) => a.renewal.localeCompare(b.renewal)).slice(0, 3);
  $("#metrics").innerHTML = [
    ["登録ツール", state.tools.length, "管理対象のサービス"],
    ["ライセンス総数", total, "契約済みライセンス"],
    ["割り当て済み", assigned, "現在利用中"],
    ["利用可能数", total - assigned, "割り当て可能"]
  ].map(([label, value, note]) => `<div class="metric"><div class="metric-label">${label}</div><div class="metric-value">${value}</div><div class="metric-note">${note}</div></div>`).join("");
  $("#renewalList").innerHTML = renewals.map((license) => `<div class="list-row"><div><div class="list-main">${esc(license.name)}</div><div class="list-sub">${esc(toolById(license.toolId)?.name)} / 更新日 ${formatDate(license.renewal)}</div></div>${badge("warning", "warning")}</div>`).join("") || '<div class="empty">更新予定はありません</div>';
  $("#recentLogs").innerHTML = state.logs.slice(-4).reverse().map((log) => `<div class="list-row"><div><div class="list-main">${esc(log.action)}</div><div class="list-sub">${esc(log.target)} ・ ${esc(log.user)}</div></div><div class="list-sub">${esc(log.at)}</div></div>`).join("") || '<div class="empty">操作履歴はありません</div>';
}

function renderTools() {
  const query = ($("#toolSearch")?.value || "").toLowerCase();
  const rows = state.tools.filter((tool) => `${tool.name} ${tool.provider}`.toLowerCase().includes(query));
  $("#toolCount").textContent = `${rows.length}件`;
  $("#toolsTable").innerHTML = rows.map((tool) => {
    const count = state.licenses.filter((license) => license.toolId === tool.id).reduce((sum, license) => sum + license.quantity, 0);
    return `<tr><td><strong>${esc(tool.name)}</strong></td><td>${esc(tool.provider)}</td><td>${esc(tool.category)}</td><td>${count}</td><td>${badge(tool.status)}</td><td class="row-actions"><button class="link-button" data-edit="tool" data-id="${tool.id}">編集</button><button class="link-button danger" data-delete="tool" data-id="${tool.id}">削除</button></td></tr>`;
  }).join("") || '<tr><td class="empty" colspan="6">該当するツールはありません</td></tr>';
}

function renderLicenses() {
  const query = ($("#licenseSearch")?.value || "").toLowerCase();
  const rows = state.licenses.filter((license) => `${license.name} ${toolById(license.toolId)?.name}`.toLowerCase().includes(query));
  $("#licenseCount").textContent = `${rows.length}件`;
  $("#licensesTable").innerHTML = rows.map((license) => {
    const used = state.assignments.filter((item) => item.licenseId === license.id && item.status === "assigned").length;
    return `<tr><td><strong>${esc(license.name)}</strong></td><td>${esc(toolById(license.toolId)?.name)}</td><td>${license.quantity}</td><td>${used}</td><td>${formatDate(license.renewal)}</td><td>${badge(license.status)}</td><td class="row-actions"><button class="link-button" data-edit="license" data-id="${license.id}">編集</button><button class="link-button danger" data-delete="license" data-id="${license.id}">削除</button></td></tr>`;
  }).join("") || '<tr><td class="empty" colspan="7">該当するライセンスはありません</td></tr>';
}

function renderMembers() {
  const query = ($("#memberSearch")?.value || "").toLowerCase();
  const rows = state.members.filter((member) => `${member.name} ${member.email} ${member.department}`.toLowerCase().includes(query));
  $("#memberCount").textContent = `${rows.length}件`;
  $("#membersTable").innerHTML = rows.map((member) => `<tr><td><strong>${esc(member.name)}</strong></td><td>${esc(member.email)}</td><td>${esc(member.number)}</td><td>${esc(member.department)}</td><td>${state.assignments.filter((item) => item.memberId === member.id && item.status === "assigned").length}</td><td>${badge(member.status)}</td><td class="row-actions"><button class="link-button" data-edit="member" data-id="${member.id}">編集</button><button class="link-button danger" data-delete="member" data-id="${member.id}">削除</button></td></tr>`).join("") || '<tr><td class="empty" colspan="7">該当する利用者はいません</td></tr>';
}

function renderAssignments() {
  $("#assignmentsTable").innerHTML = state.assignments.map((assignment) => `<tr><td>${esc(memberById(assignment.memberId)?.name)}</td><td>${esc(licenseById(assignment.licenseId)?.name)}</td><td>${formatDate(assignment.assignedAt)}</td><td>${badge(assignment.status)}</td><td>${esc(assignment.assignedBy)}</td><td>${assignment.status === "assigned" ? `<button class="link-button" data-release="${assignment.id}">返却</button>` : ""}</td></tr>`).join("") || '<tr><td class="empty" colspan="6">割り当てはありません</td></tr>';
}

function renderLogs() {
  $("#logsTable").innerHTML = state.logs.slice().reverse().map((log) => `<tr><td>${esc(log.at)}</td><td>${esc(log.action)}</td><td>${esc(log.target)}</td><td>${esc(log.user)}</td></tr>`).join("");
}

function render() {
  renderDashboard(); renderTools(); renderLicenses(); renderMembers(); renderAssignments(); renderLogs();
}

const field = (name, label, type = "text", value = "", options = "") => `<div class="field"><label for="field-${name}">${label}</label>${type === "select" ? `<select id="field-${name}" name="${name}" required>${options}</select>` : `<input id="field-${name}" name="${name}" type="${type}" value="${esc(value)}" required>`}</div>`;

function openForm(type, item = null) {
  formContext = { type, id: item?.id };
  const edit = Boolean(item);
  let title = `${edit ? "編集" : "登録"}`;
  let fields = "";
  if (type === "tool") fields = field("name", "ツール名", "text", item?.name) + field("provider", "提供会社", "text", item?.provider) + field("category", "カテゴリ", "text", item?.category);
  if (type === "license") fields = field("name", "ライセンス名", "text", item?.name) + field("toolId", "対象ツール", "select", "", state.tools.map((tool) => `<option value="${tool.id}" ${item?.toolId === tool.id ? "selected" : ""}>${esc(tool.name)}</option>`).join("")) + field("quantity", "契約数", "number", item?.quantity || 1) + field("renewal", "更新日", "date", item?.renewal);
  if (type === "member") fields = field("name", "氏名", "text", item?.name) + field("email", "メールアドレス", "email", item?.email) + field("number", "社員番号", "text", item?.number) + field("department", "部署", "text", item?.department);
  if (type === "assignment") fields = field("memberId", "利用者", "select", "", state.members.map((member) => `<option value="${member.id}">${esc(member.name)}</option>`).join("")) + field("licenseId", "ライセンス", "select", "", state.licenses.map((license) => `<option value="${license.id}">${esc(license.name)}</option>`).join("")) + field("assignedAt", "割り当て日", "date", new Date().toISOString().slice(0, 10));
  $("#dialogTitle").textContent = `${title}${{ tool: "ツール", license: "ライセンス", member: "利用者", assignment: "割り当て" }[type]}`;
  $("#formFields").innerHTML = fields;
  $("#formDialog").showModal();
}

function addLog(action, target) {
  state.logs.push({ id: nextId(state.logs), action, target, at: new Date().toLocaleString("ja-JP"), user: "管理者" });
}

$("#entityForm").addEventListener("submit", (event) => {
  if (event.submitter?.value === "cancel") return;
  event.preventDefault();
  const values = Object.fromEntries(new FormData(event.currentTarget));
  if (formContext.type === "assignment" && !formContext.id) {
    const validationMessage = validateAssignment(Number(values.memberId), Number(values.licenseId));
    if (validationMessage) return notify(validationMessage, true);
  }
  const collection = { tool: "tools", license: "licenses", member: "members", assignment: "assignments" }[formContext.type];
  if (formContext.id) Object.assign(state[collection].find((item) => item.id === formContext.id), values);
  else state[collection].push({ id: nextId(state[collection]), ...(formContext.type === "tool" ? { status: "active" } : formContext.type === "license" ? { status: "active", quantity: Number(values.quantity), toolId: Number(values.toolId) } : formContext.type === "member" ? { status: "active" } : { memberId: Number(values.memberId), licenseId: Number(values.licenseId), status: "assigned", assignedBy: "管理者" }) , ...values });
  if (formContext.type === "license") {
    const license = formContext.id ? licenseById(formContext.id) : state.licenses.at(-1);
    license.quantity = Number(values.quantity);
    license.toolId = Number(values.toolId);
  }
  if (formContext.type === "assignment") {
    const assignment = formContext.id ? state.assignments.find((item) => item.id === formContext.id) : state.assignments.at(-1);
    assignment.memberId = Number(values.memberId);
    assignment.licenseId = Number(values.licenseId);
  }
  addLog(`${formContext.id ? "更新" : "登録"}`, { tool: "ツール", license: "ライセンス", member: "利用者", assignment: "割り当て" }[formContext.type]);
  save(); $("#formDialog").close(); notify("保存しました"); render();
});

document.addEventListener("click", (event) => {
  const target = event.target.closest("[data-view], [data-view-target], [data-edit], [data-delete], [data-release]");
  if (!target) return;
  if (target.dataset.view || target.dataset.viewTarget) return showView(target.dataset.view || target.dataset.viewTarget);
  const type = target.dataset.edit || target.dataset.delete;
  if (target.dataset.edit) return openForm(type, ({ tool: state.tools, license: state.licenses, member: state.members }[type]).find((item) => item.id === Number(target.dataset.id)));
  if (target.dataset.delete) {
    const collection = { tool: "tools", license: "licenses", member: "member" }[type];
    const items = type === "tool" ? state.tools : type === "license" ? state.licenses : state.members;
    const item = items.find((entry) => entry.id === Number(target.dataset.id));
    if (!confirm(`${item.name}を削除しますか？`)) return;
    items.splice(items.indexOf(item), 1); addLog("削除", item.name); save(); notify("削除しました"); render();
  }
  if (target.dataset.release) { const assignment = state.assignments.find((item) => item.id === Number(target.dataset.release)); assignment.status = "released"; addLog("返却", licenseById(assignment.licenseId)?.name); save(); notify("返却しました"); render(); }
});

document.querySelectorAll(".nav-item").forEach((button) => button.addEventListener("click", () => showView(button.dataset.view)));
document.querySelectorAll("[data-view-target]").forEach((button) => button.addEventListener("click", () => showView(button.dataset.viewTarget)));
$("#addToolButton").addEventListener("click", () => openForm("tool"));
$("#addLicenseButton").addEventListener("click", () => openForm("license"));
$("#addMemberButton").addEventListener("click", () => openForm("member"));
$("#addAssignmentButton").addEventListener("click", () => openForm("assignment"));
["toolSearch", "licenseSearch", "memberSearch"].forEach((id) => $(`#${id}`).addEventListener("input", render));
$("#loginForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const email = $("#loginEmail").value.trim().toLowerCase();
  const password = $("#loginPassword").value;
  const valid = email === "admin@example.jp" && password === "demo1234";
  $("#loginError").hidden = valid;
  if (valid) {
    sessionStorage.setItem("licenseManagerAuthenticated", "true");
    updateAuthView();
    notify("ログインしました");
  }
});
$("#logoutButton").addEventListener("click", () => {
  sessionStorage.removeItem("licenseManagerAuthenticated");
  updateAuthView();
});
$("#exportLicensesButton").addEventListener("click", () => downloadCsv("licenses.csv", ["ライセンス名", "対象ツール", "契約数", "利用数", "更新日", "ステータス"], state.licenses.map((license) => [license.name, toolById(license.toolId)?.name, license.quantity, state.assignments.filter((item) => item.licenseId === license.id && item.status === "assigned").length, license.renewal, statusLabel(license.status)])));
$("#exportMembersButton").addEventListener("click", () => downloadCsv("members.csv", ["氏名", "メールアドレス", "社員番号", "部署", "ステータス"], state.members.map((member) => [member.name, member.email, member.number, member.department, statusLabel(member.status)])));
$("#memberImport").addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const lines = String(reader.result).replace(/^\ufeff/, "").split(/\r?\n/).filter(Boolean);
    const imported = lines.slice(1).map((line) => line.split(",").map((value) => value.trim().replace(/^"|"$/g, ""))).filter((row) => row.length >= 4 && row[0]);
    imported.forEach(([name, email, number, department]) => {
      if (!state.members.some((member) => member.email === email || member.number === number)) state.members.push({ id: nextId(state.members), name, email, number, department, status: "active" });
    });
    addLog("CSV取込", `${imported.length}件の利用者`);
    save(); render(); notify(`${imported.length}件の利用者を取り込みました`);
    event.target.value = "";
  };
  reader.readAsText(file, "UTF-8");
});
updateAuthView();
render();
