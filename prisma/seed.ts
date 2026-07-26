import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth";
import { joinLabels, normalizeForSearch } from "../src/lib/normalize";

const prisma = new PrismaClient();

type SeedProposal = {
  text: string;
  fitContext: string;
  unfitContext?: string;
  rationale: string;
  register?: string;
  labels: string[];
  example: {
    original: string;
    rewritten: string;
    note?: string;
  };
  recommendation?: {
    level: string;
    context: string;
    rationale: string;
  };
};

type SeedSense = {
  title: string;
  description: string;
  domainSlug: string;
  proposals: SeedProposal[];
};

type SeedTerm = {
  headword: string;
  slug: string;
  originalWord?: string;
  summary: string;
  tags: string[];
  senses: SeedSense[];
};

const domains = [
  ["business", "ビジネス"],
  ["public", "行政"],
  ["it", "IT"],
  ["marketing", "マーケティング"],
  ["hr", "人事"],
  ["sns", "SNS"],
  ["education", "教育"],
  ["daily", "日常"],
];

const tagNames = [
  "会議",
  "企画",
  "分析",
  "組織",
  "開発",
  "広報",
  "人材",
  "社会",
];

const terms: SeedTerm[] = [
  {
    headword: "エンゲージメント",
    slug: "engagement",
    originalWord: "engagement",
    summary: "人や組織、投稿、サービスに対する関与・反応・愛着の度合い。",
    tags: ["分析", "組織", "広報"],
    senses: [
      {
        title: "反応や関与の度合い",
        description: "投稿や施策に対して、利用者がどれだけ反応したかを示す意味。",
        domainSlug: "sns",
        proposals: [
          {
            text: "反応度",
            fitContext: "SNS投稿、広告、配信施策の分析",
            rationale: "数値指標として短く、いいねや返信などの反応を想像しやすい。",
            register: "neutral",
            labels: ["natural", "clear", "concise", "accurate"],
            example: {
              original: "投稿のエンゲージメントを分析する。",
              rewritten: "投稿への反応度を分析する。",
            },
            recommendation: {
              level: "recommended",
              context: "SNSや広告の反応指標",
              rationale: "数値として扱いやすく、専門外にも意味が伝わりやすい。",
            },
          },
          {
            text: "関与度",
            fitContext: "利用者の行動を広めに含めたい分析資料",
            rationale: "反応よりも広い関わりを表せるが、やや硬い。",
            register: "formal",
            labels: ["accurate", "document_friendly", "too_stiff"],
            example: {
              original: "ユーザーエンゲージメントを改善する。",
              rewritten: "利用者の関与度を改善する。",
            },
          },
        ],
      },
      {
        title: "組織への愛着や働きがい",
        description: "従業員が組織に前向きに関わる心理的な状態。",
        domainSlug: "hr",
        proposals: [
          {
            text: "働きがい",
            fitContext: "人事施策、従業員調査、組織改善",
            rationale: "人事文脈では感情面を自然に表せる。",
            labels: ["natural", "clear", "accurate", "conversation_friendly"],
            example: {
              original: "社員のエンゲージメントを高める。",
              rewritten: "社員の働きがいを高める。",
            },
            recommendation: {
              level: "recommended",
              context: "従業員向けの説明や人事施策",
              rationale: "一般の社員にも分かりやすく、施策の目的が伝わる。",
            },
          },
          {
            text: "組織への愛着",
            fitContext: "離職防止、組織調査、経営資料",
            rationale: "会社や組織との心理的な結びつきを明示できる。",
            register: "formal",
            labels: ["clear", "accurate", "document_friendly"],
            example: {
              original: "エンゲージメントサーベイを実施する。",
              rewritten: "組織への愛着を測る調査を実施する。",
            },
          },
        ],
      },
    ],
  },
  {
    headword: "コミット",
    slug: "commit",
    originalWord: "commit",
    summary: "約束する、責任を持って関わる、変更を記録するなど、文脈で意味が変わる語。",
    tags: ["組織", "開発"],
    senses: [
      {
        title: "責任を持って関わる",
        description: "目標や事業に対して、当事者として深く関わる意味。",
        domainSlug: "business",
        proposals: [
          {
            text: "責任を持って関わる",
            fitContext: "経営、事業、組織施策",
            rationale: "何を求めているのかが曖昧になりにくい。",
            labels: ["natural", "clear", "accurate"],
            example: {
              original: "経営層のコミットが必要です。",
              rewritten: "経営層が責任を持って関わる必要があります。",
            },
            recommendation: {
              level: "recommended",
              context: "事業・組織への関与を求める場面",
              rationale: "責任と関与の両方を明示できる。",
            },
          },
          {
            text: "深く関わる",
            fitContext: "会話、柔らかい社内文書",
            rationale: "責任の強さを抑え、関与の深さを自然に表せる。",
            labels: ["natural", "clear", "conversation_friendly"],
            example: {
              original: "この企画には全員がコミットする。",
              rewritten: "この企画には全員が深く関わる。",
            },
          },
        ],
      },
      {
        title: "変更を記録する",
        description: "開発作業で変更内容を履歴に保存する意味。",
        domainSlug: "it",
        proposals: [
          {
            text: "変更を記録する",
            fitContext: "Gitなどの開発文脈を専門外に説明する場面",
            rationale: "操作の意味を技術者以外にも説明しやすい。",
            register: "technical",
            labels: ["clear", "accurate", "document_friendly"],
            example: {
              original: "修正をコミットしてください。",
              rewritten: "修正内容を記録してください。",
            },
            recommendation: {
              level: "limited",
              context: "非技術者向けの開発説明",
              rationale: "専門用語としてのcommitを説明する訳として使える。",
            },
          },
        ],
      },
    ],
  },
  {
    headword: "エビデンス",
    slug: "evidence",
    originalWord: "evidence",
    summary: "判断や主張を支える証拠、根拠、裏付け。",
    tags: ["分析", "企画"],
    senses: [
      {
        title: "判断を支える根拠",
        description: "主張、施策、判断の妥当性を支える材料。",
        domainSlug: "business",
        proposals: [
          {
            text: "根拠",
            fitContext: "会議、企画書、説明資料",
            rationale: "一般文書で最も自然に置き換えやすい。",
            labels: ["natural", "clear", "concise", "accurate"],
            example: {
              original: "その判断のエビデンスを示してください。",
              rewritten: "その判断の根拠を示してください。",
            },
            recommendation: {
              level: "recommended",
              context: "会議やビジネス資料全般",
              rationale: "短く、主張を支える理由として自然に伝わる。",
            },
          },
          {
            text: "裏付け",
            fitContext: "施策や仮説の確からしさを示す場面",
            rationale: "証明しきる前段階の材料にも使いやすい。",
            labels: ["natural", "clear", "document_friendly"],
            example: {
              original: "提案にはエビデンスが不足している。",
              rewritten: "提案には裏付けが不足している。",
            },
          },
        ],
      },
      {
        title: "客観的な証拠",
        description: "事実を示す資料や記録。",
        domainSlug: "public",
        proposals: [
          {
            text: "証拠",
            fitContext: "調査、法務、監査、確認作業",
            rationale: "事実確認の材料として最も直接的。",
            labels: ["clear", "concise", "accurate"],
            example: {
              original: "監査に必要なエビデンスを保管する。",
              rewritten: "監査に必要な証拠を保管する。",
            },
            recommendation: {
              level: "limited",
              context: "監査や調査で事実性を強く示す場合",
              rationale: "法務・監査文脈では意味が明確。",
            },
          },
        ],
      },
    ],
  },
  {
    headword: "オンボーディング",
    slug: "onboarding",
    originalWord: "onboarding",
    summary: "新しく参加した人や利用者が、早く慣れて力を出せるようにする導入過程。",
    tags: ["人材", "企画"],
    senses: [
      {
        title: "新任者の受け入れ支援",
        description: "新人や異動者が組織になじむための支援。",
        domainSlug: "hr",
        proposals: [
          {
            text: "受け入れ支援",
            fitContext: "人事、新人研修、異動者支援",
            rationale: "組織側が行う支援の意味を自然に出せる。",
            labels: ["natural", "clear", "accurate"],
            example: {
              original: "新入社員のオンボーディングを改善する。",
              rewritten: "新入社員の受け入れ支援を改善する。",
            },
            recommendation: {
              level: "recommended",
              context: "人事や組織への参加",
              rationale: "単なる研修より広い支援を表せる。",
            },
          },
          {
            text: "慣熟支援",
            fitContext: "業務への習熟を重視する文脈",
            rationale: "短いが、やや硬い。",
            labels: ["accurate", "document_friendly", "too_stiff"],
            example: {
              original: "オンボーディング期間を設ける。",
              rewritten: "慣熟支援期間を設ける。",
            },
          },
        ],
      },
      {
        title: "利用開始時の案内",
        description: "サービスや製品を使い始める人への導入案内。",
        domainSlug: "it",
        proposals: [
          {
            text: "初期案内",
            fitContext: "アプリ、SaaS、会員登録後の導線",
            rationale: "利用開始直後に行う説明として分かりやすい。",
            labels: ["natural", "clear", "concise"],
            example: {
              original: "アプリのオンボーディングを短くする。",
              rewritten: "アプリの初期案内を短くする。",
            },
            recommendation: {
              level: "limited",
              context: "サービス利用開始時の説明",
              rationale: "画面や導線の話では自然に使える。",
            },
          },
        ],
      },
    ],
  },
  {
    headword: "アジェンダ",
    slug: "agenda",
    originalWord: "agenda",
    summary: "会議で扱う議題、進行順、検討項目。",
    tags: ["会議"],
    senses: [
      {
        title: "会議で扱う議題",
        description: "会議中に話し合う項目や順序。",
        domainSlug: "business",
        proposals: [
          {
            text: "議題",
            fitContext: "会議案内、議事録、社内連絡",
            rationale: "ほとんどの会議文脈ではこれで足りる。",
            labels: ["natural", "clear", "concise", "accurate"],
            example: {
              original: "本日のアジェンダを共有します。",
              rewritten: "本日の議題を共有します。",
            },
            recommendation: {
              level: "recommended",
              context: "会議の話し合い項目",
              rationale: "既存語として自然で、意味が過不足なく伝わる。",
            },
          },
          {
            text: "進行予定",
            fitContext: "順番や時間配分まで含める場合",
            rationale: "議題よりも進め方に重点がある。",
            labels: ["clear", "document_friendly"],
            example: {
              original: "アジェンダに沿って進めます。",
              rewritten: "進行予定に沿って進めます。",
            },
          },
        ],
      },
    ],
  },
  {
    headword: "サステナブル",
    slug: "sustainable",
    originalWord: "sustainable",
    summary: "環境・社会・経済の面で長く続けられる状態。",
    tags: ["社会", "広報"],
    senses: [
      {
        title: "長く続けられる",
        description: "環境や社会への負荷を抑えながら継続できること。",
        domainSlug: "public",
        proposals: [
          {
            text: "持続可能な",
            fitContext: "政策、環境、社会課題、企業報告",
            rationale: "定着した訳語で、正式文書でも使いやすい。",
            labels: ["clear", "accurate", "document_friendly"],
            example: {
              original: "サステナブルな社会を目指す。",
              rewritten: "持続可能な社会を目指す。",
            },
            recommendation: {
              level: "recommended",
              context: "政策、環境、企業報告",
              rationale: "既に広く使われる標準的な訳語。",
            },
          },
          {
            text: "長く続けられる",
            fitContext: "一般向け説明、生活者向け広報",
            rationale: "意味をほどいて伝える場合に分かりやすい。",
            labels: ["natural", "clear", "conversation_friendly"],
            example: {
              original: "サステナブルな取り組みを増やす。",
              rewritten: "長く続けられる取り組みを増やす。",
            },
          },
        ],
      },
    ],
  },
];

type SupplementalTerm = {
  headword: string;
  originalWord: string;
  summary: string;
  domainSlug: string;
  tags: string[];
  senseTitle: string;
  description: string;
  primary: string;
  secondary: string;
};

const supplementalTerms: SupplementalTerm[] = [
  ["インサイト", "insight", "行動や判断の奥にある気づきや理解。", "marketing", ["分析", "企画"], "深い気づき", "利用者や市場の背景にある理解。", "洞察", "気づき"],
  ["ナラティブ", "narrative", "物事を意味づける語りや筋立て。", "marketing", ["広報", "企画"], "語りの筋立て", "人や組織が共有する物語的な説明。", "語り", "物語構成"],
  ["コンセンサス", "consensus", "関係者の合意や納得。", "business", ["会議", "組織"], "合意", "複数人の意見がまとまった状態。", "合意", "共通理解"],
  ["スキーム", "scheme", "仕組みや計画の枠組み。", "business", ["企画"], "仕組み", "事業や制度を成り立たせる構造。", "仕組み", "枠組み"],
  ["ステークホルダー", "stakeholder", "事業や施策に関係する人や組織。", "business", ["組織"], "関係者", "影響を受ける、または影響を与える人々。", "関係者", "利害関係者"],
  ["ソリューション", "solution", "課題を解くための方法や製品。", "business", ["企画"], "解決策", "問題に対する具体的な手段。", "解決策", "解決手段"],
  ["プライオリティ", "priority", "優先して扱う度合い。", "business", ["会議"], "優先順位", "複数の選択肢の中で先に扱う順番。", "優先順位", "重要度"],
  ["ローンチ", "launch", "製品や企画を公開・開始すること。", "marketing", ["広報", "企画"], "公開開始", "新しいものを世に出すこと。", "公開開始", "提供開始"],
  ["アサイン", "assign", "人や作業を割り当てること。", "business", ["組織"], "割り当て", "担当や役割を決めること。", "割り当て", "担当指定"],
  ["タスク", "task", "行うべき作業。", "business", ["企画"], "作業", "具体的に処理する項目。", "作業", "対応項目"],
  ["ペンディング", "pending", "判断や対応を保留している状態。", "business", ["会議"], "保留", "まだ決めずに置いていること。", "保留", "未決"],
  ["リソース", "resource", "人員、時間、資金など使える資源。", "business", ["組織"], "資源", "目的達成に使えるもの。", "資源", "人手"],
  ["アライアンス", "alliance", "企業や組織間の協力関係。", "business", ["組織"], "提携", "目的を共有した協力関係。", "提携", "協業"],
  ["ブランディング", "branding", "ブランドの印象や価値を設計すること。", "marketing", ["広報"], "ブランドづくり", "商品や組織の見え方を整える活動。", "ブランドづくり", "印象設計"],
  ["パーパス", "purpose", "組織や活動の存在意義。", "business", ["組織"], "存在意義", "何のために存在するかという目的。", "存在意義", "目的"],
  ["バリュー", "value", "価値や大切にする行動基準。", "business", ["組織"], "価値基準", "組織が重んじる考え方。", "価値基準", "価値"],
  ["ミッション", "mission", "果たすべき役割や使命。", "business", ["組織"], "使命", "組織や個人が担う役目。", "使命", "役割"],
  ["ビジョン", "vision", "目指す将来像。", "business", ["組織"], "将来像", "実現したい未来の姿。", "将来像", "展望"],
  ["アジャイル", "agile", "短い周期で試しながら改善する進め方。", "it", ["開発"], "反復改善型", "変化に合わせて素早く進める方式。", "反復改善型", "機敏な開発"],
  ["ロードマップ", "roadmap", "目標までの道筋や計画表。", "business", ["企画"], "工程表", "今後の進め方を時間軸で示したもの。", "工程表", "道筋"],
  ["マイルストーン", "milestone", "計画上の重要な節目。", "business", ["企画"], "節目", "進行を確認する重要地点。", "節目", "中間目標"],
  ["KPI", "key performance indicator", "成果を測るための主要指標。", "business", ["分析"], "重要指標", "目標達成度を見るための指標。", "重要指標", "成果指標"],
  ["KGI", "key goal indicator", "最終目標の達成度を示す指標。", "business", ["分析"], "最終目標指標", "最終的な成果を見る指標。", "最終目標指標", "達成指標"],
  ["ROI", "return on investment", "投資に対する効果や収益。", "business", ["分析"], "投資効果", "投じた費用に対する成果。", "投資効果", "費用対効果"],
  ["UX", "user experience", "利用者が体験する使いやすさや印象。", "it", ["開発"], "利用体験", "使う過程全体で得られる体験。", "利用体験", "使い心地"],
  ["UI", "user interface", "利用者が操作する画面や接点。", "it", ["開発"], "操作画面", "人が機械やサービスを操作する接点。", "操作画面", "操作接点"],
  ["オンプレミス", "on-premises", "自社内に設備を置いて運用する方式。", "it", ["開発"], "自社運用", "外部クラウドではなく自前設備で動かすこと。", "自社運用", "社内設置"],
  ["クラウド", "cloud", "インターネット越しに使う計算資源。", "it", ["開発"], "外部計算基盤", "外部のサーバー資源を使う仕組み。", "クラウド", "外部基盤"],
  ["デプロイ", "deploy", "作ったものを利用可能な環境へ反映すること。", "it", ["開発"], "公開反映", "システムを動く場所へ配置すること。", "公開反映", "配備"],
  ["リリース", "release", "製品や機能を利用者に提供すること。", "it", ["開発", "広報"], "公開", "新しい機能や製品を使えるようにすること。", "公開", "提供開始"],
  ["インシデント", "incident", "事故や障害など対応が必要な出来事。", "it", ["開発"], "障害事案", "通常運用を妨げる出来事。", "障害事案", "問題発生"],
  ["レガシー", "legacy", "古くなった仕組みや資産。", "it", ["開発"], "旧式", "現在の要求に合わなくなったもの。", "旧式", "従来資産"],
  ["マイグレーション", "migration", "システムやデータを移行すること。", "it", ["開発"], "移行", "別の環境や方式へ移すこと。", "移行", "移設"],
  ["スケーラビリティ", "scalability", "規模拡大に対応できる性質。", "it", ["開発"], "拡張性", "利用増加に合わせて広げられる性質。", "拡張性", "規模対応力"],
  ["セキュリティ", "security", "情報や仕組みを守る性質や対策。", "it", ["開発"], "安全対策", "不正利用や漏えいを防ぐ取り組み。", "安全対策", "保護"],
  ["プライバシー", "privacy", "個人情報や私的領域を守ること。", "public", ["社会"], "個人情報保護", "個人に関する情報や権利を守ること。", "個人情報保護", "私的情報の保護"],
  ["アクセシビリティ", "accessibility", "誰でも利用しやすい状態。", "it", ["開発", "社会"], "利用しやすさ", "障害や環境に関係なく使えること。", "利用しやすさ", "利用可能性"],
  ["コンプライアンス", "compliance", "法令や規範を守ること。", "business", ["組織"], "法令遵守", "法律や社会規範に従うこと。", "法令遵守", "規範遵守"],
  ["ガバナンス", "governance", "組織を適切に統治する仕組み。", "business", ["組織"], "統治", "組織を管理し責任を果たす仕組み。", "統治", "管理体制"],
  ["アカウンタビリティ", "accountability", "説明する責任。", "public", ["組織"], "説明責任", "判断や行動について説明する責任。", "説明責任", "説明義務"],
  ["ダイバーシティ", "diversity", "多様な人や考えがある状態。", "hr", ["人材", "社会"], "多様性", "属性や考え方の違いがあること。", "多様性", "多様な人材"],
  ["インクルージョン", "inclusion", "多様な人が参加できる状態をつくること。", "hr", ["人材", "社会"], "包摂", "排除せず参加できるようにすること。", "包摂", "受け入れ"],
  ["リスキリング", "reskilling", "新しい職務に向けて学び直すこと。", "hr", ["人材"], "学び直し", "新しい仕事に必要な技能を身につけ直すこと。", "学び直し", "再技能習得"],
  ["アップスキリング", "upskilling", "現在の仕事に必要な技能を高めること。", "hr", ["人材"], "技能向上", "今の職務に関わる能力を伸ばすこと。", "技能向上", "能力強化"],
  ["キャリアパス", "career path", "職業上の成長や異動の道筋。", "hr", ["人材"], "職業上の道筋", "働き方や職務の将来経路。", "職業上の道筋", "成長経路"],
  ["メンタリング", "mentoring", "経験者が助言し成長を支えること。", "hr", ["人材"], "助言支援", "経験者による継続的な支援。", "助言支援", "指導支援"],
  ["コーチング", "coaching", "問いかけで自発的な成長を促す支援。", "hr", ["人材"], "伴走支援", "相手の行動や考えを引き出す支援。", "伴走支援", "対話支援"],
  ["フィードバック", "feedback", "行動や成果への反応や助言。", "business", ["組織"], "反応と助言", "改善のために返す意見。", "反応と助言", "返答"],
  ["サーベイ", "survey", "意見や状態を調べる調査。", "business", ["分析"], "調査", "質問などで実態を把握すること。", "調査", "聞き取り"],
  ["アセスメント", "assessment", "状態や能力を評価すること。", "business", ["分析"], "評価", "基準に照らして測ること。", "評価", "査定"],
  ["レビュー", "review", "内容を確認し評価すること。", "business", ["会議"], "確認", "成果物や進捗を見直すこと。", "確認", "見直し"],
  ["モニタリング", "monitoring", "状態を継続して見守ること。", "business", ["分析"], "継続監視", "変化を見続けること。", "継続監視", "見守り"],
  ["トラッキング", "tracking", "動きや経過を追跡すること。", "marketing", ["分析"], "追跡", "行動や数値の変化を追うこと。", "追跡", "経過把握"],
  ["セグメント", "segment", "共通点で分けた集団や区分。", "marketing", ["分析"], "区分", "市場や利用者を分けたまとまり。", "区分", "分類群"],
  ["ターゲット", "target", "狙う対象。", "marketing", ["企画"], "対象", "施策や商品が向けられる相手。", "対象", "狙い先"],
  ["ペルソナ", "persona", "想定する利用者像。", "marketing", ["企画"], "想定利用者像", "代表的な利用者を具体化した像。", "想定利用者像", "利用者像"],
  ["カスタマージャーニー", "customer journey", "顧客が認知から利用まで進む過程。", "marketing", ["企画"], "顧客行程", "顧客が体験する流れ。", "顧客行程", "利用者の道筋"],
  ["リード", "lead", "見込み客。", "marketing", ["広報"], "見込み客", "将来顧客になる可能性がある相手。", "見込み客", "見込み先"],
  ["コンバージョン", "conversion", "狙った行動が達成されること。", "marketing", ["分析"], "成果達成", "購入や登録など目標行動に至ること。", "成果達成", "転換"],
  ["ファネル", "funnel", "顧客が段階的に絞られていく構造。", "marketing", ["分析"], "段階構造", "認知から購入までの段階。", "段階構造", "絞り込み過程"],
  ["チャネル", "channel", "情報や商品を届ける経路。", "marketing", ["広報"], "経路", "顧客に届くための道筋。", "経路", "接点"],
  ["タッチポイント", "touchpoint", "顧客との接点。", "marketing", ["広報"], "接点", "利用者が商品や組織に触れる場面。", "接点", "接触点"],
  ["オウンドメディア", "owned media", "自社が持つ発信媒体。", "marketing", ["広報"], "自社媒体", "自分たちで管理する情報発信先。", "自社媒体", "自前媒体"],
  ["キャンペーン", "campaign", "一定期間行う宣伝や施策。", "marketing", ["広報"], "販促施策", "目的を持って集中的に行う活動。", "販促施策", "宣伝企画"],
  ["プロモーション", "promotion", "認知や販売を促す活動。", "marketing", ["広報"], "販売促進", "商品やサービスを広める活動。", "販売促進", "宣伝"],
  ["インフルエンサー", "influencer", "発信で人に影響を与える人。", "marketing", ["広報"], "影響力のある発信者", "人々の判断に影響する発信者。", "影響力のある発信者", "有力発信者"],
  ["バズ", "buzz", "話題が急に広がること。", "sns", ["広報"], "話題化", "多くの人に短期間で広がること。", "話題化", "急拡散"],
  ["フォロワー", "follower", "SNSで投稿を受け取る登録者。", "sns", ["広報"], "読者", "継続的に投稿を見る人。", "読者", "登録者"],
  ["アカウント", "account", "サービス上の利用者登録や口座。", "it", ["開発"], "利用者登録", "サービスを使うための登録単位。", "利用者登録", "登録情報"],
  ["プロフィール", "profile", "人物や組織の紹介情報。", "sns", ["広報"], "紹介情報", "その人や組織を説明する情報。", "紹介情報", "人物情報"],
  ["タイムライン", "timeline", "投稿などが時間順に並ぶ画面。", "sns", ["広報"], "時系列表示", "時間の順に情報が流れる表示。", "時系列表示", "投稿一覧"],
  ["アルゴリズム", "algorithm", "処理や判断の手順。", "it", ["開発"], "処理手順", "問題を解くための決まった手順。", "処理手順", "算法"],
  ["データドリブン", "data-driven", "データに基づいて判断すること。", "business", ["分析"], "データに基づく", "経験だけでなく数値や事実を使うこと。", "データに基づく", "資料重視"],
  ["ビッグデータ", "big data", "大量で多様なデータ。", "it", ["分析"], "大量データ", "分析に使う大規模なデータ群。", "大量データ", "大規模データ"],
  ["ダッシュボード", "dashboard", "重要情報を一覧する画面。", "it", ["分析"], "一覧画面", "状態や数値をまとめて見る画面。", "一覧画面", "管理画面"],
  ["メトリクス", "metrics", "測定された数値指標。", "business", ["分析"], "指標", "状態や成果を測る数値。", "指標", "測定値"],
  ["ログ", "log", "操作や処理の記録。", "it", ["開発"], "記録", "あとから確認するために残す情報。", "記録", "履歴"],
  ["バックアップ", "backup", "失った時に戻すための複製。", "it", ["開発"], "予備保存", "復旧のために別に保存すること。", "予備保存", "控え"],
  ["リカバリー", "recovery", "障害や失敗から回復すること。", "it", ["開発"], "復旧", "元の状態に戻すこと。", "復旧", "回復"],
  ["フェイルオーバー", "failover", "障害時に予備へ切り替えること。", "it", ["開発"], "予備切替", "止まった時に別系統へ切り替えること。", "予備切替", "障害時切替"],
  ["レプリケーション", "replication", "同じデータを複製して同期すること。", "it", ["開発"], "複製同期", "複数箇所に同じ情報を持たせること。", "複製同期", "複製"],
  ["キャッシュ", "cache", "再利用のため一時保存すること。", "it", ["開発"], "一時保存", "速く使うために一時的に保存すること。", "一時保存", "控え保存"],
  ["レイテンシ", "latency", "反応までの遅れ。", "it", ["開発"], "遅延", "要求から応答までにかかる時間。", "遅延", "待ち時間"],
  ["スループット", "throughput", "一定時間に処理できる量。", "it", ["開発"], "処理量", "時間あたりに扱える量。", "処理量", "処理能力"],
  ["オブザーバビリティ", "observability", "内部状態を外から把握できる性質。", "it", ["開発"], "可観測性", "システムの状態を調べやすい性質。", "可観測性", "状態把握性"],
  ["サブスクリプション", "subscription", "継続利用に対して定期的に支払う方式。", "business", ["企画"], "定額利用", "定期契約で使い続けること。", "定額利用", "継続契約"],
  ["フリーミアム", "freemium", "無料版と有料版を組み合わせる方式。", "business", ["企画"], "基本無料", "一部無料で有料機能を用意する方式。", "基本無料", "無料有料併用"],
  ["マネタイズ", "monetize", "収益化すること。", "business", ["企画"], "収益化", "価値を収入につなげること。", "収益化", "収入化"],
  ["グロース", "growth", "事業やサービスを成長させること。", "business", ["分析"], "成長", "利用や収益を伸ばすこと。", "成長", "拡大"],
  ["ピボット", "pivot", "方針や事業の軸を変えること。", "business", ["企画"], "方向転換", "学びを踏まえて進路を変えること。", "方向転換", "軸足変更"],
  ["スプリント", "sprint", "短期間で作業を進める区切り。", "it", ["開発"], "短期作業期間", "短い周期で決めた作業期間。", "短期作業期間", "反復期間"],
  ["バックログ", "backlog", "未着手や未処理の作業一覧。", "it", ["開発"], "未処理一覧", "これから扱う作業の一覧。", "未処理一覧", "作業残"],
  ["スタンドアップ", "standup", "短時間の進捗確認会。", "it", ["会議"], "朝会", "短く状況を共有する会議。", "朝会", "進捗確認会"],
  ["レトロスペクティブ", "retrospective", "振り返り。", "it", ["会議"], "振り返り", "作業後に学びや改善点を確認すること。", "振り返り", "事後確認"],
  ["ブレスト", "brainstorming", "自由に案を出すこと。", "business", ["会議"], "案出し", "評価を急がず発想を出すこと。", "案出し", "発想会議"],
  ["ファシリテーション", "facilitation", "話し合いを進めやすくする支援。", "business", ["会議"], "進行支援", "参加者が話しやすいよう進めること。", "進行支援", "会議進行"],
  ["アイスブレイク", "icebreak", "場を和ませる導入。", "business", ["会議"], "場ほぐし", "話し始めやすくする短い導入。", "場ほぐし", "緊張ほぐし"],
  ["クロージング", "closing", "商談や議論を締めること。", "business", ["会議"], "締め", "話や取引をまとめること。", "締め", "最終確認"],
  ["ネクストアクション", "next action", "次に行う具体的な行動。", "business", ["会議"], "次の行動", "会議後に行う作業。", "次の行動", "次回対応"],
  ["アクションアイテム", "action item", "実行すべき具体的な項目。", "business", ["会議"], "実行項目", "担当と期限を持つ作業。", "実行項目", "対応項目"],
  ["ボトルネック", "bottleneck", "全体を遅らせる制約箇所。", "business", ["分析"], "詰まり", "流れを妨げている部分。", "詰まり", "制約箇所"],
  ["ペインポイント", "pain point", "利用者や顧客が困っている点。", "marketing", ["分析"], "困りごと", "不満や不便を感じる箇所。", "困りごと", "不満点"],
  ["ユースケース", "use case", "具体的な利用場面。", "it", ["企画"], "利用場面", "誰が何のために使うかの例。", "利用場面", "使用例"],
  ["プロトタイプ", "prototype", "試作版。", "it", ["開発"], "試作", "本番前に作る確認用の形。", "試作", "試作品"],
  ["モックアップ", "mockup", "見た目を確認するための模型。", "it", ["開発"], "画面模型", "完成前に見た目を示すもの。", "画面模型", "見本"],
  ["ワイヤーフレーム", "wireframe", "画面構成の骨組み。", "it", ["開発"], "画面設計図", "配置や構造を示す下書き。", "画面設計図", "骨組み図"],
  ["インタラクション", "interaction", "利用者と画面のやり取り。", "it", ["開発"], "やり取り", "操作と反応の関係。", "やり取り", "相互作用"],
  ["レスポンシブ", "responsive", "画面幅に応じて表示が変わること。", "it", ["開発"], "画面幅対応", "端末に合わせて見せ方を変えること。", "画面幅対応", "可変表示"],
  ["パフォーマンス", "performance", "処理速度や効率。", "it", ["分析"], "性能", "速さや効率の度合い。", "性能", "処理効率"],
  ["ユーザビリティ", "usability", "使いやすさ。", "it", ["開発"], "使いやすさ", "迷わず使える度合い。", "使いやすさ", "利用容易性"],
  ["オペレーション", "operation", "業務運用や手順。", "business", ["組織"], "運用", "日々の業務を回すこと。", "運用", "業務手順"],
  ["オンサイト", "on-site", "現地で行うこと。", "business", ["組織"], "現地対応", "その場所に行って対応すること。", "現地対応", "現場対応"],
  ["リモート", "remote", "離れた場所から行うこと。", "business", ["組織"], "遠隔", "現地にいない状態で行うこと。", "遠隔", "離れた場所から"],
  ["ハイブリッド", "hybrid", "複数方式を組み合わせること。", "business", ["組織"], "併用型", "二つ以上の方式を混ぜること。", "併用型", "混合型"],
].map(([headword, originalWord, summary, domainSlug, tags, senseTitle, description, primary, secondary]) => ({
  headword,
  originalWord,
  summary,
  domainSlug,
  tags,
  senseTitle,
  description,
  primary,
  secondary,
})) as SupplementalTerm[];

function supplementalToSeedTerm(term: SupplementalTerm, index: number): SeedTerm {
  return {
    headword: term.headword,
    slug: `term-${index + 1}-${normalizeForSearch(term.headword)}`,
    originalWord: term.originalWord,
    summary: term.summary,
    tags: term.tags,
    senses: [
      {
        title: term.senseTitle,
        description: term.description,
        domainSlug: term.domainSlug,
        proposals: [
          {
            text: term.primary,
            fitContext: "一般向け説明、社内文書、公開資料",
            rationale: "既存の日本語として意味を推測しやすい。",
            labels: ["natural", "clear", "accurate"],
            example: {
              original: `${term.headword}を確認する。`,
              rewritten: `${term.primary}を確認する。`,
            },
            recommendation: {
              level: "tentative",
              context: "一般的な言い換え",
              rationale: "初期候補として意味が伝わりやすい。",
            },
          },
          {
            text: term.secondary,
            fitContext: "文書で少し硬めに表したい場面",
            rationale: "短く整理できるが、文脈によって硬く感じる場合がある。",
            register: "formal",
            labels: ["clear", "document_friendly"],
            example: {
              original: `${term.headword}を見直す。`,
              rewritten: `${term.secondary}を見直す。`,
            },
          },
        ],
      },
    ],
  };
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL ?? "";
  const isPostgres = databaseUrl.startsWith("postgresql://") || databaseUrl.startsWith("postgres://");
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@example.com";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "change-me-admin-password";
  const reservedEmailDomainPattern = /@(example\.(com|net|org)|.+\.(test|invalid|example|localhost|local))$/i;

  if (isPostgres) {
    if (!process.env.ADMIN_EMAIL || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail) || reservedEmailDomainPattern.test(adminEmail)) {
      throw new Error("PostgreSQLへのseedには本番用のADMIN_EMAILが必要です。");
    }
    if (!process.env.ADMIN_PASSWORD || adminPassword.length < 16 || adminPassword === "change-me-admin-password") {
      throw new Error("PostgreSQLへのseedには16文字以上の強いADMIN_PASSWORDが必要です。");
    }
  }

  const [existingUsers, existingTerms] = await Promise.all([prisma.user.count(), prisma.term.count()]);
  if (existingUsers > 0 || existingTerms > 0) {
    console.log(`Seed skipped: database is not empty (users=${existingUsers}, terms=${existingTerms}).`);
    return;
  }

  const admin = await prisma.user.create({
    data: {
      displayName: "管理者",
      handle: "admin",
      email: adminEmail,
      passwordHash: hashPassword(adminPassword),
      role: "admin",
      reputation: 120,
    },
  });
  const editor = await prisma.user.create({
    data: {
      displayName: "編集者",
      handle: "editor",
      email: isPostgres ? null : "editor@example.com",
      passwordHash: isPostgres ? null : hashPassword("change-me-editor-password"),
      role: "editor",
      reputation: 90,
    },
  });
  const writer = await prisma.user.create({
    data: {
      displayName: "提案者",
      handle: "writer",
      email: isPostgres ? null : "writer@example.com",
      passwordHash: isPostgres ? null : hashPassword("change-me-writer-password"),
      role: "user",
      reputation: 24,
    },
  });
  await prisma.user.create({
    data: {
      displayName: "読者",
      handle: "reader",
      email: isPostgres ? null : "reader@example.com",
      passwordHash: isPostgres ? null : hashPassword("change-me-reader-password"),
      role: "user",
      reputation: 3,
    },
  });

  const domainMap = new Map<string, string>();
  for (const [slug, name] of domains) {
    const domain = await prisma.domain.create({
      data: {
        slug,
        name,
        description: `${name}文脈の訳語候補`,
      },
    });
    domainMap.set(slug, domain.id);
  }

  const tagMap = new Map<string, string>();
  for (const name of tagNames) {
    const tag = await prisma.tag.create({
      data: {
        slug: normalizeForSearch(name),
        name,
      },
    });
    tagMap.set(name, tag.id);
  }

  const allTerms = [...terms, ...supplementalTerms.map(supplementalToSeedTerm)];

  for (const termSeed of allTerms) {
    const term = await prisma.term.create({
      data: {
        headword: termSeed.headword,
        slug: termSeed.slug,
        normalizedHeadword: normalizeForSearch(termSeed.headword),
        originalWord: termSeed.originalWord,
        summary: termSeed.summary,
        createdById: editor.id,
      },
    });

    await prisma.revision.create({
      data: {
        entityType: "term",
        entityId: term.id,
        afterJson: JSON.stringify({ headword: term.headword, summary: term.summary }),
        reason: "初期データ投入",
        createdById: admin.id,
      },
    });

    for (const [senseIndex, senseSeed] of termSeed.senses.entries()) {
      const sense = await prisma.sense.create({
        data: {
          termId: term.id,
          domainId: domainMap.get(senseSeed.domainSlug),
          title: senseSeed.title,
          description: senseSeed.description,
          order: senseIndex,
          createdById: editor.id,
          tags: {
            create: termSeed.tags.map((tagName) => ({
              tag: {
                connect: {
                  id: tagMap.get(tagName),
                },
              },
            })),
          },
        },
      });

      for (const proposalSeed of senseSeed.proposals) {
        const proposal = await prisma.translationProposal.create({
          data: {
            senseId: sense.id,
            text: proposalSeed.text,
            fitContext: proposalSeed.fitContext,
            unfitContext: proposalSeed.unfitContext,
            rationale: proposalSeed.rationale,
            register: proposalSeed.register ?? "neutral",
            status: proposalSeed.recommendation?.level ?? "active",
            createdById: writer.id,
          },
        });

        const example = await prisma.usageExample.create({
          data: {
            termId: term.id,
            senseId: sense.id,
            proposalId: proposal.id,
            originalSentence: proposalSeed.example.original,
            rewrittenSentence: proposalSeed.example.rewritten,
            contextNote: proposalSeed.example.note,
            createdById: writer.id,
          },
        });

        await prisma.evaluation.create({
          data: {
            proposalId: proposal.id,
            userId: editor.id,
            labelsCsv: joinLabels(proposalSeed.labels),
          },
        });

        if (proposalSeed.recommendation) {
          await prisma.recommendation.create({
            data: {
              senseId: sense.id,
              proposalId: proposal.id,
              level: proposalSeed.recommendation.level,
              context: proposalSeed.recommendation.context,
              rationale: proposalSeed.recommendation.rationale,
              representativeExampleId: example.id,
              decidedById: editor.id,
            },
          });
        }
      }
    }
  }

  await prisma.comment.create({
    data: {
      proposalId: (
        await prisma.translationProposal.findFirstOrThrow({
          where: { text: "反応度" },
        })
      ).id,
      userId: writer.id,
      category: "usage",
      body: "SNSの数字を見る場面では自然だが、人事の話では意味が狭くなりすぎる。",
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
