import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const hiraganaStart = 0x3041;
const hiraganaEnd = 0x3096;
const katakanaOffset = 0x60;

function normalizeForSearch(input) {
  return Array.from(input)
    .map((character) => {
      const code = character.charCodeAt(0);
      return code >= hiraganaStart && code <= hiraganaEnd
        ? String.fromCharCode(code + katakanaOffset)
        : character;
    })
    .join("")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[ \t\r\n\u3000・･/_‐‑‒–—―-]/g, "")
    .trim();
}

const terms = [
  {
    headword: "プログラム",
    slug: "program",
    originalWord: "program",
    summary: "コンピューターに行わせる処理を、一定の言語や形式で記したもの。",
    senseTitle: "コンピューターに実行させる処理の記述",
    senseDescription: "コンピューターが解釈または変換して実行できるように、命令や処理手順を一定の規則で記述したもの。",
    usageNote: "催しの演目表、放送番組、事業計画などを指す program はこの使われ方に含めない。",
    proposals: [
      {
        text: "算譜",
        reading: "さんぷ",
        fitContext: "計算機科学、技術教育、開発文書でコンピュータープログラムを指す場面",
        unfitContext: "催しの演目表、放送番組、事業計画を指すprogram",
        rationale: "「算」は計算や情報処理、「譜」は規則に従って構成された記述を表す。1950年代以降の辞書・専門書・大学研究に実例があり、作譜・算譜言語・試譜へ展開できる。",
        pros: "二字で短く、「算譜を書く・直す・実行する」と日本語の文に入れやすい。",
        cons: "現在はまれで読みが伝わりにくく、音楽の譜面を連想させる可能性がある。",
        register: "technical",
        recommendation: "コンピュータープログラムを語族の中で表す場面",
        recommendationRationale: "実際の使用史と派生語があるため試用する価値があるが、初見の理解と現代の文章での自然さは追加検証が必要。",
        example: {
          original: "このプログラムは、入力された数値を小さい順に並べ替える。",
          rewritten: "この算譜は、入力された数値を小さい順に並べ替える。",
          context: "算法を説明する教材",
        },
      },
      {
        text: "処理記述",
        reading: "しょりきじゅつ",
        fitContext: "プログラムの役割を専門外の人へ説明する場面",
        unfitContext: "名称として繰り返し短く使いたい技術文書",
        rationale: "何らかの処理を記したものだと初見で推測しやすい説明的な案。",
        pros: "既知の語だけで意味の方向を推測しやすい。",
        cons: "プログラム固有の実行可能性を十分に表さず、一般的な処理手順書とも区別しにくい。",
        register: "formal",
        example: {
          original: "プログラムの内容を読んで確認する。",
          rewritten: "処理記述の内容を読んで確認する。",
          context: "専門外向けの技術説明",
        },
      },
    ],
  },
  {
    headword: "プログラミング",
    slug: "programming",
    originalWord: "programming",
    summary: "プログラムを設計し、記述し、試験し、修正する活動。",
    senseTitle: "プログラムを設計・記述する活動",
    senseDescription: "目的に合う処理を考え、プログラムとして記述し、動作を確かめながら誤りや構造を直す一連の活動。",
    usageNote: "単なる文字入力だけでなく、設計、試験、修正を含む広い活動として扱う。",
    proposals: [
      {
        text: "作譜",
        reading: "さくふ",
        fitContext: "算譜を基幹語として用いる技術教育、研究、開発文書",
        unfitContext: "音楽の譜面作成と区別できない場面",
        rationale: "算譜を作る活動として派生が明快で、1980年代の情報処理分野や専門書にプログラミングの意味での使用例がある。",
        pros: "「作譜する」と動詞化でき、算譜との関係が短く表せる。",
        cons: "現代では音楽の譜面を作る意味が強く、文脈なしでは誤解されやすい。",
        register: "technical",
        recommendation: "算譜語群を共有している技術文書や試用会",
        recommendationRationale: "歴史的な使用例と造語上の一貫性がある一方、音楽用語との衝突が大きいため、当面は文脈を限定して試用する。",
        example: {
          original: "安全性を確かめながらプログラミングする。",
          rewritten: "安全性を確かめながら作譜する。",
          context: "ソフトウェア開発の説明",
        },
      },
      {
        text: "算譜作成",
        reading: "さんぷさくせい",
        fitContext: "初めて算譜という語に触れる人への説明",
        unfitContext: "会話や頻出する技術文書",
        rationale: "基幹語の算譜を残しつつ、作成という一般語で行為を明示する。",
        pros: "意味関係を推測しやすく、音楽の作譜との区別が比較的つきやすい。",
        cons: "設計、試験、修正まで含むプログラミングの広さを「作成」だけでは表しにくい。",
        register: "formal",
        example: {
          original: "プログラミングの基礎を授業で学ぶ。",
          rewritten: "算譜作成の基礎を授業で学ぶ。",
          context: "初学者向け教材",
        },
      },
    ],
  },
  {
    headword: "プログラマー",
    slug: "programmer",
    originalWord: "programmer",
    summary: "プログラムの設計、作成、試験、修正を行う人。",
    senseTitle: "プログラムを作る人",
    senseDescription: "仕事または継続的な活動として、プログラムを設計し、記述し、試験し、保守する人。",
    usageNote: "職業人だけを指す場合と、趣味や学習でプログラムを書く人を含む場合がある。",
    proposals: [
      {
        text: "算譜師",
        reading: "さんぷし",
        fitContext: "専門職としてプログラムを作る人を指す場面",
        unfitContext: "学習者や趣味で一度だけプログラムを書く人まで広く含める場面",
        rationale: "算譜を作る専門性のある人を「師」で表す案。過去の外来語言い換え活動にも提案例がある。",
        pros: "算譜との関係が明確で、職能名として短い。",
        cons: "「師」が熟練や職業を強く示し、初心者や非職業人を除外して聞こえる可能性がある。",
        register: "technical",
        recommendation: "プログラム作成を職能とする人を指す試用",
        recommendationRationale: "語族としては明快だが、人の範囲を狭める可能性が高い。職能名に限定して暫定的に試す。",
        example: {
          original: "プログラマーが算出方法をプログラムへ実装した。",
          rewritten: "算譜師が算出方法を算譜へ組み込んだ。",
          context: "開発体制の説明",
        },
      },
      {
        text: "作譜者",
        reading: "さくふしゃ",
        fitContext: "職業かどうかを問わず、算譜を書いた人を指す場面",
        unfitContext: "音楽の譜面作成者と同時に現れる場面",
        rationale: "作譜という行為の担い手を、価値や熟練度を含みにくい「者」で表す。",
        pros: "職業人に限定せず、特定の算譜の作成者という関係を表しやすい。",
        cons: "音楽分野の作譜者と同形で、単独ではコンピューター分野だと分からない。",
        register: "formal",
        example: {
          original: "このプログラムのプログラマーへ質問する。",
          rewritten: "この算譜の作譜者へ質問する。",
          context: "作成者への問い合わせ",
        },
      },
    ],
  },
  {
    headword: "プログラミング言語",
    slug: "programming-language",
    originalWord: "programming language",
    summary: "コンピューターに行わせる処理をプログラムとして記述するための人工言語。",
    senseTitle: "プログラムを記述するための言語",
    senseDescription: "プログラムを構成する記号、語、構文と、それらが表す処理の意味を定めた人工言語。",
    usageNote: "マークアップ言語や問い合わせ言語などを含む、より広い「計算機言語」とは範囲が異なる。",
    proposals: [
      {
        text: "算譜言語",
        reading: "さんぷげんご",
        fitContext: "算譜語群を用いる計算機科学、技術教育、言語設計",
        unfitContext: "データ記述言語など、算譜以外も含む計算機言語全般",
        rationale: "算譜を記述する言語という構成で、実際の学術発表にも「算譜言語」の使用例がある。",
        pros: "基幹語との関係と対象範囲が明確で、既存の「自然言語」とも対照しやすい。",
        cons: "算譜を知らない読者には意味が伝わらず、「作譜言語」という過去の別案とも揺れる。",
        register: "technical",
        recommendation: "算譜を記述する人工言語を語族として表す場面",
        recommendationRationale: "算譜との体系性と使用例があるため有力だが、作譜言語との比較と初見理解の検証が必要。",
        example: {
          original: "Pythonは、教育でも広く使われるプログラミング言語だ。",
          rewritten: "Pythonは、教育でも広く使われる算譜言語だ。",
          context: "初学者向けの言語紹介",
        },
      },
      {
        text: "作譜言語",
        reading: "さくふげんご",
        fitContext: "プログラミングという行為との関係を強調する歴史的・専門的文脈",
        unfitContext: "音楽用の記譜言語と混同し得る場面",
        rationale: "プログラミングを作譜と呼ぶ体系から派生し、過去の研究文献に使用例がある。",
        pros: "行為との関係を示し、歴史的な用語体系と整合する。",
        cons: "音楽の作譜に使う言語と誤解されやすく、算譜言語より対象物との関係が間接的。",
        register: "technical",
        example: {
          original: "目的に合うプログラミング言語を選ぶ。",
          rewritten: "目的に合う作譜言語を選ぶ。",
          context: "言語選定の説明",
        },
      },
    ],
  },
  {
    headword: "テストプログラム",
    slug: "test-program",
    originalWord: "test program",
    summary: "別のプログラム、機器、仕組みなどが期待どおり動くかを確かめるためのプログラム。",
    senseTitle: "動作を確かめるためのプログラム",
    senseDescription: "検査対象へ入力を与え、結果や状態を確認するなど、動作や性質を確かめる目的で作るプログラム。",
    usageNote: "試験そのもの、試験項目、手動の試験手順は含めず、実行されるプログラムを指す。",
    proposals: [
      {
        text: "試譜",
        reading: "しふ",
        fitContext: "算譜語群を用いる試験、検証、技術教育",
        unfitContext: "音楽の試奏用譜面と混同する場面、算譜を導入していない文書",
        rationale: "試すための算譜を二字で表す派生語で、辞書類にもテストプログラムの語として記録がある。",
        pros: "短く、算譜・作譜と同じ語族に収まり、複合語にしやすい。",
        cons: "単独では読みも意味も推測しにくく、試験対象と試験用プログラムの関係を説明する必要がある。",
        register: "technical",
        recommendation: "算譜語群の中で試験用プログラムを表す場面",
        recommendationRationale: "語族として簡潔で既存の記録もあるが、一般読者の推義性と実務文書での識別性を追加検証する。",
        example: {
          original: "変更後にテストプログラムを実行し、出力を比較する。",
          rewritten: "変更後に試譜を実行し、出力を比較する。",
          context: "ソフトウェア試験の手順",
        },
      },
      {
        text: "検査用算譜",
        reading: "けんさようさんぷ",
        fitContext: "試譜という短い語をまだ共有していない説明文",
        unfitContext: "繰り返し使う仕様書や会話",
        rationale: "用途を「検査用」で明示し、基幹語の算譜との関係を保つ。",
        pros: "初見でも用途を推測しやすく、試譜より誤解が少ない。",
        cons: "長く、「試験」「検証」「検査」の使い分けを一語では解決できない。",
        register: "formal",
        example: {
          original: "テストプログラムから機器へ信号を送る。",
          rewritten: "検査用算譜から機器へ信号を送る。",
          context: "機器検査の説明",
        },
      },
    ],
  },
];

async function main() {
  const creator = process.env.ADMIN_EMAIL
    ? await prisma.user.findUnique({ where: { email: process.env.ADMIN_EMAIL } })
    : await prisma.user.findFirst({ where: { role: "admin", deletedAt: null } });
  if (!creator) throw new Error("公開内容の作成者となる管理者が見つかりません。");

  const domain = await prisma.domain.findUnique({ where: { slug: "it" } });
  if (!domain) throw new Error("IT分野が見つかりません。");

  const tag = await prisma.tag.findFirst({ where: { name: "開発" } });
  if (!tag) throw new Error("開発タグが見つかりません。");

  for (const definition of terms) {
    const existing = await prisma.term.findFirst({
      where: {
        OR: [
          { slug: definition.slug },
          { normalizedHeadword: normalizeForSearch(definition.headword) },
        ],
      },
    });
    if (existing) {
      console.log(`skip:${definition.slug}`);
      continue;
    }

    await prisma.$transaction(async (tx) => {
      const term = await tx.term.create({
        data: {
          headword: definition.headword,
          slug: definition.slug,
          normalizedHeadword: normalizeForSearch(definition.headword),
          originalWord: definition.originalWord,
          summary: definition.summary,
          status: "published",
          createdById: creator.id,
        },
      });
      const sense = await tx.sense.create({
        data: {
          termId: term.id,
          domainId: domain.id,
          title: definition.senseTitle,
          description: definition.senseDescription,
          usageNote: definition.usageNote,
          createdById: creator.id,
        },
      });
      await tx.senseTag.create({
        data: {
          senseId: sense.id,
          tagId: tag.id,
        },
      });

      for (const proposalDefinition of definition.proposals) {
        const proposal = await tx.translationProposal.create({
          data: {
            senseId: sense.id,
            text: proposalDefinition.text,
            reading: proposalDefinition.reading,
            fitContext: proposalDefinition.fitContext,
            unfitContext: proposalDefinition.unfitContext,
            rationale: proposalDefinition.rationale,
            pros: proposalDefinition.pros,
            cons: proposalDefinition.cons,
            register: proposalDefinition.register,
            status: proposalDefinition.recommendation ? "tentative" : "active",
            createdById: creator.id,
          },
        });
        const example = await tx.usageExample.create({
          data: {
            termId: term.id,
            senseId: sense.id,
            proposalId: proposal.id,
            originalSentence: proposalDefinition.example.original,
            rewrittenSentence: proposalDefinition.example.rewritten,
            contextNote: proposalDefinition.example.context,
            sourceType: "original",
            createdById: creator.id,
          },
        });
        if (proposalDefinition.recommendation) {
          await tx.recommendation.create({
            data: {
              senseId: sense.id,
              proposalId: proposal.id,
              level: "tentative",
              context: proposalDefinition.recommendation,
              rationale: proposalDefinition.recommendationRationale,
              representativeExampleId: example.id,
              decidedById: creator.id,
            },
          });
        }
      }

      await tx.revision.create({
        data: {
          entityType: "term",
          entityId: term.id,
          afterJson: JSON.stringify({
            headword: definition.headword,
            summary: definition.summary,
            firstSense: definition.senseTitle,
            firstSenseDomainId: domain.id,
            firstSenseTags: [tag.name],
            firstProposal: definition.proposals[0].text,
          }),
          reason: "算譜語群の公開試用として新規作成",
          createdById: creator.id,
        },
      });
    });
    console.log(`created:${definition.slug}`);
  }
}

await main()
  .finally(async () => {
    await prisma.$disconnect();
  });
