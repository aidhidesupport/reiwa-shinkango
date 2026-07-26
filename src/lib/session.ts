import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "./auth";
import { hasPermission } from "./permissions";
import { prisma } from "./prisma";

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const payload = verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!payload) return null;
  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user || user.suspendedAt || user.deletedAt || user.sessionVersion !== payload.sessionVersion) return null;
  return user;
}

export async function requireActiveUser({
  allowPasswordChange = false,
  allowUnverifiedEmail = false,
}: {
  allowPasswordChange?: boolean;
  allowUnverifiedEmail?: boolean;
} = {}) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("ログインが必要です。");
  }
  if (user.suspendedAt) {
    throw new Error("このアカウントは停止されています。");
  }
  if (user.mustChangePassword && !allowPasswordChange) {
    throw new Error("先に一時パスワードを新しいパスワードへ変更してください。");
  }
  if (user.email && !user.emailVerifiedAt && !allowUnverifiedEmail) {
    throw new Error("参加するには、先にアカウント画面でメールアドレスを確認してください。");
  }
  if (!hasPermission(user.role, "participate")) {
    throw new Error("このアカウントには操作権限がありません。");
  }
  return user;
}

export function canEditRecommendations(role: string) {
  return hasPermission(role, "set_recommendations");
}

export function canEditContent(role: string) {
  return hasPermission(role, "edit_content");
}

export function canReviewEditSuggestions(role: string) {
  return hasPermission(role, "review_edit_suggestions");
}

export function canRevertRevisions(role: string) {
  return hasPermission(role, "revert_revisions");
}

export function canAccessDashboard(role: string) {
  return hasPermission(role, "view_dashboard");
}

export function canModerate(role: string) {
  return hasPermission(role, "moderate_content");
}

export function canMergeTerms(role: string) {
  return hasPermission(role, "merge_terms");
}

export function canAdmin(role: string) {
  return hasPermission(role, "manage_users");
}

export function canIssueTemporaryPasswords(role: string) {
  return hasPermission(role, "issue_temporary_passwords");
}

export function canProcessAccountDeletions(role: string) {
  return hasPermission(role, "process_account_deletions");
}
