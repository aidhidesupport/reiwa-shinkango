import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "./auth";
import { prisma } from "./prisma";

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const payload = verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!payload) return null;
  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user || user.suspendedAt) return null;
  return user;
}

export async function requireActiveUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("ログインが必要です。");
  }
  if (user.suspendedAt) {
    throw new Error("このアカウントは停止されています。");
  }
  return user;
}

export function canEditRecommendations(role: string) {
  return role === "editor" || role === "admin";
}

export function canModerate(role: string) {
  return role === "editor" || role === "admin";
}

export function canAdmin(role: string) {
  return role === "admin";
}
