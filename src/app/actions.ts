"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  SESSION_COOKIE,
  createSessionToken,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";
import { joinLabels, normalizeForSearch, slugifyHeadword } from "@/lib/normalize";
import { canEditRecommendations, canModerate, requireActiveUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function optionalText(formData: FormData, name: string) {
  const value = text(formData, name);
  return value.length > 0 ? value : undefined;
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

async function enforceRateLimit(userId: string, entity: "term" | "proposal" | "example" | "comment" | "report") {
  const since = new Date(Date.now() - 60 * 1000);
  const limits = {
    term: 3,
    proposal: 8,
    example: 8,
    comment: 12,
    report: 8,
  };
  const count =
    entity === "term"
      ? await prisma.term.count({ where: { createdById: userId, createdAt: { gte: since } } })
      : entity === "proposal"
        ? await prisma.translationProposal.count({ where: { createdById: userId, createdAt: { gte: since } } })
        : entity === "example"
          ? await prisma.usageExample.count({ where: { createdById: userId, createdAt: { gte: since } } })
          : entity === "comment"
            ? await prisma.comment.count({ where: { userId, createdAt: { gte: since } } })
            : await prisma.report.count({ where: { createdById: userId, createdAt: { gte: since } } });

  if (count >= limits[entity]) {
    throw new Error("短時間の投稿が多すぎます。少し時間をおいてください。");
  }
}

const termSchema = z.object({
  headword: z.string().min(1),
  summary: z.string().min(8),
  senseTitle: z.string().min(1),
  senseDescription: z.string().min(8),
});

const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function signUp(formData: FormData) {
  const email = text(formData, "email").toLowerCase();
  const password = text(formData, "password");
  const displayName = text(formData, "displayName");
  const handleInput = text(formData, "handle") || displayName || email.split("@")[0];
  const returnTo = text(formData, "returnTo") || "/";
  const parsed = authSchema.extend({ displayName: z.string().min(1) }).parse({
    email,
    password,
    displayName,
  });

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
      role: "user",
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, createSessionToken(user.id), {
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
  const returnTo = text(formData, "returnTo") || "/";
  const parsed = authSchema.parse({ email, password });
  const user = await prisma.user.findUnique({ where: { email: parsed.email } });

  if (!user || !verifyPassword(parsed.password, user.passwordHash)) {
    throw new Error("メールアドレスまたはパスワードが正しくありません。");
  }
  if (user.suspendedAt) {
    throw new Error("このアカウントは停止されています。");
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, createSessionToken(user.id), {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  redirect(returnTo);
}

export async function signOut() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect("/");
}

export async function createTerm(formData: FormData) {
  const user = await requireActiveUser();
  await enforceRateLimit(user.id, "term");
  const parsed = termSchema.parse({
    headword: text(formData, "headword"),
    summary: text(formData, "summary"),
    senseTitle: text(formData, "senseTitle"),
    senseDescription: text(formData, "senseDescription"),
  });
  const domainId = optionalText(formData, "domainId");
  const proposalText = optionalText(formData, "proposalText");
  const originalSentence = optionalText(formData, "originalSentence");
  const rewrittenSentence = optionalText(formData, "rewrittenSentence");
  const slug = await uniqueSlug(parsed.headword);
  const tagNames = text(formData, "tags")
    .split(/[,\s、]+/)
    .map((tag) => tag.trim())
    .filter(Boolean);

  const term = await prisma.$transaction(async (tx) => {
    const createdTerm = await tx.term.create({
      data: {
        headword: parsed.headword,
        slug,
        normalizedHeadword: normalizeForSearch(parsed.headword),
        originalWord: optionalText(formData, "originalWord"),
        summary: parsed.summary,
        createdById: user.id,
      },
    });

    for (const tagName of tagNames) {
      const tag = await tx.tag.upsert({
        where: { slug: normalizeForSearch(tagName) },
        update: {},
        create: {
          slug: normalizeForSearch(tagName),
          name: tagName,
        },
      });
      await tx.termTag.create({
        data: {
          termId: createdTerm.id,
          tagId: tag.id,
        },
      });
    }

    const sense = await tx.sense.create({
      data: {
        termId: createdTerm.id,
        domainId,
        title: parsed.senseTitle,
        description: parsed.senseDescription,
        createdById: user.id,
      },
    });

    if (proposalText) {
      const proposal = await tx.translationProposal.create({
        data: {
          senseId: sense.id,
          text: proposalText,
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
    }

    await tx.revision.create({
      data: {
        entityType: "term",
        entityId: createdTerm.id,
        afterJson: JSON.stringify({
          headword: parsed.headword,
          summary: parsed.summary,
          firstSense: parsed.senseTitle,
        }),
        reason: "項目を新規作成",
        createdById: user.id,
      },
    });

    return createdTerm;
  });

  revalidatePath("/");
  redirect(`/terms/${term.slug}`);
}

export async function addSense(formData: FormData) {
  const user = await requireActiveUser();
  const termId = text(formData, "termId");
  const termSlug = text(formData, "termSlug");
  const title = text(formData, "title");
  const description = text(formData, "description");
  const domainId = optionalText(formData, "domainId");

  if (!termId || !title || !description) {
    throw new Error("意味の見出しと説明は必須です。");
  }

  const sense = await prisma.sense.create({
    data: {
      termId,
      domainId,
      title,
      description,
      createdById: user.id,
    },
  });

  await prisma.revision.create({
    data: {
      entityType: "sense",
      entityId: sense.id,
      afterJson: JSON.stringify({ title, description }),
      reason: "意味を追加",
      createdById: user.id,
    },
  });

  revalidatePath(`/terms/${termSlug}`);
  redirect(`/terms/${termSlug}`);
}

export async function addProposal(formData: FormData) {
  const user = await requireActiveUser();
  await enforceRateLimit(user.id, "proposal");
  const senseId = text(formData, "senseId");
  const termId = text(formData, "termId");
  const termSlug = text(formData, "termSlug");
  const proposalText = text(formData, "proposalText");
  const originalSentence = optionalText(formData, "originalSentence");
  const rewrittenSentence = optionalText(formData, "rewrittenSentence");

  if (!senseId || !termId || !proposalText) {
    throw new Error("訳語案の投稿に必要な値が不足しています。");
  }

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
  redirect(`/terms/${termSlug}#proposal-${proposal.id}`);
}

export async function addUsageExample(formData: FormData) {
  const user = await requireActiveUser();
  await enforceRateLimit(user.id, "example");
  const termId = text(formData, "termId");
  const senseId = text(formData, "senseId");
  const proposalId = text(formData, "proposalId");
  const termSlug = text(formData, "termSlug");
  const originalSentence = text(formData, "originalSentence");
  const rewrittenSentence = text(formData, "rewrittenSentence");

  if (!termId || !senseId || !proposalId || !originalSentence || !rewrittenSentence) {
    throw new Error("使用例の追加に必要な値が不足しています。");
  }

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
  redirect(`/terms/${termSlug}#proposal-${proposalId}-${example.id}`);
}

export async function evaluateProposal(formData: FormData) {
  const user = await requireActiveUser();
  const proposalId = text(formData, "proposalId");
  const termSlug = text(formData, "termSlug");
  const labels = formData.getAll("labels").map(String);

  if (!proposalId) {
    throw new Error("評価対象が見つかりません。");
  }

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
  redirect(`/terms/${termSlug}#proposal-${proposalId}`);
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

  await prisma.comment.create({
    data: {
      proposalId,
      userId: user.id,
      category: text(formData, "category") || "other",
      body,
    },
  });

  revalidatePath(`/terms/${termSlug}`);
  redirect(`/terms/${termSlug}#proposal-${proposalId}`);
}

export async function setRecommendation(formData: FormData) {
  const user = await requireActiveUser();
  if (!canEditRecommendations(user.role)) {
    throw new Error("推奨訳を設定できる権限がありません。");
  }

  const senseId = text(formData, "senseId");
  const proposalId = text(formData, "proposalId");
  const termSlug = text(formData, "termSlug");
  const level = text(formData, "level");
  const context = text(formData, "context");
  const rationale = text(formData, "rationale");

  if (!senseId || !proposalId || !level || !context || !rationale) {
    throw new Error("推奨訳の設定に必要な値が不足しています。");
  }

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
  redirect(`/terms/${termSlug}#proposal-${proposalId}`);
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

  await prisma.report.create({
    data: {
      targetType: "proposal",
      targetId: proposalId,
      reason,
      detail: optionalText(formData, "detail"),
      createdById: user.id,
    },
  });

  revalidatePath("/dashboard");
  redirect(`/terms/${termSlug}#proposal-${proposalId}`);
}

export async function hideProposal(formData: FormData) {
  const user = await requireActiveUser();
  if (!canModerate(user.role)) {
    throw new Error("非表示にする権限がありません。");
  }

  const proposalId = text(formData, "proposalId");
  const reason = text(formData, "reason") || "モデレーション判断";
  const returnTo = text(formData, "returnTo") || "/dashboard";

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
  const status = text(formData, "status") || "resolved";
  await prisma.report.update({
    where: { id: reportId },
    data: { status },
  });
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function suspendUser(formData: FormData) {
  const user = await requireActiveUser();
  if (!canModerate(user.role)) {
    throw new Error("ユーザーを停止する権限がありません。");
  }

  const userId = text(formData, "userId");
  const returnTo = text(formData, "returnTo") || "/dashboard";
  if (userId === user.id) {
    throw new Error("自分自身は停止できません。");
  }
  await prisma.user.update({
    where: { id: userId },
    data: { suspendedAt: new Date() },
  });
  revalidatePath("/dashboard");
  redirect(returnTo);
}
