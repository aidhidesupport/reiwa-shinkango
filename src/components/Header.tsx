import Link from "next/link";
import { Bell, BookOpen, LayoutDashboard, LogIn, LogOut, Plus, ScrollText, Search, Shield } from "lucide-react";
import { signOut } from "@/app/actions";
import { roleLabel } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { canAccessDashboard, canAdmin, getCurrentUser } from "@/lib/session";

export async function Header() {
  const currentUser = await getCurrentUser();
  const unreadNotificationCount = currentUser
    ? await prisma.notification.count({
        where: {
          userId: currentUser.id,
          readAt: null,
        },
      })
    : 0;

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link href="/" className="brand" aria-label="令和新漢語">
          <BookOpen size={22} />
          <span>令和新漢語</span>
        </Link>

        <form action="/search" className="header-search">
          <Search size={17} aria-hidden="true" />
          <input name="q" placeholder="横文字・日本語案を検索" />
        </form>

        <nav className="header-nav" aria-label="主要導線">
          <Link href="/rules" className="icon-link">
            <ScrollText size={17} />
            <span>ルール</span>
          </Link>
          <Link href="/terms/new" className="icon-link">
            <Plus size={17} />
            <span>投稿</span>
          </Link>
          {currentUser ? (
            <Link
              href="/notifications"
              className="icon-link notification-link"
              aria-label={`通知${unreadNotificationCount > 0 ? `、未読${unreadNotificationCount}件` : ""}`}
            >
              <Bell size={17} />
              <span>通知</span>
              {unreadNotificationCount > 0 ? (
                <strong>{unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}</strong>
              ) : null}
            </Link>
          ) : null}
          {currentUser && canAccessDashboard(currentUser.role) ? (
            <Link href="/dashboard" className="icon-link">
              <LayoutDashboard size={17} />
              <span>整理</span>
            </Link>
          ) : null}
          {currentUser && canAdmin(currentUser.role) ? (
            <Link href="/admin" className="icon-link">
              <Shield size={17} />
              <span>管理</span>
            </Link>
          ) : null}
        </nav>

        {currentUser ? (
          <div className="user-switcher">
            <span className="role-pill">{roleLabel(currentUser.role)}</span>
            <Link href="/my" className="user-name">{currentUser.displayName}</Link>
            <form action={signOut}>
              <button type="submit" aria-label="ログアウト">
                <LogOut size={16} />
              </button>
            </form>
          </div>
        ) : (
          <Link href="/login" className="login-link">
            <LogIn size={17} />
            <span>ログイン</span>
          </Link>
        )}
      </div>
    </header>
  );
}
