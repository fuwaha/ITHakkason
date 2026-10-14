// 初期データ（初回起動時に使うサンプルデータ）

export const seed = {
  users: [
    { id: 1, name: "管理者", email: "admin@example.jp", password: "demo1234", role: "admin" },
    { id: 2, name: "山本 マネージャー", email: "manager@example.jp", password: "manager1234", role: "manager" },
    { id: 3, name: "中村 ユーザー", email: "user@example.jp", password: "user1234", role: "user" },
  ],
  tools: [
    {
      id: 1,
      name: "Microsoft 365",
      provider: "Microsoft",
      category: "業務ツール",
      status: "active",
    },
    {
      id: 2,
      name: "Adobe Creative Cloud",
      provider: "Adobe",
      category: "デザイン",
      status: "active",
    },
    {
      id: 3,
      name: "Slack",
      provider: "Salesforce",
      category: "コミュニケーション",
      status: "active",
    },
  ],
  licenses: [
    {
      id: 1,
      toolId: 1,
      name: "Microsoft 365 Business Standard",
      quantity: 100,
      renewal: "2026-11-30",
      status: "active",
    },
    {
      id: 2,
      toolId: 2,
      name: "Creative Cloud Pro",
      quantity: 20,
      renewal: "2026-12-15",
      status: "active",
    },
    { id: 3, toolId: 3, name: "Slack Pro", quantity: 50, renewal: "2027-03-31", status: "active" },
  ],
  members: [
    {
      id: 1,
      name: "田中 太郎",
      email: "t.tanaka@example.jp",
      number: "E001",
      department: "情報システム部",
      status: "active",
    },
    {
      id: 2,
      name: "佐藤 花子",
      email: "h.sato@example.jp",
      number: "E002",
      department: "企画部",
      status: "active",
    },
    {
      id: 3,
      name: "鈴木 一郎",
      email: "i.suzuki@example.jp",
      number: "E003",
      department: "営業部",
      status: "active",
    },
  ],
  assignments: [
    {
      id: 1,
      licenseId: 1,
      memberId: 1,
      assignedAt: "2026-10-01",
      status: "assigned",
      assignedBy: "管理者",
    },
    {
      id: 2,
      licenseId: 2,
      memberId: 2,
      assignedAt: "2026-10-02",
      status: "assigned",
      assignedBy: "管理者",
    },
    {
      id: 3,
      licenseId: 1,
      memberId: 3,
      assignedAt: "2026-10-03",
      status: "assigned",
      assignedBy: "管理者",
    },
  ],
  logs: [
    {
      id: 1,
      action: "初期データを読み込み",
      target: "システム",
      at: "2026-10-11 15:00",
      user: "管理者",
    },
  ],
};
