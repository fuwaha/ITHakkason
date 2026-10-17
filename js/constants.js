// 定数（コレクション名・表示名・初期値・ステータス）

export const COLLECTIONS = {
  account: "users",
  tool: "tools",
  license: "licenses",
  member: "members",
  assignment: "assignments",
};

export const TYPE_LABELS = {
  account: "アカウント",
  tool: "ツール",
  license: "ライセンス",
  member: "社員",
  assignment: "割り当て",
};

export const DEFAULTS = {
  account: { status: "active", role: "user", lastLoginAt: "" },
  tool: { status: "active" },
  license: { status: "active", licenseType: "user", billingType: "yearly", autoRenew: false },
  member: { status: "active", employmentType: "regular" },
  assignment: { status: "assigned" },
};

// ライセンスの種類（1席が何を表すか）
export const LICENSE_TYPES = {
  user: "ユーザー単位",
  device: "端末単位",
  concurrent: "同時接続数",
  site: "全社・拠点単位",
};

// 課金周期（schema.sql の billing_type と揃えている）
export const BILLING_TYPES = {
  monthly: "月額",
  yearly: "年額",
  "one-time": "買い切り",
  custom: "その他",
};

// 雇用形態
export const EMPLOYMENT_TYPES = {
  regular: "正社員",
  contract: "契約社員",
  dispatch: "派遣社員",
  part: "パート・アルバイト",
  outsourcing: "業務委託",
};
// 期間の決まった雇用形態（契約終了日を入れてもらう）
export const FIXED_TERM_TYPES = new Set(["contract", "dispatch", "part", "outsourcing"]);

// 返却理由の選択肢
export const RELEASE_REASONS = ["退職", "異動", "契約終了", "不要になった", "別のライセンスに切り替え", "その他"];

// 「対応が必要なこと」に出す基準
export const ALERT_DAYS = 30; // 期限・退職予定がこの日数以内なら知らせる
export const UNUSED_DAYS = 90; // 最終利用からこの日数を過ぎたら「使われていない」

// ステータスの表示名（schema.sql の ENUM と揃えている）
export const STATUS_LABELS = {
  active: "有効",
  inactive: "無効",
  pending: "準備中",
  suspended: "停止中",
  expired: "期限切れ",
  cancelled: "解約済み",
  on_leave: "休職中",
  assigned: "割り当て中",
  released: "返却済み",
};

// フォームで選べるステータス（種類ごと）
export const STATUS_OPTIONS = {
  tool: ["active", "inactive", "pending", "suspended"],
  license: ["active", "pending", "expired", "cancelled"],
  member: ["active", "on_leave", "inactive", "suspended"],
  account: ["active", "inactive"],
};

export const ROLE_LABELS = {
  admin: "管理者",
  manager: "マネージャー",
  user: "閲覧のみ",
};

// 権限ごとにできること（アカウントの詳細とフォームの説明に使う）
export const ROLE_DESCRIPTIONS = {
  admin: "すべての操作ができます（登録・編集・削除・割り当て・返却・アカウント管理）",
  manager: "一覧と詳細を見られます（編集できる範囲はバックエンドと決めてから広げる予定）",
  user: "一覧と詳細を見ることだけできます",
};
