export const APP_ROLES = ["guest", "user", "trusted", "editor", "admin"] as const;
export type AppRole = typeof APP_ROLES[number];

export const APP_PERMISSIONS = [
  "view_public",
  "participate",
  "edit_content",
  "set_recommendations",
  "review_edit_suggestions",
  "revert_revisions",
  "view_dashboard",
  "moderate_content",
  "merge_terms",
  "manage_users",
  "issue_temporary_passwords",
  "process_account_deletions",
] as const;
export type AppPermission = typeof APP_PERMISSIONS[number];

export const ROLE_LABELS: Record<AppRole, string> = {
  guest: "閲覧者",
  user: "利用者",
  trusted: "信頼ユーザー",
  editor: "編集者",
  admin: "管理者",
};

const participantPermissions = [
  "view_public",
  "participate",
] as const satisfies readonly AppPermission[];

const editorPermissions = [
  ...participantPermissions,
  "edit_content",
  "set_recommendations",
  "review_edit_suggestions",
  "revert_revisions",
  "view_dashboard",
  "moderate_content",
  "merge_terms",
] as const satisfies readonly AppPermission[];

export const ROLE_PERMISSIONS = {
  guest: ["view_public"],
  user: participantPermissions,
  trusted: participantPermissions,
  editor: editorPermissions,
  admin: [
    ...editorPermissions,
    "manage_users",
    "issue_temporary_passwords",
    "process_account_deletions",
  ],
} as const satisfies Record<AppRole, readonly AppPermission[]>;

export const PERMISSION_ROWS = [
  {
    permission: "view_public",
    label: "公開中の項目・日本語案を見る",
    note: "ログイン不要",
  },
  {
    permission: "participate",
    label: "投稿・評価・コメント・通報・修正提案",
    note: "ログインとメール確認が必要",
  },
  {
    permission: "edit_content",
    label: "修正を直接反映する",
    note: "理由を変更履歴へ記録",
  },
  {
    permission: "set_recommendations",
    label: "推奨する日本語案を設定する",
    note: "判断根拠と場面を記録",
  },
  {
    permission: "review_edit_suggestions",
    label: "修正提案を承認・却下する",
    note: "審査結果を記録",
  },
  {
    permission: "revert_revisions",
    label: "変更履歴から差し戻す",
    note: "差し戻し理由が必要",
  },
  {
    permission: "view_dashboard",
    label: "編集者ダッシュボードを見る",
    note: "通報・公開状態・重複候補を確認",
  },
  {
    permission: "moderate_content",
    label: "通報処理・非公開・復元を行う",
    note: "理由と実行者を記録",
  },
  {
    permission: "merge_terms",
    label: "重複項目を統合する",
    note: "確認文と理由が必要",
  },
  {
    permission: "manage_users",
    label: "ロール変更・利用停止・解除",
    note: "管理者画面で実行",
  },
  {
    permission: "issue_temporary_passwords",
    label: "一時パスワードを発行する",
    note: "次回変更を必須化",
  },
  {
    permission: "process_account_deletions",
    label: "アカウント削除申請を処理する",
    note: "個人情報を消去し投稿は匿名化",
  },
] as const satisfies ReadonlyArray<{
  permission: AppPermission;
  label: string;
  note: string;
}>;

export function isAppRole(role: string): role is AppRole {
  return APP_ROLES.includes(role as AppRole);
}

export function roleLabel(role: string) {
  return isAppRole(role) ? ROLE_LABELS[role] : "利用者";
}

export function hasPermission(role: string, permission: AppPermission) {
  if (!isAppRole(role)) return false;
  return (ROLE_PERMISSIONS[role] as readonly AppPermission[]).includes(permission);
}
