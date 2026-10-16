// 定数（コレクション名・表示名・初期値）

export const COLLECTIONS = {
  tool: "tools",
  license: "licenses",
  member: "members",
  assignment: "assignments",
  listing: "listings",
};

export const TYPE_LABELS = {
  tool: "ツール",
  license: "ライセンス",
  member: "利用者",
  assignment: "割り当て",
  listing: "出品",
};

export const DEFAULTS = {
  tool: { status: "active" },
  license: { status: "active" },
  member: { status: "active" },
  assignment: { status: "assigned" },
  listing: { status: "active" },
};
