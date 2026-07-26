"use server";

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
import { joinLabels, normalizeForSearch, slugifyHeadword } from "@/lib/normalize";
import { CONTRIBUTION_POLICY, TERMS_VERSION } from "@/lib/public-config";
import { getRateLimitPolicy, type RateLimitKind } from "@/lib/rate-limit";
import { canAdmin, canEditRecommendations, canModerate, requireActiveUser } from "@/lib/session";
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

async function runStatefulAction(action: (formData: FormData) => Promise<void>, formData: FormData): Promise<ActionState> {
  try {
    await action(formData);
    return { status: "success", message: "保存しました。" };
  } catch (error) {
    if (isRedirectSignal(error)) throw error;
    const values: Record<string, string[]> = {};
    for (const [key, value] of formData.entries()) {
      if (typeof value !== "string" || /password|confirmation/i.test(key)) continue;
      values[key] = [...(values[key] ?? []), value];
    }
    return { status: "error", message: actionErrorMessage(error), values };
  }
}

async function uniqueSlug(headword: string) {
  const base = slugifyHeadword(headword) || `term-${Date.now()}`;
  let slug = base;
  let index = 2;

  while (await prisma.term.findUnique({ where: { slug } })) {
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
  const term = await prisma.term.findUnique({ where: { id: termId }, select: { slug: true } });
  if (!term || term.slug !== termSlug) throw new Error(invalidTargetMessage);
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
    select: { termId: true, term: { select: { slug: true } } },
  });
  if (!sense || sense.termId !== termId || sense.term.slug !== termSlug) {
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
      sense: { select: { termId: true, term: { select: { slug: true } } } },
    },
  });
  if (
    !proposal
    || (senseId !== undefined && proposal.senseId !== senseId)
    || (termId !== undefined && proposal.sense.termId !== termId)
    || proposal.sense.term.slug !== termSlug
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
    select: { proposalId: true, term: { select: { slug: true } } },
  });
  if (!example || example.proposalId !== proposalId || example.term.slug !== termSlug) {
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
      proposal: { select: { sense: { select: { term: { select: { slug: true } } } } } },
    },
  });
  if (!comment || comment.proposalId !== proposalId || comment.proposal?.sense.term.slug !== termSlug) {
    throw new Error(invalidTargetMessage);
  }
}

async function requireEditableTarget(targetType: "sense" | "proposal" | "example", targetId: string) {
  const exists = targetType === "sense"
    ? await prisma.sense.findUnique({ where: { id: targetId }, select: { id: true } })
    : targetType === "proposal"
      ? await prisma.translationProposal.findUnique({ where: { id: targetId }, select: { id: true } })
      : await prisma.usageExample.findUnique({ where: { id: targetId }, select: { id: true } });
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
  proposalText: z.string().trim().min(1, "日本語案を入力してください。").max(120),
});

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

const roleSchema = z.enum(["user", "trusted", "editor", "admin"]);

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

export async function signUp(formData: FormData) {
  const email = text(formData, "email").toLowerCase();
  const password = text(formData, "password");
  const displayName = text(formData, "displayName");
  const handleInput = text(formData, "handle") || displayName || email.split("@")[0];
  const returnTo = safePath(text(formData, "returnTo"), "/");
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

  const user = await prisma.user.create({
    data: {
      email: parsed.email,
      passwordHash: hashPassword(parsed.password),
      displayName: parsed.displayName,
      handle: await uniqueHandle(handleInput),
      termsAcceptedAt: new Date(),
      termsVersion: TERMS_VERSION,
      contributionPolicy: CONTRIBUTION_POLICY,
      role: "user",
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, createSessionToken(user.id, user.sessionVersion), {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  redirect(returnTo);
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
  if (user.suspendedAt) {
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

export async function createTerm(formData: FormData) {
  const user = await requireActiveUser();
  await enforceRateLimit(user.id, "post");
  const parsed = termSchema.parse({
    headword: text(formData, "headword"),
    senseTitle: text(formData, "senseTitle"),
    senseDescription: text(formData, "senseDescription"),
    proposalText: text(formData, "proposalText"),
  });
  const domainId = optionalText(formData, "domainId");
  const originalSentence = optionalText(formData, "originalSentence");
  const rewrittenSentence = optionalText(formData, "rewrittenSentence");
  if ((originalSentence && !rewrittenSentence) || (!originalSentence && rewrittenSentence)) {
    throw new Error("言い換え例は、元の文と言い換えた文をセットで入力してください。");
  }
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
        text: parsed.proposalText,
        fitContext: text(formData, "fitContext") || "未整理",
        rationale: optionalText(formData, "rationale"),
        register: text(formData, "register") || "neutral",
        status: originalSentence && rewrittenSentence ? "active" : "draft",
        createdById: user.id,
      },
    });

    if (originalSentence && rewrittenSentence) {
      await tx.usageExample.create({
        data: {
          termId: createdTerm.id,
          senseId: sense.id,
          proposalId: proposal.id,
          originalSentence,
          rewrittenSentence,
          contextNote: optionalText(formData, "contextNote"),
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
          firstProposal: parsed.proposalText,
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
  const proposalText = text(formData, "proposalText");
  const originalSentence = optionalText(formData, "originalSentence");
  const rewrittenSentence = optionalText(formData, "rewrittenSentence");

  if (!senseId || !termId || !proposalText) {
    throw new Error("訳語案の投稿に必要な値が不足しています。");
  }
  await requireSenseTarget({ senseId, termId, termSlug });

  const proposal = await prisma.$transaction(async (tx) => {
    const createdProposal = await tx.translationProposal.create({
      data: {
        senseId,
        text: proposalText,
        fitContext: text(formData, "fitContext") || "未整理",
        unfitContext: optionalText(formData, "unfitContext"),
        rationale: optionalText(formData, "rationale"),
        pros: optionalText(formData, "pros"),
        cons: optionalText(formData, "cons"),
        register: text(formData, "register") || "neutral",
        status: originalSentence && rewrittenSentence ? "active" : "draft",
        createdById: user.id,
      },
    });

    if (originalSentence && rewrittenSentence) {
      await tx.usageExample.create({
        data: {
          termId,
          senseId,
          proposalId: createdProposal.id,
          originalSentence,
          rewrittenSentence,
          contextNote: optionalText(formData, "contextNote"),
          createdById: user.id,
        },
      });
    }

    await tx.revision.create({
      data: {
        entityType: "proposal",
        entityId: createdProposal.id,
        afterJson: JSON.stringify({
          text: proposalText,
          fitContext: text(formData, "fitContext"),
        }),
        reason: "訳語案を追加",
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
  const labels = formData.getAll("labels").map(String);

  if (!proposalId) {
    throw new Error("評価対象が見つかりません。");
  }
  await requireProposalTarget({ proposalId, termSlug });

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

  await prisma.comment.create({
    data: {
      proposalId,
      userId: user.id,
      category: text(formData, "category") || "other",
      body,
    },
  });

  revalidatePath(`/terms/${termSlug}`);
  redirect(termPath(termSlug, `#proposal-${proposalId}`));
}

export async function setRecommendation(formData: FormData) {
  const user = await requireActiveUser();
  if (!canEditRecommendations(user.role)) {
    throw new Error("推奨訳を設定できる権限がありません。");
  }

  const senseId = text(formData, "senseId");
  const proposalId = text(formData, "proposalId");
  const termSlug = text(formData, "termSlug");
  const level = z.enum(["tentative", "recommended", "limited", "discouraged"]).parse(text(formData, "level"));
  const context = text(formData, "context");
  const rationale = text(formData, "rationale");

  if (!senseId || !proposalId || !level || !context || !rationale) {
    throw new Error("推奨訳の設定に必要な値が不足しています。");
  }
  await requireProposalTarget({ proposalId, senseId, termSlug });

  await prisma.$transaction(async (tx) => {
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
        reason: "推奨訳を設定",
        createdById: user.id,
      },
    });
  });

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

export async function hideProposal(formData: FormData) {
  const user = await requireActiveUser();
  if (!canModerate(user.role)) {
    throw new Error("非表示にする権限がありません。");
  }

  const proposalId = text(formData, "proposalId");
  const reason = text(formData, "reason") || "モデレーション判断";
  const returnTo = safePath(text(formData, "returnTo"), "/dashboard");

  const before = await prisma.translationProposal.findUnique({ where: { id: proposalId } });
  if (!before) throw new Error("訳語案が見つかりません。");

  await prisma.$transaction(async (tx) => {
    await tx.translationProposal.update({
      where: { id: proposalId },
      data: { status: "hidden" },
    });
    await tx.revision.create({
      data: {
        entityType: "proposal",
        entityId: proposalId,
        beforeJson: JSON.stringify({ status: before.status }),
        afterJson: JSON.stringify({ status: "hidden" }),
        reason,
        createdById: user.id,
      },
    });
  });

  revalidatePath("/dashboard");
  redirect(returnTo);
}

export async function resolveReport(formData: FormData) {
  const user = await requireActiveUser();
  if (!canModerate(user.role)) {
    throw new Error("通報を処理する権限がありません。");
  }

  const reportId = text(formData, "reportId");
  const status = z.enum(["resolved", "dismissed"]).parse(text(formData, "status") || "resolved");
  await prisma.report.update({
    where: { id: reportId },
    data: { status },
  });
  revalidatePath("/dashboard");
  redirect("/dashboard");
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
  text: z.string().trim().min(1, "訳語案を入力してください。").max(120),
  fitContext: z.string().trim().min(1, "合う文脈を入力してください。").max(1000),
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
    if (!before) throw new Error("修正対象の訳語案が見つかりません。");
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
  const applyNow = text(formData, "applyNow") === "1" && canEditRecommendations(user.role);

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
  if (!canEditRecommendations(user.role)) {
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
  if (!canEditRecommendations(user.role)) {
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
  const user = await requireActiveUser();
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

export async function changePassword(formData: FormData) {
  const user = await requireActiveUser({ allowPasswordChange: true });
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
  if (!canAdmin(user.role)) throw new Error("パスワードを再設定する権限がありません。");
  const userId = text(formData, "userId");
  const temporaryPassword = text(formData, "temporaryPassword");
  const returnTo = safePath(text(formData, "returnTo"), "/admin");
  if (userId === user.id) throw new Error("自分のパスワードはアカウント画面から変更してください。");
  if (temporaryPassword.length < 12) throw new Error("一時パスワードは12文字以上にしてください。");
  if (temporaryPassword.length > 256) throw new Error("一時パスワードは256文字以内にしてください。");
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) throw new Error("ユーザーが見つかりません。");

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

export async function resolveReportWithState(_previousState: ActionState, formData: FormData) {
  return runStatefulAction(resolveReport, formData);
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

export async function resetUserPasswordWithState(_previousState: ActionState, formData: FormData) {
  return runStatefulAction(resetUserPassword, formData);
}
