"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import {
  SESSION_COOKIE,
  createSessionToken,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";
import { enforceAuthRateLimit } from "@/lib/auth-rate-limit";
import type { ActionState } from "@/lib/action-state";
import {
  sendEmailVerificationEmail,
  sendPasswordChangedEmail,
  sendPasswordResetEmail,
} from "@/lib/email";
import {
  EMAIL_VERIFICATION_TTL_HOURS,
  buildEmailVerificationUrl,
  createEmailVerificationToken,
  hashEmailVerificationToken,
  isEmailVerificationTokenUsable,
} from "@/lib/email-verification";
import { EVALUATION_LABEL_IDS, RECOMMENDATION_LEVELS } from "@/lib/labels";
import { joinLabels, normalizeForSearch, slugifyHeadword } from "@/lib/normalize";
import {
  PASSWORD_RESET_TTL_MINUTES,
  buildPasswordResetUrl,
  createPasswordResetToken,
  hashPasswordResetToken,
  isPasswordResetTokenUsable,
} from "@/lib/password-reset";
import { CONTRIBUTION_POLICY, TERMS_VERSION } from "@/lib/public-config";
import { getRateLimitPolicy, type RateLimitKind } from "@/lib/rate-limit";
import {
  canAdmin,
  canEditContent,
  canEditRecommendations,
  canIssueTemporaryPasswords,
  canMergeTerms,
  canModerate,
  canProcessAccountDeletions,
  canReviewEditSuggestions,
  canRevertRevisions,
  requireActiveUser,
} from "@/lib/session";
import { termMergeConfirmation } from "@/lib/term-merge";
import { prisma } from "@/lib/prisma";

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function optionalText(formData: FormData, name: string) {
  const value = text(formData, name);
  return value.length > 0 ? value : undefined;
}

const tagListSchema = z
  .array(z.string().trim().min(1).max(80))
  .max(20, "タグは20個以内にしてください。");

function tagNamesFromForm(formData: FormData) {
  const uniqueTags = new Map<string, string>();
  for (const name of text(formData, "tags").split(/[,\s、]+/)) {
    const trimmed = name.trim();
    if (trimmed) uniqueTags.set(normalizeForSearch(trimmed), trimmed);
  }
  return tagListSchema.parse([...uniqueTags.values()]);
}

async function replaceSenseTags(
  tx: Prisma.TransactionClient,
  senseId: string,
  tagNames: string[],
) {
  await tx.senseTag.deleteMany({ where: { senseId } });
  for (const name of tagNames) {
    const slug = normalizeForSearch(name);
    const tag = await tx.tag.upsert({
      where: { slug },
      update: {},
      create: { slug, name },
    });
    await tx.senseTag.create({
      data: { senseId, tagId: tag.id },
    });
  }
}

function safePath(value: string, fallback: string) {
  const safeValue = value.startsWith("/") && !value.startsWith("//") && !value.includes("\\") ? value : fallback;
  try {
    return encodeURI(decodeURI(safeValue));
  } catch {
    return encodeURI(safeValue);
  }
}

function termPath(slug: string, suffix = "") {
  return `/terms/${encodeURIComponent(slug)}${suffix}`;
}

function isRedirectSignal(error: unknown) {
  if (!error || typeof error !== "object" || !("digest" in error)) return false;
  return String(error.digest).startsWith("NEXT_REDIRECT");
}

function actionErrorMessage(error: unknown) {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message || "入力内容を確認してください。";
  }
  if (error instanceof Error) {
    if (error.message.includes("Unique constraint")) {
      return "同じ内容がすでに登録されています。";
    }
    if (!error.message.includes("Prisma") && !error.message.includes("Invalid `")) {
      return error.message;
    }
  }
  return "処理に失敗しました。入力内容を確認し、もう一度お試しください。";
}

async function runStatefulAction(
  action: (formData: FormData) => Promise<void>,
  formData: FormData,
  successMessage = "保存しました。",
): Promise<ActionState> {
  try {
    await action(formData);
    return { status: "success", message: successMessage };
  } catch (error) {
    if (isRedirectSignal(error)) throw error;
    const values: Record<string, string[]> = {};
    for (const [key, value] of formData.entries()) {
      if (typeof value !== "string" || /password|confirmation|token/i.test(key)) continue;
      values[key] = [...(values[key] ?? []), value];
    }
    return { status: "error", message: actionErrorMessage(error), values };
  }
}

async function uniqueSlug(headword: string) {
  const base = slugifyHeadword(headword) || `term-${Date.now()}`;
  let slug = base;
  let index = 2;

  while (
    await prisma.term.findUnique({ where: { slug } })
    || await prisma.termRedirect.findUnique({ where: { sourceSlug: slug } })
  ) {
    slug = `${base}-${index}`;
    index += 1;
  }

  return slug;
}

async function uniqueHandle(input: string) {
  const base =
    normalizeForSearch(input)
      .toLowerCase()
      .replace(/[^\p{Letter}\p{Number}_-]+/gu, "")
      .slice(0, 30) || `user${Date.now()}`;
  let handle = base;
  let index = 2;

  while (await prisma.user.findUnique({ where: { handle } })) {
    handle = `${base}${index}`;
    index += 1;
  }

  return handle;
}

const invalidTargetMessage = "投稿対象の組み合わせが正しくありません。画面を再読み込みしてください。";

async function requireTermTarget(termId: string, termSlug: string) {
  const term = await prisma.term.findUnique({
    where: { id: termId },
    select: { slug: true, status: true },
  });
  if (!term || term.slug !== termSlug || term.status !== "published") {
    throw new Error(invalidTargetMessage);
  }
}

async function requireSenseTarget({
  senseId,
  termId,
  termSlug,
}: {
  senseId: string;
  termId: string;
  termSlug: string;
}) {
  const sense = await prisma.sense.findUnique({
    where: { id: senseId },
    select: { termId: true, term: { select: { slug: true, status: true } } },
  });
  if (
    !sense
    || sense.termId !== termId
    || sense.term.slug !== termSlug
    || sense.term.status !== "published"
  ) {
    throw new Error(invalidTargetMessage);
  }
}

async function requireProposalTarget({
  proposalId,
  senseId,
  termId,
  termSlug,
}: {
  proposalId: string;
  senseId?: string;
  termId?: string;
  termSlug: string;
}) {
  const proposal = await prisma.translationProposal.findUnique({
    where: { id: proposalId },
    select: {
      senseId: true,
      status: true,
      sense: { select: { termId: true, term: { select: { slug: true, status: true } } } },
    },
  });
  if (
    !proposal
    || (senseId !== undefined && proposal.senseId !== senseId)
    || (termId !== undefined && proposal.sense.termId !== termId)
    || proposal.sense.term.slug !== termSlug
    || proposal.sense.term.status !== "published"
    || proposal.status === "hidden"
  ) {
    throw new Error(invalidTargetMessage);
  }
}

async function requireExampleTarget({
  exampleId,
  proposalId,
  termSlug,
}: {
  exampleId: string;
  proposalId: string;
  termSlug: string;
}) {
  const example = await prisma.usageExample.findUnique({
    where: { id: exampleId },
    select: {
      proposalId: true,
      status: true,
      term: { select: { slug: true, status: true } },
      proposal: { select: { status: true } },
    },
  });
  if (
    !example
    || example.proposalId !== proposalId
    || example.term.slug !== termSlug
    || example.term.status !== "published"
    || example.proposal?.status === "hidden"
    || example.status === "hidden"
  ) {
    throw new Error(invalidTargetMessage);
  }
}

async function requireCommentTarget({
  commentId,
  proposalId,
  termSlug,
}: {
  commentId: string;
  proposalId: string;
  termSlug: string;
}) {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: {
      proposalId: true,
      status: true,
      proposal: {
        select: {
          status: true,
          sense: { select: { term: { select: { slug: true, status: true } } } },
        },
      },
    },
  });
  if (
    !comment
    || comment.proposalId !== proposalId
    || comment.status === "hidden"
    || comment.proposal?.status === "hidden"
    || comment.proposal?.sense.term.status !== "published"
    || comment.proposal?.sense.term.slug !== termSlug
  ) {
    throw new Error(invalidTargetMessage);
  }
}

async function requireEditableTarget(targetType: "sense" | "proposal" | "example", targetId: string) {
  const exists = targetType === "sense"
    ? await prisma.sense.findFirst({
        where: { id: targetId, term: { status: "published" } },
        select: { id: true },
      })
    : targetType === "proposal"
      ? await prisma.translationProposal.findFirst({
          where: {
            id: targetId,
            status: { not: "hidden" },
            sense: { term: { status: "published" } },
          },
          select: { id: true },
        })
      : await prisma.usageExample.findFirst({
          where: {
            id: targetId,
            status: { not: "hidden" },
            term: { status: "published" },
            OR: [
              { proposalId: null },
              { proposal: { status: { not: "hidden" } } },
            ],
          },
          select: { id: true },
        });
  if (!exists) throw new Error("修正対象が見つかりません。");
}

async function enforceRateLimit(userId: string, kind: RateLimitKind) {
  const policy = getRateLimitPolicy();
  const since = new Date(Date.now() - policy.windowSeconds * 1000);
  const count = kind === "post"
    ? (await Promise.all([
        prisma.term.count({ where: { createdById: userId, createdAt: { gte: since } } }),
        prisma.sense.count({ where: { createdById: userId, createdAt: { gte: since } } }),
        prisma.translationProposal.count({ where: { createdById: userId, createdAt: { gte: since } } }),
        prisma.usageExample.count({ where: { createdById: userId, createdAt: { gte: since } } }),
        prisma.editSuggestion.count({ where: { createdById: userId, createdAt: { gte: since } } }),
      ])).reduce((total, current) => total + current, 0)
    : kind === "comment"
      ? await prisma.comment.count({ where: { userId, createdAt: { gte: since } } })
      : await prisma.report.count({ where: { createdById: userId, createdAt: { gte: since } } });

  if (count >= policy.limits[kind]) {
    throw new Error("短時間の投稿が多すぎます。少し時間をおいてください。");
  }
}

const termSchema = z.object({
  headword: z.string().min(1),
  senseTitle: z.string().min(1),
  senseDescription: z.string().min(8),
});

const proposalSubmissionSchema = z.object({
  text: z.string().trim().min(1, "日本語案を入力してください。").max(120),
  fitContext: z.string().trim().min(1, "よく合う場面を入力してください。").max(1000),
  unfitContext: z.string().trim().max(1000).optional(),
  rationale: z.string().trim().max(2000).optional(),
  pros: z.string().trim().max(1000).optional(),
  cons: z.string().trim().max(1000).optional(),
  register: z.enum(["casual", "neutral", "formal", "technical", "official"]),
});

const usageExampleSubmissionSchema = z.object({
  originalSentence: z.string().trim().min(3, "元の文は3文字以上で入力してください。").max(3000),
  rewrittenSentence: z.string().trim().min(3, "言い換えた文は3文字以上で入力してください。").max(3000),
  contextNote: z.string().trim().max(1000).optional(),
});

function proposalSubmissionFromForm(formData: FormData) {
  return proposalSubmissionSchema.parse({
    text: text(formData, "proposalText"),
    fitContext: text(formData, "fitContext"),
    unfitContext: optionalText(formData, "unfitContext"),
    rationale: optionalText(formData, "rationale"),
    pros: optionalText(formData, "pros"),
    cons: optionalText(formData, "cons"),
    register: text(formData, "register") || "neutral",
  });
}

function usageExampleSubmissionFromForm(formData: FormData) {
  const originalSentence = optionalText(formData, "originalSentence");
  const rewrittenSentence = optionalText(formData, "rewrittenSentence");
  if (!originalSentence && !rewrittenSentence) return null;
  if (!originalSentence || !rewrittenSentence) {
    throw new Error("言い換え例は、元の文と言い換えた文をセットで入力してください。");
  }
  return usageExampleSubmissionSchema.parse({
    originalSentence,
    rewrittenSentence,
    contextNote: optionalText(formData, "contextNote"),
  });
}

const signInSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(256),
});

const signUpSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(12, "パスワードは12文字以上にしてください。").max(256),
  displayName: z.string().trim().min(1).max(80),
  acceptTerms: z.literal("yes", { error: "利用規約と投稿データ方針への同意が必要です。" }),
});

const passwordResetRequestSchema = z.object({
  email: z.string().trim().email("メールアドレスを正しく入力してください。").max(254),
});

const passwordResetCompletionSchema = z.object({
  token: z.string().regex(/^[A-Za-z0-9_-]{40,200}$/, "再設定リンクが正しくありません。"),
  newPassword: z.string().min(12, "新しいパスワードは12文字以上にしてください。").max(256),
  confirmation: z.string().max(256),
});

const accountDeletionRequestSchema = z.object({
  currentPassword: z.string().min(1).max(256),
  confirmation: z.literal("アカウントを削除", {
    error: "確認欄に「アカウントを削除」と入力してください。",
  }),
  reason: z.string().trim().max(1000, "理由は1000文字以内で入力してください。").optional(),
});

const roleSchema = z.enum(["user", "trusted", "editor", "admin"]);

function deletedAccountHandle(userId: string) {
  const suffix = createHash("sha256").update(userId).digest("hex").slice(0, 16);
  return `deleted-${suffix}`;
}

async function createReport({
  userId,
  targetType,
  targetId,
  reason,
  detail,
}: {
  userId: string;
  targetType: "term" | "proposal" | "example" | "comment";
  targetId: string;
  reason: string;
  detail?: string;
}) {
  await prisma.report.create({
    data: {
      targetType,
      targetId,
      reason,
      detail,
      createdById: userId,
    },
  });
}

async function createNotification(
  tx: Prisma.TransactionClient,
  {
    userId,
    type,
    title,
    body,
    href,
    eventKey,
  }: {
    userId: string;
    type: "comment" | "recommendation" | "report";
    title: string;
    body: string;
    href: string;
    eventKey: string;
  },
) {
  await tx.notification.upsert({
    where: { eventKey },
    update: {},
    create: {
      userId,
      type,
      title,
      body,
      href,
      eventKey,
    },
  });
}

async function reportTargetHref(
  tx: Prisma.TransactionClient,
  targetType: string,
  targetId: string,
) {
  if (targetType === "term") {
    const term = await tx.term.findUnique({
      where: { id: targetId },
      select: { slug: true },
    });
    return term ? `/terms/${term.slug}` : "/notifications";
  }
  if (targetType === "proposal") {
    const proposal = await tx.translationProposal.findUnique({
      where: { id: targetId },
      select: { sense: { select: { term: { select: { slug: true } } } } },
    });
    return proposal
      ? `/terms/${proposal.sense.term.slug}#proposal-${targetId}`
      : "/notifications";
  }
  if (targetType === "example") {
    const example = await tx.usageExample.findUnique({
      where: { id: targetId },
      select: {
        proposalId: true,
        senseId: true,
        term: { select: { slug: true } },
      },
    });
    if (!example) return "/notifications";
    return example.proposalId
      ? `/terms/${example.term.slug}#proposal-${example.proposalId}-${targetId}`
      : `/terms/${example.term.slug}#sense-${example.senseId}`;
  }
  if (targetType === "comment") {
    const comment = await tx.comment.findUnique({
      where: { id: targetId },
      select: {
        proposal: {
          select: {
            id: true,
            sense: { select: { term: { select: { slug: true } } } },
          },
        },
      },
    });
    return comment?.proposal
      ? `/terms/${comment.proposal.sense.term.slug}#proposal-${comment.proposal.id}`
      : "/notifications";
  }
  return "/notifications";
}

export async function signUp(formData: FormData) {
  const email = text(formData, "email").toLowerCase();
  const password = text(formData, "password");
  const displayName = text(formData, "displayName");
  const handleInput = text(formData, "handle") || displayName || email.split("@")[0];
  const parsed = signUpSchema.parse({
    email,
    password,
    displayName,
    acceptTerms: text(formData, "acceptTerms"),
  });
  await enforceAuthRateLimit("sign-up", parsed.email);

  const existing = await prisma.user.findUnique({ where: { email: parsed.email } });
  if (existing) {
    throw new Error("このメールアドレスは既に登録されています。");
  }

  const verificationToken = createEmailVerificationToken();
  const handle = await uniqueHandle(handleInput);
  const user = await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        email: parsed.email,
        passwordHash: hashPassword(parsed.password),
        displayName: parsed.displayName,
        handle,
        termsAcceptedAt: new Date(),
        termsVersion: TERMS_VERSION,
        contributionPolicy: CONTRIBUTION_POLICY,
        role: "user",
      },
    });
    await tx.emailVerificationToken.create({
      data: {
        userId: createdUser.id,
        tokenHash: verificationToken.tokenHash,
        expiresAt: verificationToken.expiresAt,
      },
    });
    return createdUser;
  });

  let deliveryFailed = false;
  try {
    await sendEmailVerificationEmail(
      parsed.email,
      buildEmailVerificationUrl(verificationToken.token),
      EMAIL_VERIFICATION_TTL_HOURS,
    );
  } catch {
    deliveryFailed = true;
    console.error("Email verification delivery failed.");
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, createSessionToken(user.id, user.sessionVersion), {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  redirect(`/account?verificationSent=1${deliveryFailed ? "&verificationDelivery=failed" : ""}`);
}

export async function signIn(formData: FormData) {
  const email = text(formData, "email").toLowerCase();
  const password = text(formData, "password");
  const returnTo = safePath(text(formData, "returnTo"), "/");
  const parsed = signInSchema.parse({ email, password });
  await enforceAuthRateLimit("sign-in", parsed.email);
  const user = await prisma.user.findUnique({ where: { email: parsed.email } });

  if (!user || !verifyPassword(parsed.password, user.passwordHash)) {
    throw new Error("メールアドレスまたはパスワードが正しくありません。");
  }
  if (user.suspendedAt || user.deletedAt) {
    throw new Error("このアカウントは停止されています。");
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, createSessionToken(user.id, user.sessionVersion), {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  redirect(user.mustChangePassword ? "/account?passwordReset=1" : returnTo);
}

export async function signOut() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect("/");
}

export async function requestEmailVerification() {
  const user = await requireActiveUser({
    allowPasswordChange: true,
    allowUnverifiedEmail: true,
  });
  if (!user.email) throw new Error("確認するメールアドレスが登録されていません。");
  if (user.emailVerifiedAt) throw new Error("メールアドレスは確認済みです。");
  await enforceAuthRateLimit("email-verification-resend", user.email);

  const verificationToken = createEmailVerificationToken();
  await prisma.$transaction(async (tx) => {
    await tx.emailVerificationToken.deleteMany({ where: { userId: user.id } });
    await tx.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash: verificationToken.tokenHash,
        expiresAt: verificationToken.expiresAt,
      },
    });
  });

  try {
    await sendEmailVerificationEmail(
      user.email,
      buildEmailVerificationUrl(verificationToken.token),
      EMAIL_VERIFICATION_TTL_HOURS,
    );
  } catch {
    console.error("Email verification delivery failed.");
    throw new Error("確認メールを送信できませんでした。時間をおいてもう一度お試しください。");
  }
  revalidatePath("/account");
  redirect("/account?verificationSent=1");
}

export async function confirmEmailVerification(formData: FormData) {
  const token = z
    .string()
    .regex(/^[A-Za-z0-9_-]{40,200}$/, "確認リンクが正しくありません。")
    .parse(text(formData, "token"));
  const tokenHash = hashEmailVerificationToken(token);
  await enforceAuthRateLimit("email-verification-complete", tokenHash);
  const now = new Date();
  const verificationToken = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });
  if (
    !verificationToken
    || !isEmailVerificationTokenUsable(verificationToken, now)
    || verificationToken.user.suspendedAt
  ) {
    throw new Error("確認リンクが無効か、期限が切れています。確認メールを再送してください。");
  }

  await prisma.$transaction(async (tx) => {
    const consumed = await tx.emailVerificationToken.updateMany({
      where: {
        id: verificationToken.id,
        usedAt: null,
        expiresAt: { gt: now },
      },
      data: { usedAt: now },
    });
    if (consumed.count !== 1) {
      throw new Error("確認リンクが無効か、期限が切れています。確認メールを再送してください。");
    }
    await tx.emailVerificationToken.updateMany({
      where: {
        userId: verificationToken.userId,
        id: { not: verificationToken.id },
        usedAt: null,
      },
      data: { usedAt: now },
    });
    await tx.user.update({
      where: { id: verificationToken.userId },
      data: { emailVerifiedAt: verificationToken.user.emailVerifiedAt ?? now },
    });
  });

  revalidatePath("/account");
  redirect("/account?emailVerified=1");
}

export async function requestPasswordReset(formData: FormData) {
  const startedAt = Date.now();
  const parsed = passwordResetRequestSchema.parse({
    email: text(formData, "email").toLowerCase(),
  });
  await enforceAuthRateLimit("password-reset-request", parsed.email);

  const user = await prisma.user.findUnique({
    where: { email: parsed.email },
    select: { id: true, email: true, suspendedAt: true },
  });

  if (user?.email && !user.suspendedAt) {
    const now = new Date();
    const resetToken = createPasswordResetToken(now);
    await prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.deleteMany({ where: { userId: user.id } });
      await tx.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: resetToken.tokenHash,
          expiresAt: resetToken.expiresAt,
        },
      });
    });

    try {
      await sendPasswordResetEmail(
        user.email,
        buildPasswordResetUrl(resetToken.token),
        PASSWORD_RESET_TTL_MINUTES,
      );
    } catch {
      console.error("Password reset email delivery failed.");
    }

    if (Math.random() < 0.02) {
      await prisma.passwordResetToken.deleteMany({
        where: { expiresAt: { lt: now } },
      }).catch(() => undefined);
    }
  }

  const remainingDelay = 500 - (Date.now() - startedAt);
  if (remainingDelay > 0) {
    await new Promise((resolve) => setTimeout(resolve, remainingDelay));
  }
}

export async function completePasswordReset(formData: FormData) {
  const parsed = passwordResetCompletionSchema.parse({
    token: text(formData, "token"),
    newPassword: text(formData, "newPassword"),
    confirmation: text(formData, "confirmation"),
  });
  if (parsed.newPassword !== parsed.confirmation) {
    throw new Error("新しいパスワードが確認入力と一致しません。");
  }

  const tokenHash = hashPasswordResetToken(parsed.token);
  await enforceAuthRateLimit("password-reset-complete", tokenHash);
  const now = new Date();
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });
  if (
    !resetToken
    || !isPasswordResetTokenUsable(resetToken, now)
    || resetToken.user.suspendedAt
  ) {
    throw new Error("再設定リンクが無効か、期限が切れています。もう一度申請してください。");
  }
  if (verifyPassword(parsed.newPassword, resetToken.user.passwordHash)) {
    throw new Error("現在とは異なるパスワードを指定してください。");
  }

  await prisma.$transaction(async (tx) => {
    const consumed = await tx.passwordResetToken.updateMany({
      where: {
        id: resetToken.id,
        usedAt: null,
        expiresAt: { gt: now },
      },
      data: { usedAt: now },
    });
    if (consumed.count !== 1) {
      throw new Error("再設定リンクが無効か、期限が切れています。もう一度申請してください。");
    }

    await tx.passwordResetToken.updateMany({
      where: {
        userId: resetToken.userId,
        id: { not: resetToken.id },
        usedAt: null,
      },
      data: { usedAt: now },
    });
    await tx.user.update({
      where: { id: resetToken.userId },
      data: {
        passwordHash: hashPassword(parsed.newPassword),
        mustChangePassword: false,
        sessionVersion: { increment: 1 },
      },
    });
  });

  if (resetToken.user.email) {
    await sendPasswordChangedEmail(resetToken.user.email).catch(() => {
      console.error("Password change notification delivery failed.");
    });
  }

  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect("/login?passwordReset=1");
}

export async function createTerm(formData: FormData) {
  const user = await requireActiveUser();
  await enforceRateLimit(user.id, "post");
  const parsed = termSchema.parse({
    headword: text(formData, "headword"),
    senseTitle: text(formData, "senseTitle"),
    senseDescription: text(formData, "senseDescription"),
  });
  const proposalInput = proposalSubmissionFromForm(formData);
  const usageExampleInput = usageExampleSubmissionFromForm(formData);
  const domainId = optionalText(formData, "domainId");
  const slug = await uniqueSlug(parsed.headword);
  const tagNames = tagNamesFromForm(formData);

  const term = await prisma.$transaction(async (tx) => {
    const createdTerm = await tx.term.create({
      data: {
        headword: parsed.headword,
        slug,
        normalizedHeadword: normalizeForSearch(parsed.headword),
        originalWord: optionalText(formData, "originalWord"),
        summary: parsed.senseDescription,
        createdById: user.id,
      },
    });

    const sense = await tx.sense.create({
      data: {
        termId: createdTerm.id,
        domainId,
        title: parsed.senseTitle,
        description: parsed.senseDescription,
        createdById: user.id,
      },
    });
    await replaceSenseTags(tx, sense.id, tagNames);

    const proposal = await tx.translationProposal.create({
      data: {
        senseId: sense.id,
        text: proposalInput.text,
        fitContext: proposalInput.fitContext,
        unfitContext: proposalInput.unfitContext,
        rationale: proposalInput.rationale,
        pros: proposalInput.pros,
        cons: proposalInput.cons,
        register: proposalInput.register,
        status: usageExampleInput ? "active" : "draft",
        createdById: user.id,
      },
    });

    if (usageExampleInput) {
      await tx.usageExample.create({
        data: {
          termId: createdTerm.id,
          senseId: sense.id,
          proposalId: proposal.id,
          originalSentence: usageExampleInput.originalSentence,
          rewrittenSentence: usageExampleInput.rewrittenSentence,
          contextNote: usageExampleInput.contextNote,
          createdById: user.id,
        },
      });
    }

    await tx.revision.create({
      data: {
        entityType: "term",
        entityId: createdTerm.id,
        afterJson: JSON.stringify({
          headword: parsed.headword,
          summary: parsed.senseDescription,
          firstSense: parsed.senseTitle,
          firstSenseDomainId: domainId,
          firstSenseTags: tagNames,
          firstProposal: proposalInput.text,
        }),
        reason: "項目を新規作成",
        createdById: user.id,
      },
    });

    return createdTerm;
  });

  revalidatePath("/");
  redirect(termPath(term.slug));
}

export async function addSense(formData: FormData) {
  const user = await requireActiveUser();
  await enforceRateLimit(user.id, "post");
  const termId = text(formData, "termId");
  const termSlug = text(formData, "termSlug");
  const title = text(formData, "title");
  const description = text(formData, "description");
  const domainId = optionalText(formData, "domainId");
  const tagNames = tagNamesFromForm(formData);

  if (!termId || !title || !description) {
    throw new Error("使われ方の名前と説明は必須です。");
  }
  await requireTermTarget(termId, termSlug);

  await prisma.$transaction(async (tx) => {
    const createdSense = await tx.sense.create({
      data: {
        termId,
        domainId,
        title,
        description,
        createdById: user.id,
      },
    });
    await replaceSenseTags(tx, createdSense.id, tagNames);
    await tx.revision.create({
      data: {
        entityType: "sense",
        entityId: createdSense.id,
        afterJson: JSON.stringify({ title, description, domainId, tags: tagNames }),
        reason: "使われ方を追加",
        createdById: user.id,
      },
    });
  });

  revalidatePath(`/terms/${termSlug}`);
  redirect(termPath(termSlug));
}

export async function addProposal(formData: FormData) {
  const user = await requireActiveUser();
  await enforceRateLimit(user.id, "post");
  const senseId = text(formData, "senseId");
  const termId = text(formData, "termId");
  const termSlug = text(formData, "termSlug");

  if (!senseId || !termId) {
    throw new Error("日本語案の投稿先が見つかりません。画面を再読み込みしてください。");
  }
  await requireSenseTarget({ senseId, termId, termSlug });
  const proposalInput = proposalSubmissionFromForm(formData);
  const usageExampleInput = usageExampleSubmissionFromForm(formData);

  const proposal = await prisma.$transaction(async (tx) => {
    const createdProposal = await tx.translationProposal.create({
      data: {
        senseId,
        text: proposalInput.text,
        fitContext: proposalInput.fitContext,
        unfitContext: proposalInput.unfitContext,
        rationale: proposalInput.rationale,
        pros: proposalInput.pros,
        cons: proposalInput.cons,
        register: proposalInput.register,
        status: usageExampleInput ? "active" : "draft",
        createdById: user.id,
      },
    });

    if (usageExampleInput) {
      await tx.usageExample.create({
        data: {
          termId,
          senseId,
          proposalId: createdProposal.id,
          originalSentence: usageExampleInput.originalSentence,
          rewrittenSentence: usageExampleInput.rewrittenSentence,
          contextNote: usageExampleInput.contextNote,
          createdById: user.id,
        },
      });
    }

    await tx.revision.create({
      data: {
        entityType: "proposal",
        entityId: createdProposal.id,
        afterJson: JSON.stringify({
          text: proposalInput.text,
          fitContext: proposalInput.fitContext,
        }),
        reason: "日本語案を追加",
        createdById: user.id,
      },
    });

    return createdProposal;
  });

  revalidatePath(`/terms/${termSlug}`);
  redirect(termPath(termSlug, `#proposal-${proposal.id}`));
}

export async function addUsageExample(formData: FormData) {
  const user = await requireActiveUser();
  await enforceRateLimit(user.id, "post");
  const termId = text(formData, "termId");
  const senseId = text(formData, "senseId");
  const proposalId = text(formData, "proposalId");
  const termSlug = text(formData, "termSlug");
  const originalSentence = text(formData, "originalSentence");
  const rewrittenSentence = text(formData, "rewrittenSentence");

  if (!termId || !senseId || !proposalId || !originalSentence || !rewrittenSentence) {
    throw new Error("使用例の追加に必要な値が不足しています。");
  }
  await requireProposalTarget({ proposalId, senseId, termId, termSlug });

  const example = await prisma.$transaction(async (tx) => {
    const createdExample = await tx.usageExample.create({
      data: {
        termId,
        senseId,
        proposalId,
        originalSentence,
        rewrittenSentence,
        contextNote: optionalText(formData, "contextNote"),
        createdById: user.id,
      },
    });

    await tx.revision.create({
      data: {
        entityType: "example",
        entityId: createdExample.id,
        afterJson: JSON.stringify({
          originalSentence,
          rewrittenSentence,
          contextNote: optionalText(formData, "contextNote"),
        }),
        reason: "使用例を追加",
        createdById: user.id,
      },
    });

    return createdExample;
  });

  revalidatePath(`/terms/${termSlug}`);
  redirect(termPath(termSlug, `#proposal-${proposalId}-${example.id}`));
}

export async function evaluateProposal(formData: FormData) {
  const user = await requireActiveUser();
  const proposalId = text(formData, "proposalId");
  const termSlug = text(formData, "termSlug");
  const labels = [
    ...new Set(
      z
        .array(z.enum(EVALUATION_LABEL_IDS))
        .max(EVALUATION_LABEL_IDS.length)
        .parse(formData.getAll("labels").map(String)),
    ),
  ];

  if (!proposalId) {
    throw new Error("評価対象が見つかりません。");
  }
  await requireProposalTarget({ proposalId, termSlug });

  if (labels.length === 0) {
    await prisma.evaluation.deleteMany({
      where: {
        proposalId,
        userId: user.id,
      },
    });
  } else {
    await prisma.evaluation.upsert({
      where: {
        proposalId_userId: {
          proposalId,
          userId: user.id,
        },
      },
      update: {
        labelsCsv: joinLabels(labels),
      },
      create: {
        proposalId,
        userId: user.id,
        labelsCsv: joinLabels(labels),
      },
    });
  }

  revalidatePath(`/terms/${termSlug}`);
  redirect(termPath(termSlug, `#proposal-${proposalId}`));
}

export async function addComment(formData: FormData) {
  const user = await requireActiveUser();
  await enforceRateLimit(user.id, "comment");
  const proposalId = text(formData, "proposalId");
  const termSlug = text(formData, "termSlug");
  const body = text(formData, "body");

  if (!proposalId || body.length < 2) {
    throw new Error("コメント本文を入力してください。");
  }
  await requireProposalTarget({ proposalId, termSlug });

  await prisma.$transaction(async (tx) => {
    const proposal = await tx.translationProposal.findUnique({
      where: { id: proposalId },
      select: {
        text: true,
        createdById: true,
        createdBy: { select: { deletedAt: true } },
        sense: { select: { term: { select: { headword: true, slug: true } } } },
      },
    });
    if (!proposal) throw new Error("日本語案が見つかりません。");
    const comment = await tx.comment.create({
      data: {
        proposalId,
        userId: user.id,
        category: text(formData, "category") || "other",
        body,
      },
    });
    if (proposal.createdById !== user.id && !proposal.createdBy.deletedAt) {
      await createNotification(tx, {
        userId: proposal.createdById,
        type: "comment",
        title: "日本語案に新しいコメントがあります",
        body: `「${proposal.sense.term.headword}」の日本語案「${proposal.text}」にコメントが届きました。`,
        href: `/terms/${proposal.sense.term.slug}#proposal-${proposalId}`,
        eventKey: `comment:${comment.id}`,
      });
    }
  });

  revalidatePath("/", "layout");
  revalidatePath("/notifications");
  revalidatePath(`/terms/${termSlug}`);
  redirect(termPath(termSlug, `#proposal-${proposalId}`));
}

export async function setRecommendation(formData: FormData) {
  const user = await requireActiveUser();
  if (!canEditRecommendations(user.role)) {
    throw new Error("推奨する日本語案を設定できる権限がありません。");
  }

  const senseId = text(formData, "senseId");
  const proposalId = text(formData, "proposalId");
  const termSlug = text(formData, "termSlug");
  const level = z.enum(["tentative", "recommended", "limited", "discouraged"]).parse(text(formData, "level"));
  const context = text(formData, "context");
  const rationale = text(formData, "rationale");

  if (!senseId || !proposalId || !level || !context || !rationale) {
    throw new Error("推奨する日本語案の設定に必要な値が不足しています。");
  }
  await requireProposalTarget({ proposalId, senseId, termSlug });

  await prisma.$transaction(async (tx) => {
    const proposal = await tx.translationProposal.findUnique({
      where: { id: proposalId },
      select: {
        text: true,
        createdById: true,
        createdBy: { select: { deletedAt: true } },
        sense: { select: { term: { select: { headword: true, slug: true } } } },
      },
    });
    if (!proposal) throw new Error("日本語案が見つかりません。");
    const recommendation = await tx.recommendation.create({
      data: {
        senseId,
        proposalId,
        level,
        context,
        rationale,
        decidedById: user.id,
      },
    });

    await tx.translationProposal.update({
      where: { id: proposalId },
      data: {
        status: level,
      },
    });

    await tx.revision.create({
      data: {
        entityType: "recommendation",
        entityId: recommendation.id,
        afterJson: JSON.stringify({ level, context, rationale }),
        reason: "推奨する日本語案を設定",
        createdById: user.id,
      },
    });
    if (proposal.createdById !== user.id && !proposal.createdBy.deletedAt) {
      const levelLabel = RECOMMENDATION_LEVELS.find((item) => item.id === level)?.label ?? level;
      await createNotification(tx, {
        userId: proposal.createdById,
        type: "recommendation",
        title: "日本語案の推奨判断が確定しました",
        body: `「${proposal.sense.term.headword}」の日本語案「${proposal.text}」は「${levelLabel}」になりました。`,
        href: `/terms/${proposal.sense.term.slug}#proposal-${proposalId}`,
        eventKey: `recommendation:${recommendation.id}`,
      });
    }
  });

  revalidatePath("/", "layout");
  revalidatePath("/notifications");
  revalidatePath(`/terms/${termSlug}`);
  revalidatePath("/dashboard");
  redirect(termPath(termSlug, `#proposal-${proposalId}`));
}

export async function reportProposal(formData: FormData) {
  const user = await requireActiveUser();
  await enforceRateLimit(user.id, "report");
  const proposalId = text(formData, "proposalId");
  const termSlug = text(formData, "termSlug");
  const reason = text(formData, "reason") || "other";

  if (!proposalId) {
    throw new Error("通報対象が見つかりません。");
  }
  await requireProposalTarget({ proposalId, termSlug });

  await createReport({
    userId: user.id,
    targetType: "proposal",
    targetId: proposalId,
    reason,
    detail: optionalText(formData, "detail"),
  });

  revalidatePath("/dashboard");
  redirect(termPath(termSlug, `#proposal-${proposalId}`));
}

export async function reportTerm(formData: FormData) {
  const user = await requireActiveUser();
  await enforceRateLimit(user.id, "report");
  const termId = text(formData, "termId");
  const termSlug = text(formData, "termSlug");
  const reason = text(formData, "reason") || "other";

  if (!termId || !termSlug) {
    throw new Error("通報対象が見つかりません。");
  }
  await requireTermTarget(termId, termSlug);

  await createReport({
    userId: user.id,
    targetType: "term",
    targetId: termId,
    reason,
    detail: optionalText(formData, "detail"),
  });

  revalidatePath("/dashboard");
  redirect(termPath(termSlug));
}

export async function reportUsageExample(formData: FormData) {
  const user = await requireActiveUser();
  await enforceRateLimit(user.id, "report");
  const exampleId = text(formData, "exampleId");
  const proposalId = text(formData, "proposalId");
  const termSlug = text(formData, "termSlug");
  const reason = text(formData, "reason") || "other";

  if (!exampleId || !proposalId || !termSlug) {
    throw new Error("通報対象が見つかりません。");
  }
  await requireExampleTarget({ exampleId, proposalId, termSlug });

  await createReport({
    userId: user.id,
    targetType: "example",
    targetId: exampleId,
    reason,
    detail: optionalText(formData, "detail"),
  });

  revalidatePath("/dashboard");
  redirect(termPath(termSlug, `#proposal-${proposalId}-${exampleId}`));
}

export async function reportComment(formData: FormData) {
  const user = await requireActiveUser();
  await enforceRateLimit(user.id, "report");
  const commentId = text(formData, "commentId");
  const proposalId = text(formData, "proposalId");
  const termSlug = text(formData, "termSlug");
  const reason = text(formData, "reason") || "other";

  if (!commentId || !proposalId || !termSlug) {
    throw new Error("通報対象が見つかりません。");
  }
  await requireCommentTarget({ commentId, proposalId, termSlug });

  await createReport({
    userId: user.id,
    targetType: "comment",
    targetId: commentId,
    reason,
    detail: optionalText(formData, "detail"),
  });

  revalidatePath("/dashboard");
  redirect(termPath(termSlug, `#comment-${commentId}`));
}

const moderationTargetTypeSchema = z.enum(["term", "proposal", "example", "comment"]);
type ModerationTargetType = z.infer<typeof moderationTargetTypeSchema>;

type ModerationTargetSnapshot = {
  status: string;
  termSlug?: string;
};

async function moderationTargetSnapshot(
  targetType: ModerationTargetType,
  targetId: string,
): Promise<ModerationTargetSnapshot | null> {
  if (targetType === "term") {
    return prisma.term.findUnique({
      where: { id: targetId },
      select: { status: true, slug: true },
    }).then((target) => target ? { status: target.status, termSlug: target.slug } : null);
  }
  if (targetType === "proposal") {
    return prisma.translationProposal.findUnique({
      where: { id: targetId },
      select: {
        status: true,
        sense: { select: { term: { select: { slug: true } } } },
      },
    }).then((target) => target
      ? { status: target.status, termSlug: target.sense.term.slug }
      : null);
  }
  if (targetType === "example") {
    return prisma.usageExample.findUnique({
      where: { id: targetId },
      select: { status: true, term: { select: { slug: true } } },
    }).then((target) => target
      ? { status: target.status, termSlug: target.term.slug }
      : null);
  }
  const comment = await prisma.comment.findUnique({
    where: { id: targetId },
    select: {
      status: true,
      termId: true,
      proposal: {
        select: {
          sense: { select: { term: { select: { slug: true } } } },
        },
      },
    },
  });
  if (!comment) return null;
  if (comment.proposal) {
    return { status: comment.status, termSlug: comment.proposal.sense.term.slug };
  }
  const term = comment.termId
    ? await prisma.term.findUnique({ where: { id: comment.termId }, select: { slug: true } })
    : null;
  return { status: comment.status, termSlug: term?.slug };
}

async function updateModerationTargetStatus(
  tx: Prisma.TransactionClient,
  targetType: ModerationTargetType,
  targetId: string,
  status: string,
) {
  if (targetType === "term") {
    await tx.term.update({ where: { id: targetId }, data: { status } });
  } else if (targetType === "proposal") {
    await tx.translationProposal.update({ where: { id: targetId }, data: { status } });
  } else if (targetType === "example") {
    await tx.usageExample.update({ where: { id: targetId }, data: { status } });
  } else {
    await tx.comment.update({ where: { id: targetId }, data: { status } });
  }
}

function restoredStatus(targetType: ModerationTargetType, beforeJson: string | null) {
  const fallback = targetType === "term" ? "published" : "active";
  if (!beforeJson) return fallback;
  try {
    const status = (JSON.parse(beforeJson) as { status?: unknown }).status;
    if (typeof status !== "string" || status === "hidden") return fallback;
    if (targetType === "term") return status === "published" ? status : fallback;
    if (targetType === "proposal") {
      return ["draft", "active", "tentative", "recommended", "limited", "discouraged"].includes(status)
        ? status
        : fallback;
    }
    return status === "active" ? status : fallback;
  } catch {
    return fallback;
  }
}

async function setContentVisibility(formData: FormData, operation: "hide" | "restore") {
  const user = await requireActiveUser();
  if (!canModerate(user.role)) {
    throw new Error(operation === "hide" ? "非公開にする権限がありません。" : "復元する権限がありません。");
  }

  const targetType = moderationTargetTypeSchema.parse(text(formData, "targetType"));
  const targetId = z.string().min(1).max(100).parse(text(formData, "targetId"));
  const reason = z.string()
    .trim()
    .min(3, operation === "hide" ? "非公開理由は3文字以上で入力してください。" : "復元理由は3文字以上で入力してください。")
    .max(500)
    .parse(text(formData, "reason"));
  const returnTo = safePath(text(formData, "returnTo"), "/dashboard");
  const before = await moderationTargetSnapshot(targetType, targetId);
  if (!before) throw new Error("対象の投稿が見つかりません。");
  if (operation === "hide" && before.status === "hidden") {
    throw new Error("この投稿はすでに非公開です。");
  }
  if (operation === "restore" && before.status !== "hidden") {
    throw new Error("この投稿はすでに公開されています。");
  }

  const hiddenRevision = operation === "restore"
    ? await prisma.revision.findFirst({
        where: {
          entityType: targetType,
          entityId: targetId,
          afterJson: { contains: "\"status\":\"hidden\"" },
        },
        orderBy: { createdAt: "desc" },
        select: { beforeJson: true },
      })
    : null;
  const nextStatus = operation === "hide"
    ? "hidden"
    : restoredStatus(targetType, hiddenRevision?.beforeJson ?? null);

  await prisma.$transaction(async (tx) => {
    await updateModerationTargetStatus(tx, targetType, targetId, nextStatus);
    await tx.revision.create({
      data: {
        entityType: targetType,
        entityId: targetId,
        beforeJson: JSON.stringify({ status: before.status }),
        afterJson: JSON.stringify({ status: nextStatus }),
        reason: `${operation === "hide" ? "非公開" : "復元"}: ${reason}`,
        createdById: user.id,
      },
    });
  });

  revalidatePath("/", "layout");
  revalidatePath("/search");
  if (before.termSlug) revalidatePath(termPath(before.termSlug));
  redirect(returnTo);
}

export async function hideContent(formData: FormData) {
  await setContentVisibility(formData, "hide");
}

export async function restoreContent(formData: FormData) {
  await setContentVisibility(formData, "restore");
}

export async function hideProposal(formData: FormData) {
  formData.set("targetType", "proposal");
  formData.set("targetId", text(formData, "proposalId"));
  if (!text(formData, "reason")) formData.set("reason", "モデレーション判断");
  await setContentVisibility(formData, "hide");
}

export async function resolveReport(formData: FormData) {
  const user = await requireActiveUser();
  if (!canModerate(user.role)) {
    throw new Error("通報を処理する権限がありません。");
  }

  const reportId = text(formData, "reportId");
  const status = z.enum(["resolved", "dismissed"]).parse(text(formData, "status") || "resolved");
  await prisma.$transaction(async (tx) => {
    const report = await tx.report.findUnique({
      where: { id: reportId },
      include: { createdBy: { select: { deletedAt: true } } },
    });
    if (!report || report.status !== "open") {
      throw new Error("未処理の通報が見つかりません。");
    }
    const href = await reportTargetHref(tx, report.targetType, report.targetId);
    await tx.report.update({
      where: { id: reportId },
      data: { status },
    });
    if (!report.createdBy.deletedAt) {
      await createNotification(tx, {
        userId: report.createdById,
        type: "report",
        title: "通報の処理結果が届きました",
        body: status === "resolved"
          ? "通報を確認し、対応済みにしました。"
          : "通報を確認し、今回は対応を見送りました。",
        href,
        eventKey: `report:${report.id}:${status}`,
      });
    }
  });
  revalidatePath("/", "layout");
  revalidatePath("/notifications");
  revalidatePath("/dashboard");
  redirect(`/dashboard?reportResult=${status}`);
}

export async function mergeTerms(formData: FormData) {
  const user = await requireActiveUser();
  if (!canMergeTerms(user.role)) {
    throw new Error("項目を統合する権限がありません。");
  }
  const sourceTermId = z.string().min(1).max(100).parse(text(formData, "sourceTermId"));
  const targetTermId = z.string().min(1).max(100).parse(text(formData, "targetTermId"));
  const reason = z
    .string()
    .trim()
    .min(5, "統合理由は5文字以上で入力してください。")
    .max(1000, "統合理由は1000文字以内で入力してください。")
    .parse(text(formData, "reason"));
  const confirmation = z.string().max(300).parse(text(formData, "confirmation"));
  if (sourceTermId === targetTermId) {
    throw new Error("統合元と統合先には別の項目を選んでください。");
  }

  const merged = await prisma.$transaction(async (tx) => {
    const [source, target] = await Promise.all([
      tx.term.findUnique({
        where: { id: sourceTermId },
        include: {
          _count: { select: { senses: true, examples: true } },
          senses: {
            select: {
              _count: { select: { proposals: true } },
            },
          },
        },
      }),
      tx.term.findUnique({
        where: { id: targetTermId },
        include: {
          _count: { select: { senses: true, examples: true } },
        },
      }),
    ]);
    if (!source || !target) {
      throw new Error("統合元または統合先の項目が見つかりません。画面を再読み込みしてください。");
    }
    if (source.status !== "published" || target.status !== "published") {
      throw new Error("非公開中の項目は統合できません。先に内容を確認して復元してください。");
    }
    const expectedConfirmation = termMergeConfirmation(source.headword, target.headword);
    if (confirmation !== expectedConfirmation) {
      throw new Error(`確認欄に「${expectedConfirmation}」と入力してください。`);
    }

    await tx.sense.updateMany({
      where: { termId: source.id },
      data: {
        termId: target.id,
        order: { increment: target._count.senses },
      },
    });
    await tx.usageExample.updateMany({
      where: { termId: source.id },
      data: { termId: target.id },
    });
    await tx.comment.updateMany({
      where: { termId: source.id },
      data: { termId: target.id },
    });
    await tx.revision.updateMany({
      where: {
        entityType: "term",
        entityId: source.id,
      },
      data: { entityId: target.id },
    });
    await tx.report.updateMany({
      where: {
        targetType: "term",
        targetId: source.id,
      },
      data: { targetId: target.id },
    });
    await tx.editSuggestion.updateMany({
      where: {
        targetType: "term",
        targetId: source.id,
      },
      data: { targetId: target.id },
    });
    await tx.termRedirect.updateMany({
      where: { targetTermId: source.id },
      data: { targetTermId: target.id },
    });
    await tx.termRedirect.upsert({
      where: { sourceSlug: source.slug },
      update: {
        sourceHeadword: source.headword,
        targetTermId: target.id,
        reason,
        mergedById: user.id,
        createdAt: new Date(),
      },
      create: {
        sourceSlug: source.slug,
        sourceHeadword: source.headword,
        targetTermId: target.id,
        reason,
        mergedById: user.id,
      },
    });
    await tx.revision.create({
      data: {
        entityType: "term",
        entityId: target.id,
        beforeJson: JSON.stringify({
          headword: target.headword,
          senseCount: target._count.senses,
          exampleCount: target._count.examples,
        }),
        afterJson: JSON.stringify({
          headword: target.headword,
          mergedSource: source.headword,
          senseCount: target._count.senses + source._count.senses,
          proposalCount: source.senses.reduce((sum, sense) => sum + sense._count.proposals, 0),
          exampleCount: target._count.examples + source._count.examples,
        }),
        reason: `重複項目を統合: ${reason}`,
        createdById: user.id,
      },
    });
    await tx.term.delete({ where: { id: source.id } });
    return {
      sourceSlug: source.slug,
      targetSlug: target.slug,
    };
  });

  revalidatePath("/");
  revalidatePath("/search");
  revalidatePath("/dashboard");
  revalidatePath(`/terms/${merged.sourceSlug}`);
  revalidatePath(`/terms/${merged.targetSlug}`);
  revalidatePath("/sitemap.xml");
  redirect(`${termPath(merged.targetSlug)}?merged=1`);
}

export async function suspendUser(formData: FormData) {
  const user = await requireActiveUser();
  if (!canAdmin(user.role)) {
    throw new Error("ユーザーを停止する権限がありません。");
  }

  const userId = text(formData, "userId");
  const returnTo = safePath(text(formData, "returnTo"), "/dashboard");
  if (userId === user.id) {
    throw new Error("自分自身は停止できません。");
  }
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.deletedAt) {
    throw new Error("対象のユーザーが見つかりません。");
  }
  await prisma.user.update({
    where: { id: userId },
    data: { suspendedAt: new Date() },
  });
  revalidatePath("/dashboard");
  revalidatePath("/admin");
  redirect(returnTo);
}

export async function unsuspendUser(formData: FormData) {
  const user = await requireActiveUser();
  if (!canAdmin(user.role)) {
    throw new Error("ユーザー停止を解除する権限がありません。");
  }

  const userId = text(formData, "userId");
  const returnTo = safePath(text(formData, "returnTo"), "/admin");
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.deletedAt) {
    throw new Error("削除済みのアカウントは停止解除できません。");
  }
  await prisma.user.update({
    where: { id: userId },
    data: { suspendedAt: null },
  });
  revalidatePath("/admin");
  redirect(returnTo);
}

export async function updateUserRole(formData: FormData) {
  const user = await requireActiveUser();
  if (!canAdmin(user.role)) {
    throw new Error("ロールを変更する権限がありません。");
  }

  const userId = text(formData, "userId");
  const role = roleSchema.parse(text(formData, "role"));
  const returnTo = safePath(text(formData, "returnTo"), "/admin");
  if (userId === user.id) {
    throw new Error("自分自身のロールは変更できません。");
  }
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.deletedAt) {
    throw new Error("対象のユーザーが見つかりません。");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { role },
  });
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  redirect(returnTo);
}

const senseEditSchema = z.object({
  title: z.string().trim().min(1, "使われ方を短く表す名前を入力してください。").max(120),
  description: z.string().trim().min(8, "使われ方の説明は8文字以上で入力してください。").max(2000),
  usageNote: z.string().trim().max(1000).nullable(),
  domainId: z.string().trim().max(100).nullable(),
  tags: tagListSchema.optional(),
});

const proposalEditSchema = z.object({
  text: z.string().trim().min(1, "日本語案を入力してください。").max(120),
  fitContext: z.string().trim().min(1, "よく合う場面を入力してください。").max(1000),
  unfitContext: z.string().trim().max(1000).nullable(),
  rationale: z.string().trim().max(2000).nullable(),
  pros: z.string().trim().max(1000).nullable(),
  cons: z.string().trim().max(1000).nullable(),
  register: z.enum(["casual", "neutral", "formal", "technical", "official"]),
});

const exampleEditSchema = z.object({
  originalSentence: z.string().trim().min(3, "元文は3文字以上で入力してください。").max(3000),
  rewrittenSentence: z.string().trim().min(3, "言い換えは3文字以上で入力してください。").max(3000),
  contextNote: z.string().trim().max(1000).nullable(),
});

type EditableTargetType = "sense" | "proposal" | "example";
type EditablePayload = Record<string, unknown>;

function nullableFormText(formData: FormData, name: string) {
  return optionalText(formData, name) ?? null;
}

function editPayloadFromForm(targetType: EditableTargetType, formData: FormData) {
  if (targetType === "sense") {
    return senseEditSchema.parse({
      title: text(formData, "title"),
      description: text(formData, "description"),
      usageNote: nullableFormText(formData, "usageNote"),
      domainId: nullableFormText(formData, "domainId"),
      tags: tagNamesFromForm(formData),
    });
  }
  if (targetType === "proposal") {
    return proposalEditSchema.parse({
      text: text(formData, "proposalText"),
      fitContext: text(formData, "fitContext"),
      unfitContext: nullableFormText(formData, "unfitContext"),
      rationale: nullableFormText(formData, "rationale"),
      pros: nullableFormText(formData, "pros"),
      cons: nullableFormText(formData, "cons"),
      register: text(formData, "register") || "neutral",
    });
  }
  return exampleEditSchema.parse({
    originalSentence: text(formData, "originalSentence"),
    rewrittenSentence: text(formData, "rewrittenSentence"),
    contextNote: nullableFormText(formData, "contextNote"),
  });
}

function parseStoredEditPayload(targetType: EditableTargetType, value: string) {
  let payload: unknown;
  try {
    payload = JSON.parse(value);
  } catch {
    throw new Error("修正提案の内容を読み取れませんでした。");
  }
  if (targetType === "sense") return senseEditSchema.parse(payload);
  if (targetType === "proposal") return proposalEditSchema.parse(payload);
  return exampleEditSchema.parse(payload);
}

function cleanObject<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, fieldValue]) => fieldValue !== undefined));
}

async function applyEditableChange(
  tx: Prisma.TransactionClient,
  targetType: EditableTargetType,
  targetId: string,
  rawPayload: EditablePayload,
  createdById: string,
  reason: string,
  partial = false,
) {
  if (targetType === "sense") {
    const before = await tx.sense.findUnique({
      where: { id: targetId },
      include: { tags: { include: { tag: true } } },
    });
    if (!before) throw new Error("修正対象の意味が見つかりません。");
    const parsed = partial ? senseEditSchema.partial().parse(rawPayload) : senseEditSchema.parse(rawPayload);
    const { tags, ...senseFields } = parsed;
    const payload = cleanObject(senseFields);
    await tx.sense.update({ where: { id: targetId }, data: payload });
    if (tags !== undefined) {
      await replaceSenseTags(tx, targetId, tags);
    }
    const after = await tx.sense.findUniqueOrThrow({
      where: { id: targetId },
      include: { tags: { include: { tag: true } } },
    });
    await tx.revision.create({
      data: {
        entityType: targetType,
        entityId: targetId,
        beforeJson: JSON.stringify({
          title: before.title,
          description: before.description,
          usageNote: before.usageNote,
          domainId: before.domainId,
          tags: before.tags.map(({ tag }) => tag.name),
        }),
        afterJson: JSON.stringify({
          title: after.title,
          description: after.description,
          usageNote: after.usageNote,
          domainId: after.domainId,
          tags: after.tags.map(({ tag }) => tag.name),
        }),
        reason,
        createdById,
      },
    });
    return;
  }

  if (targetType === "proposal") {
    const before = await tx.translationProposal.findUnique({ where: { id: targetId } });
    if (!before) throw new Error("修正対象の日本語案が見つかりません。");
    const parsed = partial ? proposalEditSchema.partial().parse(rawPayload) : proposalEditSchema.parse(rawPayload);
    const status = partial && typeof rawPayload.status === "string"
      ? z.enum(["draft", "active", "tentative", "recommended", "limited", "discouraged", "hidden"]).parse(rawPayload.status)
      : undefined;
    const payload = cleanObject({ ...parsed, status });
    const after = await tx.translationProposal.update({ where: { id: targetId }, data: payload });
    await tx.revision.create({
      data: {
        entityType: targetType,
        entityId: targetId,
        beforeJson: JSON.stringify({
          text: before.text,
          fitContext: before.fitContext,
          unfitContext: before.unfitContext,
          rationale: before.rationale,
          pros: before.pros,
          cons: before.cons,
          register: before.register,
          status: before.status,
        }),
        afterJson: JSON.stringify({
          text: after.text,
          fitContext: after.fitContext,
          unfitContext: after.unfitContext,
          rationale: after.rationale,
          pros: after.pros,
          cons: after.cons,
          register: after.register,
          status: after.status,
        }),
        reason,
        createdById,
      },
    });
    return;
  }

  const before = await tx.usageExample.findUnique({ where: { id: targetId } });
  if (!before) throw new Error("修正対象の使用例が見つかりません。");
  const payload = cleanObject(
    partial ? exampleEditSchema.partial().parse(rawPayload) : exampleEditSchema.parse(rawPayload),
  );
  const after = await tx.usageExample.update({ where: { id: targetId }, data: payload });
  await tx.revision.create({
    data: {
      entityType: targetType,
      entityId: targetId,
      beforeJson: JSON.stringify({
        originalSentence: before.originalSentence,
        rewrittenSentence: before.rewrittenSentence,
        contextNote: before.contextNote,
      }),
      afterJson: JSON.stringify({
        originalSentence: after.originalSentence,
        rewrittenSentence: after.rewrittenSentence,
        contextNote: after.contextNote,
      }),
      reason,
      createdById,
    },
  });
}

export async function submitEditSuggestion(formData: FormData) {
  const user = await requireActiveUser();
  await enforceRateLimit(user.id, "post");
  const targetType = z.enum(["sense", "proposal", "example"]).parse(text(formData, "targetType"));
  const targetId = text(formData, "targetId");
  const reason = text(formData, "reason");
  const returnTo = safePath(text(formData, "returnTo"), "/");
  if (!targetId) throw new Error("修正対象が見つかりません。");
  if (reason.length < 5) throw new Error("修正理由を5文字以上で入力してください。");
  await requireEditableTarget(targetType, targetId);
  const payload = editPayloadFromForm(targetType, formData);
  const applyNow = text(formData, "applyNow") === "1" && canEditContent(user.role);

  if (applyNow) {
    await prisma.$transaction((tx) =>
      applyEditableChange(tx, targetType, targetId, payload, user.id, `編集者による直接編集: ${reason}`),
    );
  } else {
    await prisma.editSuggestion.create({
      data: {
        targetType,
        targetId,
        proposedJson: JSON.stringify(payload),
        reason,
        createdById: user.id,
      },
    });
  }

  revalidatePath(returnTo.split(/[?#]/)[0] || "/");
  revalidatePath("/dashboard");
  redirect(returnTo);
}

export async function reviewEditSuggestion(formData: FormData) {
  const user = await requireActiveUser();
  if (!canReviewEditSuggestions(user.role)) {
    throw new Error("修正提案を処理できる権限がありません。");
  }
  const suggestionId = text(formData, "suggestionId");
  const decision = z.enum(["approved", "rejected"]).parse(text(formData, "decision"));
  const reviewNote = text(formData, "reviewNote");
  const returnTo = safePath(text(formData, "returnTo"), "/dashboard");
  if (decision === "rejected" && reviewNote.length < 3) {
    throw new Error("却下理由を3文字以上で入力してください。");
  }

  await prisma.$transaction(async (tx) => {
    const suggestion = await tx.editSuggestion.findUnique({ where: { id: suggestionId } });
    if (!suggestion || suggestion.status !== "pending") {
      throw new Error("未処理の修正提案が見つかりません。");
    }
    const targetType = z.enum(["sense", "proposal", "example"]).parse(suggestion.targetType);
    if (decision === "approved") {
      const payload = parseStoredEditPayload(targetType, suggestion.proposedJson);
      await applyEditableChange(
        tx,
        targetType,
        suggestion.targetId,
        payload,
        user.id,
        `修正提案を承認: ${suggestion.reason}${reviewNote ? `（${reviewNote}）` : ""}`,
      );
    }
    await tx.editSuggestion.update({
      where: { id: suggestion.id },
      data: {
        status: decision,
        reviewedById: user.id,
        reviewNote: reviewNote || null,
        reviewedAt: new Date(),
      },
    });
  });

  revalidatePath("/dashboard");
  revalidatePath(returnTo.split(/[?#]/)[0] || "/");
  redirect(returnTo);
}

export async function revertRevision(formData: FormData) {
  const user = await requireActiveUser();
  if (!canRevertRevisions(user.role)) {
    throw new Error("変更を差し戻す権限がありません。");
  }
  const revisionId = text(formData, "revisionId");
  const reason = text(formData, "reason");
  const returnTo = safePath(text(formData, "returnTo"), "/dashboard");
  if (reason.length < 5) throw new Error("差し戻し理由を5文字以上で入力してください。");

  await prisma.$transaction(async (tx) => {
    const revision = await tx.revision.findUnique({ where: { id: revisionId } });
    if (!revision?.beforeJson) throw new Error("この変更には差し戻せる変更前データがありません。");
    const targetType = z.enum(["sense", "proposal", "example"]).safeParse(revision.entityType);
    if (!targetType.success) throw new Error("この種類の変更は画面から差し戻せません。");
    let before: unknown;
    try {
      before = JSON.parse(revision.beforeJson);
    } catch {
      throw new Error("変更前データを読み取れませんでした。");
    }
    if (!before || typeof before !== "object" || Array.isArray(before)) {
      throw new Error("変更前データの形式が正しくありません。");
    }
    await applyEditableChange(
      tx,
      targetType.data,
      revision.entityId,
      before as EditablePayload,
      user.id,
      `変更を差し戻し: ${reason}`,
      true,
    );
  });

  revalidatePath(returnTo.split(/[?#]/)[0] || "/");
  revalidatePath("/dashboard");
  redirect(returnTo);
}

export async function updateProfile(formData: FormData) {
  const user = await requireActiveUser({ allowUnverifiedEmail: true });
  const displayName = z.string().trim().min(1, "表示名を入力してください。").max(80).parse(text(formData, "displayName"));
  const handle = z
    .string()
    .trim()
    .min(2, "ハンドルは2文字以上で入力してください。")
    .max(30)
    .regex(/^[\p{Letter}\p{Number}_-]+$/u, "ハンドルには文字、数字、_、-だけを使用できます。")
    .parse(text(formData, "handle"));
  const duplicate = await prisma.user.findFirst({ where: { handle, id: { not: user.id } } });
  if (duplicate) throw new Error("このハンドルはすでに使われています。");

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { displayName, handle } });
    await tx.revision.create({
      data: {
        entityType: "user",
        entityId: user.id,
        beforeJson: JSON.stringify({ displayName: user.displayName, handle: user.handle }),
        afterJson: JSON.stringify({ displayName, handle }),
        reason: "プロフィールを変更",
        createdById: user.id,
      },
    });
  });
  revalidatePath("/account");
  redirect("/account?updated=1");
}

export async function requestAccountDeletion(formData: FormData) {
  const user = await requireActiveUser({
    allowPasswordChange: true,
    allowUnverifiedEmail: true,
  });
  const parsed = accountDeletionRequestSchema.parse({
    currentPassword: text(formData, "currentPassword"),
    confirmation: text(formData, "confirmation"),
    reason: optionalText(formData, "reason"),
  });
  if (!verifyPassword(parsed.currentPassword, user.passwordHash)) {
    throw new Error("現在のパスワードが正しくありません。");
  }
  if (user.role === "admin") {
    const activeAdminCount = await prisma.user.count({
      where: {
        role: "admin",
        suspendedAt: null,
        deletedAt: null,
      },
    });
    if (activeAdminCount <= 1) {
      throw new Error("最後の管理者は削除を申請できません。先に別の管理者を任命してください。");
    }
  }

  const requestedAt = new Date();
  await prisma.accountDeletionRequest.upsert({
    where: { userId: user.id },
    update: {
      reason: parsed.reason,
      status: "pending",
      requestedAt,
      cancelledAt: null,
      processedAt: null,
      processedById: null,
    },
    create: {
      userId: user.id,
      reason: parsed.reason,
      requestedAt,
    },
  });
  revalidatePath("/account");
  revalidatePath("/admin");
  redirect("/account?deletionRequested=1");
}

export async function cancelAccountDeletion() {
  const user = await requireActiveUser({
    allowPasswordChange: true,
    allowUnverifiedEmail: true,
  });
  const result = await prisma.accountDeletionRequest.updateMany({
    where: {
      userId: user.id,
      status: "pending",
    },
    data: {
      status: "cancelled",
      cancelledAt: new Date(),
    },
  });
  if (result.count !== 1) {
    throw new Error("取り消せる削除申請がありません。");
  }
  revalidatePath("/account");
  revalidatePath("/admin");
  redirect("/account?deletionCancelled=1");
}

export async function processAccountDeletion(formData: FormData) {
  const admin = await requireActiveUser();
  if (!canProcessAccountDeletions(admin.role)) {
    throw new Error("アカウント削除を処理する権限がありません。");
  }
  const requestId = text(formData, "requestId");
  const confirmation = text(formData, "confirmation");
  const returnTo = safePath(text(formData, "returnTo"), "/admin");
  if (confirmation !== "削除処理") {
    throw new Error("確認欄に「削除処理」と入力してください。");
  }

  const deletionRequest = await prisma.accountDeletionRequest.findUnique({
    where: { id: requestId },
    include: { user: true },
  });
  if (!deletionRequest || deletionRequest.status !== "pending") {
    throw new Error("未処理の削除申請が見つかりません。");
  }
  if (deletionRequest.userId === admin.id) {
    throw new Error("自分自身の削除申請は処理できません。");
  }
  if (deletionRequest.user.deletedAt) {
    throw new Error("このアカウントはすでに削除処理済みです。");
  }
  if (deletionRequest.user.role === "admin") {
    const activeAdminCount = await prisma.user.count({
      where: {
        role: "admin",
        suspendedAt: null,
        deletedAt: null,
      },
    });
    if (activeAdminCount <= 1) {
      throw new Error("最後の管理者アカウントは削除できません。");
    }
  }

  const processedAt = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.emailVerificationToken.deleteMany({
      where: { userId: deletionRequest.userId },
    });
    await tx.passwordResetToken.deleteMany({
      where: { userId: deletionRequest.userId },
    });
    await tx.notification.deleteMany({
      where: { userId: deletionRequest.userId },
    });
    await tx.revision.updateMany({
      where: {
        entityType: "user",
        entityId: deletionRequest.userId,
      },
      data: {
        beforeJson: null,
        afterJson: JSON.stringify({ accountStatus: "deleted" }),
        reason: "退会に伴いアカウント情報を消去",
      },
    });
    await tx.user.update({
      where: { id: deletionRequest.userId },
      data: {
        displayName: "退会済み利用者",
        handle: deletedAccountHandle(deletionRequest.userId),
        email: null,
        emailVerifiedAt: null,
        passwordHash: null,
        mustChangePassword: false,
        termsAcceptedAt: null,
        termsVersion: null,
        contributionPolicy: null,
        role: "user",
        reputation: 0,
        suspendedAt: processedAt,
        deletedAt: processedAt,
        sessionVersion: { increment: 1 },
      },
    });
    const completedRequest = await tx.accountDeletionRequest.updateMany({
      where: {
        id: deletionRequest.id,
        status: "pending",
      },
      data: {
        reason: null,
        status: "completed",
        processedAt,
        processedById: admin.id,
      },
    });
    if (completedRequest.count !== 1) {
      throw new Error("削除申請はすでに取り消されたか、処理済みです。");
    }
    await tx.revision.create({
      data: {
        entityType: "user",
        entityId: deletionRequest.userId,
        beforeJson: null,
        afterJson: JSON.stringify({ accountStatus: "deleted" }),
        reason: "本人申請に基づきアカウント情報を消去",
        createdById: admin.id,
      },
    });
  });

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}deletionProcessed=1`);
}

export async function openNotification(formData: FormData) {
  const user = await requireActiveUser({
    allowPasswordChange: true,
    allowUnverifiedEmail: true,
  });
  const notificationId = text(formData, "notificationId");
  const notification = await prisma.notification.findFirst({
    where: {
      id: notificationId,
      userId: user.id,
    },
  });
  if (!notification) {
    throw new Error("通知が見つかりません。");
  }
  if (!notification.readAt) {
    await prisma.notification.update({
      where: { id: notification.id },
      data: { readAt: new Date() },
    });
  }
  revalidatePath("/", "layout");
  revalidatePath("/notifications");
  redirect(safePath(notification.href, "/notifications"));
}

export async function markAllNotificationsRead() {
  const user = await requireActiveUser({
    allowPasswordChange: true,
    allowUnverifiedEmail: true,
  });
  await prisma.notification.updateMany({
    where: {
      userId: user.id,
      readAt: null,
    },
    data: { readAt: new Date() },
  });
  revalidatePath("/", "layout");
  revalidatePath("/notifications");
  redirect("/notifications?read=all");
}

export async function changePassword(formData: FormData) {
  const user = await requireActiveUser({
    allowPasswordChange: true,
    allowUnverifiedEmail: true,
  });
  const currentPassword = text(formData, "currentPassword");
  const newPassword = text(formData, "newPassword");
  const confirmation = text(formData, "confirmation");
  if (currentPassword.length > 256 || newPassword.length > 256 || confirmation.length > 256) {
    throw new Error("パスワードは256文字以内にしてください。");
  }
  if (!verifyPassword(currentPassword, user.passwordHash)) {
    throw new Error("現在のパスワードが正しくありません。");
  }
  if (newPassword.length < 12) throw new Error("新しいパスワードは12文字以上にしてください。");
  if (newPassword !== confirmation) throw new Error("新しいパスワードが確認入力と一致しません。");
  if (verifyPassword(newPassword, user.passwordHash)) throw new Error("現在とは異なるパスワードを指定してください。");

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: hashPassword(newPassword),
      mustChangePassword: false,
      sessionVersion: { increment: 1 },
    },
  });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, createSessionToken(updatedUser.id, updatedUser.sessionVersion), {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  revalidatePath("/account");
  redirect("/account?passwordChanged=1");
}

export async function resetUserPassword(formData: FormData) {
  const user = await requireActiveUser();
  if (!canIssueTemporaryPasswords(user.role)) {
    throw new Error("パスワードを再設定する権限がありません。");
  }
  const userId = text(formData, "userId");
  const temporaryPassword = text(formData, "temporaryPassword");
  const returnTo = safePath(text(formData, "returnTo"), "/admin");
  if (userId === user.id) throw new Error("自分のパスワードはアカウント画面から変更してください。");
  if (temporaryPassword.length < 12) throw new Error("一時パスワードは12文字以上にしてください。");
  if (temporaryPassword.length > 256) throw new Error("一時パスワードは256文字以内にしてください。");
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.deletedAt) throw new Error("ユーザーが見つかりません。");

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        passwordHash: hashPassword(temporaryPassword),
        mustChangePassword: true,
        sessionVersion: { increment: 1 },
      },
    });
    await tx.revision.create({
      data: {
        entityType: "user",
        entityId: userId,
        beforeJson: JSON.stringify({ passwordResetRequired: target.mustChangePassword }),
        afterJson: JSON.stringify({ passwordResetRequired: true }),
        reason: "管理者が一時パスワードを発行",
        createdById: user.id,
      },
    });
  });
  revalidatePath("/admin");
  redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}reset=1`);
}

export async function signUpWithState(_previousState: ActionState, formData: FormData) {
  return runStatefulAction(signUp, formData);
}

export async function signInWithState(_previousState: ActionState, formData: FormData) {
  return runStatefulAction(signIn, formData);
}

export async function requestEmailVerificationWithState(_previousState: ActionState, formData: FormData) {
  return runStatefulAction(requestEmailVerification, formData);
}

export async function confirmEmailVerificationWithState(_previousState: ActionState, formData: FormData) {
  return runStatefulAction(confirmEmailVerification, formData);
}

export async function requestPasswordResetWithState(_previousState: ActionState, formData: FormData) {
  return runStatefulAction(
    requestPasswordReset,
    formData,
    "登録されているメールアドレスの場合、再設定用のメールを送信しました。",
  );
}

export async function completePasswordResetWithState(_previousState: ActionState, formData: FormData) {
  return runStatefulAction(completePasswordReset, formData);
}

export async function createTermWithState(_previousState: ActionState, formData: FormData) {
  return runStatefulAction(createTerm, formData);
}

export async function addSenseWithState(_previousState: ActionState, formData: FormData) {
  return runStatefulAction(addSense, formData);
}

export async function addProposalWithState(_previousState: ActionState, formData: FormData) {
  return runStatefulAction(addProposal, formData);
}

export async function addUsageExampleWithState(_previousState: ActionState, formData: FormData) {
  return runStatefulAction(addUsageExample, formData);
}

export async function evaluateProposalWithState(_previousState: ActionState, formData: FormData) {
  return runStatefulAction(evaluateProposal, formData);
}

export async function addCommentWithState(_previousState: ActionState, formData: FormData) {
  return runStatefulAction(addComment, formData);
}

export async function setRecommendationWithState(_previousState: ActionState, formData: FormData) {
  return runStatefulAction(setRecommendation, formData);
}

export async function reportProposalWithState(_previousState: ActionState, formData: FormData) {
  return runStatefulAction(reportProposal, formData);
}

export async function reportTermWithState(_previousState: ActionState, formData: FormData) {
  return runStatefulAction(reportTerm, formData);
}

export async function reportUsageExampleWithState(_previousState: ActionState, formData: FormData) {
  return runStatefulAction(reportUsageExample, formData);
}

export async function reportCommentWithState(_previousState: ActionState, formData: FormData) {
  return runStatefulAction(reportComment, formData);
}

export async function hideProposalWithState(_previousState: ActionState, formData: FormData) {
  return runStatefulAction(hideProposal, formData);
}

export async function hideContentWithState(_previousState: ActionState, formData: FormData) {
  return runStatefulAction(hideContent, formData);
}

export async function restoreContentWithState(_previousState: ActionState, formData: FormData) {
  return runStatefulAction(restoreContent, formData);
}

export async function resolveReportWithState(_previousState: ActionState, formData: FormData) {
  return runStatefulAction(resolveReport, formData);
}

export async function mergeTermsWithState(_previousState: ActionState, formData: FormData) {
  return runStatefulAction(mergeTerms, formData);
}

export async function suspendUserWithState(_previousState: ActionState, formData: FormData) {
  return runStatefulAction(suspendUser, formData);
}

export async function unsuspendUserWithState(_previousState: ActionState, formData: FormData) {
  return runStatefulAction(unsuspendUser, formData);
}

export async function updateUserRoleWithState(_previousState: ActionState, formData: FormData) {
  return runStatefulAction(updateUserRole, formData);
}

export async function submitEditSuggestionWithState(_previousState: ActionState, formData: FormData) {
  return runStatefulAction(submitEditSuggestion, formData);
}

export async function reviewEditSuggestionWithState(_previousState: ActionState, formData: FormData) {
  return runStatefulAction(reviewEditSuggestion, formData);
}

export async function revertRevisionWithState(_previousState: ActionState, formData: FormData) {
  return runStatefulAction(revertRevision, formData);
}

export async function updateProfileWithState(_previousState: ActionState, formData: FormData) {
  return runStatefulAction(updateProfile, formData);
}

export async function changePasswordWithState(_previousState: ActionState, formData: FormData) {
  return runStatefulAction(changePassword, formData);
}

export async function requestAccountDeletionWithState(_previousState: ActionState, formData: FormData) {
  return runStatefulAction(requestAccountDeletion, formData);
}

export async function cancelAccountDeletionWithState(_previousState: ActionState, formData: FormData) {
  return runStatefulAction(cancelAccountDeletion, formData);
}

export async function processAccountDeletionWithState(_previousState: ActionState, formData: FormData) {
  return runStatefulAction(processAccountDeletion, formData);
}

export async function resetUserPasswordWithState(_previousState: ActionState, formData: FormData) {
  return runStatefulAction(resetUserPassword, formData);
}
