import Link from "next/link";
import { NewTermForm } from "@/components/TermForms";
import { EmptyState } from "@/components/EmptyState";
import { normalizeForSearch } from "@/lib/normalize";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

type NewTermPageProps = {
  searchParams: Promise<{ headword?: string }>;
};

export const metadata = {
  title: "日本語案を投稿",
};

export const dynamic = "force-dynamic";

export default async function NewTermPage({ searchParams }: NewTermPageProps) {
  const { headword = "" } = await searchParams;
  const defaultHeadword = headword.trim();
  const normalizedHeadword = normalizeForSearch(defaultHeadword);

  const [domains, currentUser, similarTerms] = await Promise.all([
    prisma.domain.findMany({ orderBy: { name: "asc" } }),
    getCurrentUser(),
    normalizedHeadword
      ? prisma.term.findMany({
          where: {
            OR: [
              { headword: { contains: defaultHeadword } },
              { normalizedHeadword: { contains: normalizedHeadword } },
              { originalWord: { contains: defaultHeadword.toLowerCase() } },
            ],
          },
          take: 5,
          orderBy: { updatedAt: "desc" },
        })
      : [],
  ]);

  return (
    <div className="page-shell narrow">
      <section className="page-title">
        <p className="eyebrow">日本語案を投稿</p>
        <h1>横文字の日本語案をつくる</h1>
        <p>言い換えたい言葉と使われ方を整理し、中心となる日本語案を1つ登録します。</p>
      </section>
      {similarTerms.length > 0 ? (
        <section className="similar-terms">
          <h2>近い項目</h2>
          <p>同じ言葉や表記違いがある場合は、既存項目に別の使われ方や日本語案を追加してください。</p>
          <div>
            {similarTerms.map((term) => (
              <Link key={term.id} href={`/terms/${term.slug}`}>
                {term.headword}
                {term.originalWord ? <span>{term.originalWord}</span> : null}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {currentUser ? (
        <NewTermForm domains={domains} defaultHeadword={defaultHeadword} />
      ) : (
        <EmptyState
          title="投稿にはログインが必要です"
          body="閲覧は誰でもできます。項目作成、訳語案、評価、コメントにはアカウントを使います。"
          actionLabel="ログイン・登録"
          actionHref="/login?returnTo=/terms/new"
        />
      )}
    </div>
  );
}
