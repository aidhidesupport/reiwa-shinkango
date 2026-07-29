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
        title: "職務熱意と組織愛着",
        description: "従業員が組織に前向きに関わる心理的な状態。",
        domainSlug: "hr",
        proposals: [
          {
            text: "熱意度",
            fitContext: "人事施策、従業員調査、組織改善",
            rationale: "仕事に向ける活力、熱意、没頭の強さを、漢字三字で簡潔に示せる。",
            labels: ["natural", "clear", "accurate", "conversation_friendly"],
            example: {
              original: "社員のエンゲージメントを高める。",
              rewritten: "社員の熱意度を高める。",
            },
            recommendation: {
              level: "recommended",
              context: "従業員向けの説明や人事施策",
              rationale: "一般の社員にも分かりやすく、施策の目的が伝わる。",
            },
          },
          {
            text: "愛着度",
            fitContext: "離職防止、組織調査、経営資料",
            rationale: "組織への心理的な結びつきの強さを、漢字三字で簡潔に示せる。",
            register: "formal",
            labels: ["clear", "accurate", "document_friendly"],
            example: {
              original: "エンゲージメントサーベイを実施する。",
              rewritten: "組織への愛着度を測る調査を実施する。",
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
  ["タスク", "task", "行うべき作業。", "business", ["企画"], "作業", "具体的に処理する項目。", "作業", "作業項目"],
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
  ["クラウド", "cloud", "インターネット越しに使う計算資源。", "it", ["開発"], "外部計算基盤", "外部のサーバー資源を使う仕組み。", "外部計算基盤", "ネット経由の計算環境"],
  ["デプロイ", "deploy", "作ったものを利用可能な環境へ反映すること。", "it", ["開発"], "公開反映", "システムを動く場所へ配置すること。", "公開反映", "配備"],
  ["リリース", "release", "製品や機能を利用者に提供すること。", "it", ["開発", "広報"], "公開", "新しい機能や製品を使えるようにすること。", "公開", "提供"],
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
  ["チャネル", "channel", "情報や商品を届ける経路。", "marketing", ["広報"], "経路", "顧客に届くための道筋。", "経路", "受付経路"],
  ["タッチポイント", "touchpoint", "顧客との接点。", "marketing", ["広報"], "接点", "利用者が商品や組織に触れる場面。", "接点", "接触点"],
  ["オウンドメディア", "owned media", "自社が持つ発信媒体。", "marketing", ["広報"], "自社媒体", "自分たちで管理する情報発信先。", "自社媒体", "自前媒体"],
  ["キャンペーン", "campaign", "一定期間行う宣伝や施策。", "marketing", ["広報"], "販促施策", "目的を持って集中的に行う活動。", "販促施策", "宣伝企画"],
  ["プロモーション", "promotion", "認知や販売を促す活動。", "marketing", ["広報"], "販売促進", "商品やサービスを広める活動。", "販売促進", "宣伝"],
  ["インフルエンサー", "influencer", "発信で人に影響を与える人。", "marketing", ["広報"], "影響力のある発信者", "人々の判断に影響する発信者。", "影響力のある発信者", "人を動かす発信者"],
  ["バズ", "buzz", "話題が急に広がること。", "sns", ["広報"], "話題化", "多くの人に短期間で広がること。", "話題化", "急拡散"],
  ["フォロワー", "follower", "SNSで投稿を受け取る登録者。", "sns", ["広報"], "読者", "継続的に投稿を見る人。", "読者", "登録者"],
  ["アカウント", "account", "サービス上の利用者登録や口座。", "it", ["開発"], "利用者登録", "サービスを使うための登録単位。", "利用者登録", "登録情報"],
  ["プロフィール", "profile", "人物や組織の紹介情報。", "sns", ["広報"], "紹介情報", "その人や組織を説明する情報。", "紹介情報", "人物情報"],
  ["タイムライン", "timeline", "投稿などが時間順に並ぶ画面。", "sns", ["広報"], "時系列表示", "時間の順に情報が流れる表示。", "時系列表示", "投稿一覧"],
  ["アルゴリズム", "algorithm", "処理や判断の手順。", "it", ["開発"], "処理手順", "問題を解くための決まった手順。", "処理手順", "計算手順"],
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
  ["オブザーバビリティ", "observability", "内部状態を外から把握できる性質。", "it", ["開発"], "可観測性", "システムの状態を調べやすい性質。", "可観測性", "状態の調べやすさ"],
  ["サブスクリプション", "subscription", "継続利用に対して定期的に支払う方式。", "business", ["企画"], "定額利用", "定期契約で使い続けること。", "定額利用", "継続契約"],
  ["フリーミアム", "freemium", "無料版と有料版を組み合わせる方式。", "business", ["企画"], "基本無料", "一部無料で有料機能を用意する方式。", "基本無料", "無料有料併用"],
  ["マネタイズ", "monetize", "収益化すること。", "business", ["企画"], "収益化", "価値を収入につなげること。", "収益化", "収益につなげる"],
  ["グロース", "growth", "事業やサービスを成長させること。", "business", ["分析"], "成長", "利用や収益を伸ばすこと。", "成長", "拡大"],
  ["ピボット", "pivot", "方針や事業の軸を変えること。", "business", ["企画"], "方向転換", "学びを踏まえて進路を変えること。", "方向転換", "軸足変更"],
  ["スプリント", "sprint", "短期間で作業を進める区切り。", "it", ["開発"], "短期作業期間", "短い周期で決めた作業期間。", "短期作業期間", "反復期間"],
  ["バックログ", "backlog", "未着手や未処理の作業一覧。", "it", ["開発"], "未処理一覧", "これから扱う作業の一覧。", "未処理一覧", "作業残"],
  ["スタンドアップ", "standup", "短時間の進捗確認会。", "it", ["会議"], "朝会", "短く状況を共有する会議。", "朝会", "進捗確認会"],
  ["レトロスペクティブ", "retrospective", "振り返り。", "it", ["会議"], "振り返り", "作業後に学びや改善点を確認すること。", "振り返り", "事後確認"],
  ["ブレスト", "brainstorming", "自由に案を出すこと。", "business", ["会議"], "案出し", "評価を急がず発想を出すこと。", "案出し", "発想会議"],
  ["ファシリテーション", "facilitation", "話し合いを進めやすくする支援。", "business", ["会議"], "進行支援", "参加者が話しやすいよう進めること。", "進行支援", "会議進行"],
  ["アイスブレイク", "icebreak", "場を和ませる導入。", "business", ["会議"], "場を和ませる導入", "話し始めやすくする短い導入。", "場を和ませる導入", "緊張ほぐし"],
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

type SupplementalExamplePair = {
  primary: SeedProposal["example"];
  secondary: SeedProposal["example"];
};

const supplementalExampleOverrides: Record<string, SupplementalExamplePair> = {
  "コンセンサス": {
    primary: {
      original: "関係部署とのコンセンサスを得てから計画を進める。",
      rewritten: "関係部署との合意を得てから計画を進める。",
      note: "関係部署との調整",
    },
    secondary: {
      original: "会議で目標についてコンセンサスを形成した。",
      rewritten: "会議で目標について共通理解を形成した。",
      note: "会議",
    },
  },
  "スキーム": {
    primary: {
      original: "地域で資金を循環させるスキームを作る。",
      rewritten: "地域で資金を循環させる仕組みを作る。",
      note: "事業説明",
    },
    secondary: {
      original: "新しい支援スキームを来年度から導入する。",
      rewritten: "新しい支援の枠組みを来年度から導入する。",
      note: "制度資料",
    },
  },
  "ステークホルダー": {
    primary: {
      original: "事業のステークホルダーに方針を説明する。",
      rewritten: "事業の関係者に方針を説明する。",
      note: "事業説明",
    },
    secondary: {
      original: "開発前にステークホルダーへの影響を調べる。",
      rewritten: "開発前に利害関係者への影響を調べる。",
      note: "影響評価",
    },
  },
  "ソリューション": {
    primary: {
      original: "現場の課題に合うソリューションを検討する。",
      rewritten: "現場の課題に合う解決策を検討する。",
      note: "企画会議",
    },
    secondary: {
      original: "複数のソリューションを比較して導入を決める。",
      rewritten: "複数の解決手段を比較して導入を決める。",
      note: "選定資料",
    },
  },
  "プライオリティ": {
    primary: {
      original: "問い合わせ対応のプライオリティを決める。",
      rewritten: "問い合わせ対応の優先順位を決める。",
      note: "業務整理",
    },
    secondary: {
      original: "利用者からの要望ごとにプライオリティを付ける。",
      rewritten: "利用者からの要望ごとに重要度を付ける。",
      note: "要望一覧",
    },
  },
  "ローンチ": {
    primary: {
      original: "新サービスのローンチは来月を予定している。",
      rewritten: "新サービスの公開開始は来月を予定している。",
      note: "公開計画",
    },
    secondary: {
      original: "新機能を国内で先行ローンチした。",
      rewritten: "新機能の提供を国内で先行して開始した。",
      note: "提供地域の説明",
    },
  },
  "アサイン": {
    primary: {
      original: "田中さんを調査担当にアサインした。",
      rewritten: "田中さんを調査担当に割り当てた。",
      note: "担当決め",
    },
    secondary: {
      original: "緊急案件に経験者をアサインする。",
      rewritten: "緊急案件の担当に経験者を指定する。",
      note: "体制表",
    },
  },
  "タスク": {
    primary: {
      original: "今日中に終えるタスクを確認する。",
      rewritten: "今日中に終える作業を確認する。",
      note: "日々の進捗確認",
    },
    secondary: {
      original: "会議後のタスクを一覧にまとめた。",
      rewritten: "会議後の作業項目を一覧にまとめた。",
      note: "議事録",
    },
  },
  "ペンディング": {
    primary: {
      original: "予算が決まるまで採用判断をペンディングにする。",
      rewritten: "予算が決まるまで採用判断を保留にする。",
      note: "判断の延期",
    },
    secondary: {
      original: "契約条件の一部がペンディングのままだ。",
      rewritten: "契約条件の一部が未決のままだ。",
      note: "契約確認",
    },
  },
  "リソース": {
    primary: {
      original: "限られたリソースを重点事業に配分する。",
      rewritten: "限られた資源を重点事業に配分する。",
      note: "経営計画",
    },
    secondary: {
      original: "繁忙期は受付のリソースが足りない。",
      rewritten: "繁忙期は受付の人手が足りない。",
      note: "人員配置",
    },
  },
  "アライアンス": {
    primary: {
      original: "海外企業とのアライアンスを発表した。",
      rewritten: "海外企業との提携を発表した。",
      note: "広報発表",
    },
    secondary: {
      original: "地域企業とアライアンスを組んで商品を開発する。",
      rewritten: "地域企業と協業して商品を開発する。",
      note: "共同事業",
    },
  },
  "パーパス": {
    primary: {
      original: "自社のパーパスを言葉にする。",
      rewritten: "自社の存在意義を言葉にする。",
      note: "組織方針",
    },
    secondary: {
      original: "この活動のパーパスを社員に説明する。",
      rewritten: "この活動の目的を社員に説明する。",
      note: "社内説明",
    },
  },
  "バリュー": {
    primary: {
      original: "採用面接でも会社のバリューを重視する。",
      rewritten: "採用面接でも会社の価値基準を重視する。",
      note: "採用方針",
    },
    secondary: {
      original: "サービスが利用者に提供するバリューを見直す。",
      rewritten: "サービスが利用者に提供する価値を見直す。",
      note: "サービス改善",
    },
  },
  "ミッション": {
    primary: {
      original: "私たちのミッションは地域医療を支えることだ。",
      rewritten: "私たちの使命は地域医療を支えることだ。",
      note: "組織紹介",
    },
    secondary: {
      original: "この部署のミッションを明確にする。",
      rewritten: "この部署の役割を明確にする。",
      note: "組織図",
    },
  },
  "ビジョン": {
    primary: {
      original: "社員と十年後のビジョンを共有する。",
      rewritten: "社員と十年後の将来像を共有する。",
      note: "中長期計画",
    },
    secondary: {
      original: "事業のビジョンを計画書に示す。",
      rewritten: "事業の展望を計画書に示す。",
      note: "事業計画",
    },
  },
  "ロードマップ": {
    primary: {
      original: "開発ロードマップに各機能の公開時期を示す。",
      rewritten: "開発工程表に各機能の公開時期を示す。",
      note: "開発計画",
    },
    secondary: {
      original: "目標達成までのロードマップを描く。",
      rewritten: "目標達成までの道筋を描く。",
      note: "計画説明",
    },
  },
  "マイルストーン": {
    primary: {
      original: "創業十周年を次のマイルストーンとする。",
      rewritten: "創業十周年を次の節目とする。",
      note: "中長期計画",
    },
    secondary: {
      original: "計画に四半期ごとのマイルストーンを置く。",
      rewritten: "計画に四半期ごとの中間目標を置く。",
      note: "進捗管理",
    },
  },
  "KPI": {
    primary: {
      original: "来期のKPIを三つに絞る。",
      rewritten: "来期の重要指標を三つに絞る。",
      note: "目標設定",
    },
    secondary: {
      original: "KPIの推移を毎月確認する。",
      rewritten: "成果指標の推移を毎月確認する。",
      note: "月次報告",
    },
  },
  "KGI": {
    primary: {
      original: "売上目標をKGIとして設定する。",
      rewritten: "売上目標を最終目標指標として設定する。",
      note: "目標設定",
    },
    secondary: {
      original: "KGIを達成するためにKPIを見直す。",
      rewritten: "達成指標を満たすために重要指標を見直す。",
      note: "指標の見直し",
    },
  },
  "ROI": {
    primary: {
      original: "新設備のROIを試算する。",
      rewritten: "新設備の投資効果を試算する。",
      note: "投資判断",
    },
    secondary: {
      original: "広告施策のROIが低下した。",
      rewritten: "広告施策の費用対効果が低下した。",
      note: "施策評価",
    },
  },
  "アジャイル": {
    primary: {
      original: "新規サービスはアジャイルで開発する。",
      rewritten: "新規サービスは反復改善型で開発する。",
      note: "開発方針",
    },
    secondary: {
      original: "要件の変化に対応するためアジャイルを採用した。",
      rewritten: "要件の変化に対応するため機敏な開発を採用した。",
      note: "開発手法の説明",
    },
  },
  "UX": {
    primary: {
      original: "申し込み画面のUXを改善する。",
      rewritten: "申し込み画面の利用体験を改善する。",
      note: "画面改善",
    },
    secondary: {
      original: "新しい端末のUXを利用者に聞いた。",
      rewritten: "新しい端末の使い心地を利用者に聞いた。",
      note: "利用者調査",
    },
  },
  "UI": {
    primary: {
      original: "管理者向けUIを刷新した。",
      rewritten: "管理者向け操作画面を刷新した。",
      note: "画面改修",
    },
    secondary: {
      original: "音声を使った新しいUIを設計する。",
      rewritten: "音声を使った新しい操作接点を設計する。",
      note: "製品設計",
    },
  },
  "オンプレミス": {
    primary: {
      original: "機密情報はオンプレミスで管理する。",
      rewritten: "機密情報は自社運用で管理する。",
      note: "情報管理方針",
    },
    secondary: {
      original: "基幹システムをオンプレミスから移行する。",
      rewritten: "社内設置の基幹システムから移行する。",
      note: "移行計画",
    },
  },
  "クラウド": {
    primary: {
      original: "画像処理をクラウドで実行する。",
      rewritten: "画像処理を外部計算基盤で実行する。",
      note: "システム構成",
    },
    secondary: {
      original: "災害時はクラウド上の環境へ切り替える。",
      rewritten: "災害時はネット経由の計算環境へ切り替える。",
      note: "災害対策",
    },
  },
  "デプロイ": {
    primary: {
      original: "修正済みのプログラムを本番環境へデプロイする。",
      rewritten: "修正済みのプログラムを本番環境へ公開反映する。",
      note: "本番反映",
    },
    secondary: {
      original: "新しい版を各サーバーへデプロイした。",
      rewritten: "新しい版を各サーバーへ配備した。",
      note: "運用報告",
    },
  },
  "リリース": {
    primary: {
      original: "修正版を今夜リリースする。",
      rewritten: "修正版を今夜公開する。",
      note: "公開予定",
    },
    secondary: {
      original: "新機能を全利用者にリリースした。",
      rewritten: "新機能を全利用者に提供した。",
      note: "機能提供",
    },
  },
  "インシデント": {
    primary: {
      original: "決済停止を重大インシデントとして扱う。",
      rewritten: "決済停止を重大な障害事案として扱う。",
      note: "障害対応",
    },
    secondary: {
      original: "インシデントの原因と影響範囲を報告する。",
      rewritten: "問題発生の原因と影響範囲を報告する。",
      note: "障害報告",
    },
  },
  "レガシー": {
    primary: {
      original: "レガシーな認証方式を廃止する。",
      rewritten: "旧式の認証方式を廃止する。",
      note: "技術更新",
    },
    secondary: {
      original: "レガシーを活用しながら新環境へ移行する。",
      rewritten: "従来資産を活用しながら新環境へ移行する。",
      note: "移行方針",
    },
  },
  "マイグレーション": {
    primary: {
      original: "顧客データのマイグレーションを週末に行う。",
      rewritten: "顧客データの移行を週末に行う。",
      note: "作業計画",
    },
    secondary: {
      original: "サーバーのマイグレーション手順を確認する。",
      rewritten: "サーバーの移設手順を確認する。",
      note: "設備移転",
    },
  },
  "スケーラビリティ": {
    primary: {
      original: "利用増加に備えてスケーラビリティを高める。",
      rewritten: "利用増加に備えて拡張性を高める。",
      note: "設計方針",
    },
    secondary: {
      original: "採用前に製品のスケーラビリティを評価する。",
      rewritten: "採用前に製品の規模対応力を評価する。",
      note: "製品選定",
    },
  },
  "セキュリティ": {
    primary: {
      original: "公開前にシステムのセキュリティを強化する。",
      rewritten: "公開前にシステムの安全対策を強化する。",
      note: "公開前確認",
    },
    secondary: {
      original: "利用者情報のセキュリティを最優先にする。",
      rewritten: "利用者情報の保護を最優先にする。",
      note: "情報管理方針",
    },
  },
  "アクセシビリティ": {
    primary: {
      original: "申し込み画面のアクセシビリティを改善する。",
      rewritten: "申し込み画面の利用しやすさを改善する。",
      note: "画面改善",
    },
    secondary: {
      original: "字幕を付けて動画のアクセシビリティを高める。",
      rewritten: "字幕を付けて動画の利用可能性を高める。",
      note: "情報提供",
    },
  },
  "アルゴリズム": {
    primary: {
      original: "推薦アルゴリズムの仕組みを説明する。",
      rewritten: "推薦の処理手順を説明する。",
      note: "利用者向け説明",
    },
    secondary: {
      original: "探索アルゴリズムを授業で学ぶ。",
      rewritten: "探索の計算手順を授業で学ぶ。",
      note: "専門教育",
    },
  },
  "ビッグデータ": {
    primary: {
      original: "購買履歴をビッグデータとして分析する。",
      rewritten: "購買履歴を大量データとして分析する。",
      note: "分析計画",
    },
    secondary: {
      original: "ビッグデータの保管費用を試算する。",
      rewritten: "大規模データの保管費用を試算する。",
      note: "設備計画",
    },
  },
  "ダッシュボード": {
    primary: {
      original: "売上をダッシュボードで毎朝確認する。",
      rewritten: "売上を一覧画面で毎朝確認する。",
      note: "日次確認",
    },
    secondary: {
      original: "ダッシュボードから利用者を停止できる。",
      rewritten: "管理画面から利用者を停止できる。",
      note: "管理操作",
    },
  },
  "ログ": {
    primary: {
      original: "操作ログを一年間保存する。",
      rewritten: "操作記録を一年間保存する。",
      note: "監査対応",
    },
    secondary: {
      original: "エラーのログを時系列で調べる。",
      rewritten: "エラーの履歴を時系列で調べる。",
      note: "障害調査",
    },
  },
  "バックアップ": {
    primary: {
      original: "データベースのバックアップを毎晩作成する。",
      rewritten: "データベースの予備保存を毎晩行う。",
      note: "定期運用",
    },
    secondary: {
      original: "更新前に設定ファイルのバックアップを取る。",
      rewritten: "更新前に設定ファイルの控えを取る。",
      note: "更新作業",
    },
  },
  "リカバリー": {
    primary: {
      original: "障害後のリカバリー手順を確認する。",
      rewritten: "障害後の復旧手順を確認する。",
      note: "障害対応",
    },
    secondary: {
      original: "サービスのリカバリーに三時間かかった。",
      rewritten: "サービスの回復に三時間かかった。",
      note: "障害報告",
    },
  },
  "フェイルオーバー": {
    primary: {
      original: "障害を検知すると自動でフェイルオーバーする。",
      rewritten: "障害を検知すると自動で予備切替を行う。",
      note: "冗長化設計",
    },
    secondary: {
      original: "フェイルオーバーの訓練を四半期ごとに行う。",
      rewritten: "障害時切替の訓練を四半期ごとに行う。",
      note: "運用訓練",
    },
  },
  "インサイト": {
    primary: {
      original: "利用者調査から新しいインサイトを得た。",
      rewritten: "利用者調査から新しい洞察を得た。",
      note: "調査分析",
    },
    secondary: {
      original: "利用者の声から改善のインサイトが見つかった。",
      rewritten: "利用者の声から改善の気づきが見つかった。",
      note: "改善会議",
    },
  },
  "ナラティブ": {
    primary: {
      original: "広告のナラティブに一貫性を持たせる。",
      rewritten: "広告の語りに一貫性を持たせる。",
      note: "広告制作",
    },
    secondary: {
      original: "ブランドのナラティブを再設計する。",
      rewritten: "ブランドの物語構成を再設計する。",
      note: "広報戦略",
    },
  },
  "ブランディング": {
    primary: {
      original: "地域の魅力を生かしたブランディングを進める。",
      rewritten: "地域の魅力を生かしたブランドづくりを進める。",
      note: "地域広報",
    },
    secondary: {
      original: "採用ブランディングの方針を見直す。",
      rewritten: "採用時の印象設計の方針を見直す。",
      note: "採用広報",
    },
  },
  "セグメント": {
    primary: {
      original: "年齢別のセグメントで調査結果を比較する。",
      rewritten: "年齢別の区分で調査結果を比較する。",
      note: "調査報告",
    },
    secondary: {
      original: "購買傾向が近いセグメントを抽出する。",
      rewritten: "購買傾向が近い分類群を抽出する。",
      note: "顧客分析",
    },
  },
  "ターゲット": {
    primary: {
      original: "この広告のターゲットは子育て世帯だ。",
      rewritten: "この広告の対象は子育て世帯だ。",
      note: "広告計画",
    },
    secondary: {
      original: "次のキャンペーンでは若年層をターゲットにする。",
      rewritten: "次のキャンペーンでは若年層を主な狙い先とする。",
      note: "販促会議",
    },
  },
  "ペルソナ": {
    primary: {
      original: "新製品のペルソナを具体的に定める。",
      rewritten: "新製品の想定利用者像を具体的に定める。",
      note: "製品企画",
    },
    secondary: {
      original: "調査結果をもとにペルソナを見直す。",
      rewritten: "調査結果をもとに利用者像を見直す。",
      note: "利用者調査",
    },
  },
  "カスタマージャーニー": {
    primary: {
      original: "購入までのカスタマージャーニーを図にする。",
      rewritten: "購入までの顧客行程を図にする。",
      note: "顧客分析",
    },
    secondary: {
      original: "予約サービスのカスタマージャーニーを改善する。",
      rewritten: "予約サービスを使う利用者の道筋を改善する。",
      note: "サービス改善",
    },
  },
  "リード": {
    primary: {
      original: "展示会で獲得したリードに連絡する。",
      rewritten: "展示会で獲得した見込み客に連絡する。",
      note: "営業活動",
    },
    secondary: {
      original: "有望なリードを営業担当に引き継ぐ。",
      rewritten: "有望な見込み先を営業担当に引き継ぐ。",
      note: "営業引き継ぎ",
    },
  },
  "コンバージョン": {
    primary: {
      original: "資料請求をコンバージョンとして計測する。",
      rewritten: "資料請求を成果達成として計測する。",
      note: "広告分析",
    },
    secondary: {
      original: "閲覧から購入へのコンバージョンを分析する。",
      rewritten: "閲覧から購入への転換を分析する。",
      note: "購買分析",
    },
  },
  "ファネル": {
    primary: {
      original: "購入までのファネルを可視化する。",
      rewritten: "購入までの段階構造を可視化する。",
      note: "購買分析",
    },
    secondary: {
      original: "ファネルのどこで利用者が離脱したか調べる。",
      rewritten: "絞り込み過程のどこで利用者が離脱したか調べる。",
      note: "行動分析",
    },
  },
  "チャネル": {
    primary: {
      original: "商品を届けるチャネルを増やす。",
      rewritten: "商品を届ける経路を増やす。",
      note: "販売計画",
    },
    secondary: {
      original: "相談を受け付けるチャネルを一本化する。",
      rewritten: "相談の受付経路を一本化する。",
      note: "問い合わせ対応",
    },
  },
  "タッチポイント": {
    primary: {
      original: "店舗は顧客との重要なタッチポイントだ。",
      rewritten: "店舗は顧客との重要な接点だ。",
      note: "顧客体験",
    },
    secondary: {
      original: "購入前のタッチポイントを洗い出す。",
      rewritten: "購入前の接触点を洗い出す。",
      note: "顧客分析",
    },
  },
  "オウンドメディア": {
    primary: {
      original: "オウンドメディアで導入事例を紹介する。",
      rewritten: "自社媒体で導入事例を紹介する。",
      note: "情報発信",
    },
    secondary: {
      original: "広告だけでなくオウンドメディアも育てる。",
      rewritten: "広告だけでなく自前媒体も育てる。",
      note: "広報戦略",
    },
  },
  "キャンペーン": {
    primary: {
      original: "夏のキャンペーンで来店を促す。",
      rewritten: "夏の販促施策で来店を促す。",
      note: "販売促進",
    },
    secondary: {
      original: "新商品のキャンペーン案を会議で決める。",
      rewritten: "新商品の宣伝企画を会議で決める。",
      note: "企画会議",
    },
  },
  "プロモーション": {
    primary: {
      original: "新商品のプロモーションに動画を使う。",
      rewritten: "新商品の販売促進に動画を使う。",
      note: "販促計画",
    },
    secondary: {
      original: "地域向けのプロモーションを強化する。",
      rewritten: "地域向けの宣伝を強化する。",
      note: "地域広報",
    },
  },
  "インフルエンサー": {
    primary: {
      original: "商品を紹介するインフルエンサーに試作品を送る。",
      rewritten: "商品を紹介する影響力のある発信者に試作品を送る。",
      note: "商品広報",
    },
    secondary: {
      original: "地域のインフルエンサーと連携して観光情報を届ける。",
      rewritten: "地域で人を動かす発信者と連携して観光情報を届ける。",
      note: "観光広報",
    },
  },
  "バズ": {
    primary: {
      original: "新しい広告がSNSでバズした。",
      rewritten: "新しい広告がSNSで話題化した。",
      note: "SNS分析",
    },
    secondary: {
      original: "誤情報がバズする前に訂正を出す。",
      rewritten: "誤情報が急拡散する前に訂正を出す。",
      note: "危機広報",
    },
  },
  "フォロワー": {
    primary: {
      original: "公式アカウントのフォロワーに記事を届ける。",
      rewritten: "公式アカウントの読者に記事を届ける。",
      note: "SNS発信",
    },
    secondary: {
      original: "キャンペーン後にフォロワーが増えた。",
      rewritten: "キャンペーン後に登録者が増えた。",
      note: "施策評価",
    },
  },
  "プロフィール": {
    primary: {
      original: "担当者のプロフィールをサイトに載せる。",
      rewritten: "担当者の紹介情報をサイトに載せる。",
      note: "ウェブ掲載",
    },
    secondary: {
      original: "応募者のプロフィールを確認する。",
      rewritten: "応募者の人物情報を確認する。",
      note: "採用選考",
    },
  },
  "タイムライン": {
    primary: {
      original: "災害情報をタイムラインで確認する。",
      rewritten: "災害情報を時系列表示で確認する。",
      note: "情報確認",
    },
    secondary: {
      original: "タイムラインに新しい投稿が表示された。",
      rewritten: "投稿一覧に新しい投稿が表示された。",
      note: "SNS画面",
    },
  },
  "アカウンタビリティ": {
    primary: {
      original: "経営陣は重要な判断のアカウンタビリティを果たす。",
      rewritten: "経営陣は重要な判断の説明責任を果たす。",
      note: "経営報告",
    },
    secondary: {
      original: "行政には予算執行のアカウンタビリティがある。",
      rewritten: "行政には予算執行の説明義務がある。",
      note: "行政文書",
    },
  },
  "ガバナンス": {
    primary: {
      original: "取締役会が企業ガバナンスを強化する。",
      rewritten: "取締役会が企業統治を強化する。",
      note: "経営方針",
    },
    secondary: {
      original: "子会社を含むガバナンスを見直す。",
      rewritten: "子会社を含む管理体制を見直す。",
      note: "組織監査",
    },
  },
  "コンプライアンス": {
    primary: {
      original: "全社員にコンプライアンス研修を行う。",
      rewritten: "全社員に法令遵守研修を行う。",
      note: "社内研修",
    },
    secondary: {
      original: "取引先にもコンプライアンスを求める。",
      rewritten: "取引先にも規範遵守を求める。",
      note: "取引方針",
    },
  },
  "プライバシー": {
    primary: {
      original: "利用者のプライバシーを守る設計にする。",
      rewritten: "利用者の個人情報保護を重視した設計にする。",
      note: "製品設計",
    },
    secondary: {
      original: "調査では回答者のプライバシーに配慮する。",
      rewritten: "調査では回答者の私的情報の保護に配慮する。",
      note: "調査倫理",
    },
  },
  "ダイバーシティ": {
    primary: {
      original: "採用でダイバーシティを重視する。",
      rewritten: "採用で多様性を重視する。",
      note: "採用方針",
    },
    secondary: {
      original: "チームのダイバーシティが新しい発想を生む。",
      rewritten: "チームの多様な人材が新しい発想を生む。",
      note: "組織づくり",
    },
  },
  "インクルージョン": {
    primary: {
      original: "地域計画にインクルージョンの視点を入れる。",
      rewritten: "地域計画に包摂の視点を入れる。",
      note: "地域計画",
    },
    secondary: {
      original: "職場のインクルージョンを進める。",
      rewritten: "職場で多様な人の受け入れを進める。",
      note: "職場づくり",
    },
  },
  "リスキリング": {
    primary: {
      original: "配置転換に向けて社員のリスキリングを支援する。",
      rewritten: "配置転換に向けて社員の学び直しを支援する。",
      note: "人材育成",
    },
    secondary: {
      original: "リスキリングの費用を会社が負担する。",
      rewritten: "新しい職務に向けた再技能習得の費用を会社が負担する。",
      note: "研修制度",
    },
  },
  "アップスキリング": {
    primary: {
      original: "技術者のアップスキリングに投資する。",
      rewritten: "技術者の技能向上に投資する。",
      note: "人材投資",
    },
    secondary: {
      original: "管理職向けのアップスキリング研修を行う。",
      rewritten: "管理職向けの能力強化研修を行う。",
      note: "管理職研修",
    },
  },
  "キャリアパス": {
    primary: {
      original: "入社後のキャリアパスを説明する。",
      rewritten: "入社後の職業上の道筋を説明する。",
      note: "採用説明",
    },
    secondary: {
      original: "社員ごとにキャリアパスを選べる制度にする。",
      rewritten: "社員ごとに成長経路を選べる制度にする。",
      note: "人事制度",
    },
  },
  "メンタリング": {
    primary: {
      original: "新人に継続的なメンタリングを提供する。",
      rewritten: "新人に継続的な助言支援を提供する。",
      note: "新人育成",
    },
    secondary: {
      original: "メンタリングの担当者を各部署に置く。",
      rewritten: "指導支援の担当者を各部署に置く。",
      note: "育成体制",
    },
  },
  "コーチング": {
    primary: {
      original: "管理職に外部コーチングを導入する。",
      rewritten: "管理職に外部の伴走支援を導入する。",
      note: "管理職支援",
    },
    secondary: {
      original: "本人の目標を引き出すコーチングを行う。",
      rewritten: "本人の目標を引き出す対話支援を行う。",
      note: "個別面談",
    },
  },
  "フィードバック": {
    primary: {
      original: "上司から仕事へのフィードバックを受けた。",
      rewritten: "上司から仕事への反応と助言を受けた。",
      note: "人事面談",
    },
    secondary: {
      original: "改善要望へのフィードバックを一週間以内に返す。",
      rewritten: "改善要望への返答を一週間以内に返す。",
      note: "利用者対応",
    },
  },
  "サーベイ": {
    primary: {
      original: "従業員サーベイを年に一度実施する。",
      rewritten: "従業員調査を年に一度実施する。",
      note: "人事調査",
    },
    secondary: {
      original: "利用者サーベイで困りごとを集める。",
      rewritten: "利用者への聞き取りで困りごとを集める。",
      note: "利用者調査",
    },
  },
  "アセスメント": {
    primary: {
      original: "研修前に技能アセスメントを行う。",
      rewritten: "研修前に技能評価を行う。",
      note: "研修設計",
    },
    secondary: {
      original: "採用候補者のアセスメント結果を共有する。",
      rewritten: "採用候補者の査定結果を共有する。",
      note: "採用選考",
    },
  },
  "レビュー": {
    primary: {
      original: "公開前に契約書をレビューする。",
      rewritten: "公開前に契約書を確認する。",
      note: "文書確認",
    },
    secondary: {
      original: "四半期ごとに事業計画をレビューする。",
      rewritten: "四半期ごとに事業計画を見直す。",
      note: "事業計画",
    },
  },
  "モニタリング": {
    primary: {
      original: "河川の水位を常時モニタリングする。",
      rewritten: "河川の水位を常時継続監視する。",
      note: "防災運用",
    },
    secondary: {
      original: "退院後の体調を遠隔でモニタリングする。",
      rewritten: "退院後の体調を遠隔で見守る。",
      note: "医療支援",
    },
  },
  "データドリブン": {
    primary: {
      original: "データドリブンな意思決定を組織に広げる。",
      rewritten: "データに基づく意思決定を組織に広げる。",
      note: "経営方針",
    },
    secondary: {
      original: "会議の進め方をデータドリブンに変える。",
      rewritten: "会議の進め方を資料重視に変える。",
      note: "会議運営",
    },
  },
  "グロース": {
    primary: {
      original: "事業のグロースを支える人材を採用する。",
      rewritten: "事業の成長を支える人材を採用する。",
      note: "採用計画",
    },
    secondary: {
      original: "有料利用者数のグロースが続いている。",
      rewritten: "有料利用者数の拡大が続いている。",
      note: "事業報告",
    },
  },
  "ピボット": {
    primary: {
      original: "顧客の反応を受けて事業をピボットした。",
      rewritten: "顧客の反応を受けて事業を方向転換した。",
      note: "事業判断",
    },
    secondary: {
      original: "販売から貸し出しへ事業モデルをピボットする。",
      rewritten: "販売から貸し出しへ事業モデルの軸足変更を行う。",
      note: "事業計画",
    },
  },
  "マネタイズ": {
    primary: {
      original: "無料サービスのマネタイズ方法を検討する。",
      rewritten: "無料サービスの収益化方法を検討する。",
      note: "事業計画",
    },
    secondary: {
      original: "保有データのマネタイズには慎重な判断が必要だ。",
      rewritten: "保有データを収益につなげるには慎重な判断が必要だ。",
      note: "データ事業",
    },
  },
  "アカウント": {
    primary: {
      original: "サービスの利用にはアカウントの作成が必要だ。",
      rewritten: "サービスの利用には利用者登録が必要だ。",
      note: "利用開始案内",
    },
    secondary: {
      original: "退会時にアカウントを削除する。",
      rewritten: "退会時に登録情報を削除する。",
      note: "退会手続き",
    },
  },
  "インタラクション": {
    primary: {
      original: "ボタンを押した後のインタラクションを設計する。",
      rewritten: "ボタンを押した後のやり取りを設計する。",
      note: "画面設計",
    },
    secondary: {
      original: "利用者と案内役のインタラクションを観察する。",
      rewritten: "利用者と案内役の相互作用を観察する。",
      note: "利用者調査",
    },
  },
  "オブザーバビリティ": {
    primary: {
      original: "障害調査のためシステムのオブザーバビリティを高める。",
      rewritten: "障害調査のためシステムの可観測性を高める。",
      note: "監視設計",
    },
    secondary: {
      original: "導入前に監視基盤のオブザーバビリティを評価する。",
      rewritten: "導入前に監視基盤で状態を調べやすいか評価する。",
      note: "製品選定",
    },
  },
  "オペレーション": {
    primary: {
      original: "新制度のオペレーションを担当部署に引き継ぐ。",
      rewritten: "新制度の運用を担当部署に引き継ぐ。",
      note: "業務引き継ぎ",
    },
    secondary: {
      original: "窓口のオペレーションを手順書にまとめる。",
      rewritten: "窓口の業務手順を手順書にまとめる。",
      note: "窓口業務",
    },
  },
  "オンサイト": {
    primary: {
      original: "障害時は技術者がオンサイトで対応する。",
      rewritten: "障害時は技術者が現地対応する。",
      note: "保守契約",
    },
    secondary: {
      original: "繁忙期はオンサイトの保守要員を増やす。",
      rewritten: "繁忙期は現場対応の保守要員を増やす。",
      note: "保守体制",
    },
  },
  "キャッシュ": {
    primary: {
      original: "画像をキャッシュして表示を速くする。",
      rewritten: "画像を一時保存して表示を速くする。",
      note: "表示改善",
    },
    secondary: {
      original: "通信できない間はデータを端末にキャッシュする。",
      rewritten: "通信できない間はデータを端末に控え保存する。",
      note: "通信障害対策",
    },
  },
  "サブスクリプション": {
    primary: {
      original: "動画サービスをサブスクリプションで契約する。",
      rewritten: "動画サービスを定額利用で契約する。",
      note: "料金案内",
    },
    secondary: {
      original: "サブスクリプションの更新時期を利用者に知らせる。",
      rewritten: "継続契約の更新時期を利用者に知らせる。",
      note: "契約更新",
    },
  },
  "スプリント": {
    primary: {
      original: "次のスプリントで検索機能を作る。",
      rewritten: "次の短期作業期間で検索機能を作る。",
      note: "開発計画",
    },
    secondary: {
      original: "二週間のスプリントを繰り返す。",
      rewritten: "二週間の反復期間を繰り返す。",
      note: "開発手法",
    },
  },
  "スループット": {
    primary: {
      original: "サーバーのスループットを毎秒千件まで高める。",
      rewritten: "サーバーの処理量を毎秒千件まで高める。",
      note: "性能目標",
    },
    secondary: {
      original: "負荷試験でシステムのスループットを測定する。",
      rewritten: "負荷試験でシステムの処理能力を測定する。",
      note: "性能試験",
    },
  },
  "トラッキング": {
    primary: {
      original: "荷物を発送後もトラッキングできる。",
      rewritten: "荷物を発送後も追跡できる。",
      note: "配送案内",
    },
    secondary: {
      original: "広告を見た後の行動をトラッキングする。",
      rewritten: "広告を見た後の行動の経過把握を行う。",
      note: "広告分析",
    },
  },
  "ハイブリッド": {
    primary: {
      original: "会議を対面とオンラインのハイブリッドで開く。",
      rewritten: "会議を対面とオンラインの併用型で開く。",
      note: "会議案内",
    },
    secondary: {
      original: "新制度は出社と在宅勤務のハイブリッドだ。",
      rewritten: "新制度は出社と在宅勤務の混合型だ。",
      note: "勤務制度",
    },
  },
  "バックログ": {
    primary: {
      original: "見つかった不具合をバックログに追加する。",
      rewritten: "見つかった不具合を未処理一覧に追加する。",
      note: "開発管理",
    },
    secondary: {
      original: "月末までにバックログを減らす。",
      rewritten: "月末までに作業残を減らす。",
      note: "進捗管理",
    },
  },
  "パフォーマンス": {
    primary: {
      original: "更新後にシステムのパフォーマンスを測る。",
      rewritten: "更新後にシステムの性能を測る。",
      note: "性能試験",
    },
    secondary: {
      original: "データ取り込みのパフォーマンスを改善する。",
      rewritten: "データ取り込みの処理効率を改善する。",
      note: "処理改善",
    },
  },
  "フリーミアム": {
    primary: {
      original: "このアプリはフリーミアムで提供する。",
      rewritten: "このアプリは基本無料で提供する。",
      note: "料金案内",
    },
    secondary: {
      original: "フリーミアムの料金設計を見直す。",
      rewritten: "無料有料併用の料金設計を見直す。",
      note: "事業計画",
    },
  },
  "プロトタイプ": {
    primary: {
      original: "新しい端末のプロトタイプを作る。",
      rewritten: "新しい端末の試作を行う。",
      note: "製品開発",
    },
    secondary: {
      original: "利用者にプロトタイプを触ってもらう。",
      rewritten: "利用者に試作品を触ってもらう。",
      note: "利用者試験",
    },
  },
  "メトリクス": {
    primary: {
      original: "運用状況を示すメトリクスを決める。",
      rewritten: "運用状況を示す指標を決める。",
      note: "運用設計",
    },
    secondary: {
      original: "障害前後のメトリクスを比較する。",
      rewritten: "障害前後の測定値を比較する。",
      note: "障害調査",
    },
  },
  "モックアップ": {
    primary: {
      original: "新画面のモックアップを会議で見せる。",
      rewritten: "新画面の画面模型を会議で見せる。",
      note: "画面設計",
    },
    secondary: {
      original: "商品の箱のモックアップを印刷する。",
      rewritten: "商品の箱の見本を印刷する。",
      note: "製品デザイン",
    },
  },
  "ユーザビリティ": {
    primary: {
      original: "高齢者向け画面のユーザビリティを検証する。",
      rewritten: "高齢者向け画面の使いやすさを検証する。",
      note: "利用者試験",
    },
    secondary: {
      original: "試験で医療機器のユーザビリティを評価する。",
      rewritten: "試験で医療機器の利用容易性を評価する。",
      note: "製品評価",
    },
  },
  "ユースケース": {
    primary: {
      original: "災害時のユースケースを具体化する。",
      rewritten: "災害時の利用場面を具体化する。",
      note: "要件定義",
    },
    secondary: {
      original: "新機能のユースケースを説明書に載せる。",
      rewritten: "新機能の使用例を説明書に載せる。",
      note: "利用者向け説明",
    },
  },
  "レプリケーション": {
    primary: {
      original: "拠点間でデータをレプリケーションする。",
      rewritten: "拠点間でデータを複製同期する。",
      note: "データ運用",
    },
    secondary: {
      original: "読み取り用データベースへレプリケーションする。",
      rewritten: "読み取り用データベースへ複製する。",
      note: "システム構成",
    },
  },
  "アイスブレイク": {
    primary: {
      original: "研修の冒頭でアイスブレイクを行う。",
      rewritten: "研修の冒頭に場を和ませる導入を入れる。",
      note: "研修進行",
    },
    secondary: {
      original: "簡単な自己紹介をアイスブレイクに使う。",
      rewritten: "簡単な自己紹介を緊張ほぐしに使う。",
      note: "会議の導入",
    },
  },
  "アクションアイテム": {
    primary: {
      original: "会議のアクションアイテムに担当者を付ける。",
      rewritten: "会議の実行項目に担当者を付ける。",
      note: "議事録",
    },
    secondary: {
      original: "未完了のアクションアイテムを次回確認する。",
      rewritten: "未完了の対応項目を次回確認する。",
      note: "進捗確認",
    },
  },
  "クロージング": {
    primary: {
      original: "説明会のクロージングで要点を振り返る。",
      rewritten: "説明会の締めで要点を振り返る。",
      note: "説明会進行",
    },
    secondary: {
      original: "商談のクロージングで契約条件を確かめる。",
      rewritten: "商談の最終確認で契約条件を確かめる。",
      note: "商談",
    },
  },
  "スタンドアップ": {
    primary: {
      original: "毎朝スタンドアップで進捗を共有する。",
      rewritten: "毎朝の朝会で進捗を共有する。",
      note: "開発チーム",
    },
    secondary: {
      original: "遠隔チームのスタンドアップを十五分で終える。",
      rewritten: "遠隔チームの進捗確認会を十五分で終える。",
      note: "遠隔会議",
    },
  },
  "ネクストアクション": {
    primary: {
      original: "会議の最後にネクストアクションを決める。",
      rewritten: "会議の最後に次の行動を決める。",
      note: "会議のまとめ",
    },
    secondary: {
      original: "顧客からの質問をネクストアクションとして記録する。",
      rewritten: "顧客からの質問を次回対応として記録する。",
      note: "顧客対応",
    },
  },
  "ファシリテーション": {
    primary: {
      original: "意見が偏らないよう会議のファシリテーションを行う。",
      rewritten: "意見が偏らないよう会議の進行支援を行う。",
      note: "意見交換会",
    },
    secondary: {
      original: "外部の専門家にファシリテーションを依頼する。",
      rewritten: "外部の専門家に会議進行を依頼する。",
      note: "検討会",
    },
  },
  "ブレスト": {
    primary: {
      original: "新商品の名前をブレストで考える。",
      rewritten: "新商品の名前を案出しで考える。",
      note: "商品企画",
    },
    secondary: {
      original: "部署を越えてブレストを開く。",
      rewritten: "部署を越えて発想会議を開く。",
      note: "企画会議",
    },
  },
  "ペインポイント": {
    primary: {
      original: "利用者のペインポイントを面談で聞く。",
      rewritten: "利用者の困りごとを面談で聞く。",
      note: "利用者調査",
    },
    secondary: {
      original: "解約理由からペインポイントを特定する。",
      rewritten: "解約理由から不満点を特定する。",
      note: "解約分析",
    },
  },
  "ボトルネック": {
    primary: {
      original: "承認工程が作業のボトルネックになっている。",
      rewritten: "承認工程が作業の詰まりになっている。",
      note: "業務改善",
    },
    secondary: {
      original: "処理速度のボトルネックを調べる。",
      rewritten: "処理速度の制約箇所を調べる。",
      note: "性能調査",
    },
  },
  "リモート": {
    primary: {
      original: "地方拠点をリモートで支援する。",
      rewritten: "地方拠点を遠隔で支援する。",
      note: "拠点支援",
    },
    secondary: {
      original: "担当者がリモートで機器を操作する。",
      rewritten: "担当者が離れた場所から機器を操作する。",
      note: "遠隔保守",
    },
  },
  "レイテンシ": {
    primary: {
      original: "通信のレイテンシを五十ミリ秒以下にする。",
      rewritten: "通信の遅延を五十ミリ秒以下にする。",
      note: "性能目標",
    },
    secondary: {
      original: "海外拠点ではレイテンシが長い。",
      rewritten: "海外拠点では待ち時間が長い。",
      note: "通信状況",
    },
  },
  "レスポンシブ": {
    primary: {
      original: "案内サイトをレスポンシブに作り直す。",
      rewritten: "案内サイトを画面幅対応に作り直す。",
      note: "ウェブ改修",
    },
    secondary: {
      original: "レスポンシブ表示を複数の端末で確認する。",
      rewritten: "可変表示を複数の端末で確認する。",
      note: "表示試験",
    },
  },
  "レトロスペクティブ": {
    primary: {
      original: "作業期間の最後にレトロスペクティブを行う。",
      rewritten: "作業期間の最後に振り返りを行う。",
      note: "開発チーム",
    },
    secondary: {
      original: "障害対応後にレトロスペクティブを開く。",
      rewritten: "障害対応後に事後確認を開く。",
      note: "障害対応",
    },
  },
  "ワイヤーフレーム": {
    primary: {
      original: "申し込み画面のワイヤーフレームを作る。",
      rewritten: "申し込み画面の画面設計図を作る。",
      note: "画面設計",
    },
    secondary: {
      original: "ワイヤーフレームで情報の配置を確認する。",
      rewritten: "骨組み図で情報の配置を確認する。",
      note: "設計会議",
    },
  },
};

type SupplementalProposalDetailOverride = Partial<
  Pick<SeedProposal, "fitContext" | "rationale" | "register">
>;

const supplementalProposalDetailOverrides: Record<
  string,
  { primary?: SupplementalProposalDetailOverride; secondary?: SupplementalProposalDetailOverride }
> = {
  "ローンチ": {
    primary: {
      fitContext: "新しい製品・サービスを初めて世に出す計画",
      rationale: "初公開という節目と、開始時点の両方を表せる。",
    },
    secondary: {
      fitContext: "提供地域や対象者を限定してサービスを始める場面",
      rationale: "誰に対する提供が始まるのかを明確にしやすい。",
    },
  },
  "タスク": {
    secondary: {
      fitContext: "作業一覧、工程管理、議事録",
      rationale: "一覧の一単位として扱う作業であることを表せる。",
    },
  },
  "クラウド": {
    secondary: {
      fitContext: "非技術者向けのシステム構成・災害対策の説明",
      rationale: "外部の計算資源をネット経由で使うことを、専門語を避けて説明できる。",
      register: "neutral",
    },
  },
  "リリース": {
    secondary: {
      fitContext: "完成した機能・製品を利用者へ渡す場面",
      rationale: "初公開か更新版かを限定せず、利用者が使えるようになることを表せる。",
      register: "neutral",
    },
  },
  "チャネル": {
    secondary: {
      fitContext: "問い合わせ窓口、相談受付、申し込み導線",
      rationale: "顧客との個別の接触場面ではなく、受け付ける経路であることを明確にできる。",
      register: "neutral",
    },
  },
  "タッチポイント": {
    primary: {
      fitContext: "店舗、ウェブサイト、広告など顧客が商品や組織に触れる場面",
      rationale: "情報を届ける経路全体ではなく、顧客が実際に触れる個別の場面を表せる。",
    },
  },
  "インフルエンサー": {
    secondary: {
      fitContext: "一般向けの記事、会話、地域広報",
      rationale: "肩書ではなく、発信によって人の判断や行動に影響する役割を平易に説明できる。",
      register: "neutral",
    },
  },
  "アルゴリズム": {
    secondary: {
      fitContext: "計算、探索、情報教育の説明",
      rationale: "計算問題を解く順序に焦点を当て、専門外にも意味を伝えやすい。",
      register: "neutral",
    },
  },
  "オブザーバビリティ": {
    secondary: {
      fitContext: "非技術者向けの製品比較、監視機能の説明",
      rationale: "専門用語を使わず、障害時に状態を調べられる性質を表せる。",
      register: "neutral",
    },
  },
  "マネタイズ": {
    secondary: {
      fitContext: "会話、一般向けの事業説明",
      rationale: "名詞を作らず、価値を収益へ結び付ける行為として自然に表せる。",
      register: "neutral",
    },
  },
  "アイスブレイク": {
    primary: {
      fitContext: "研修、初対面の会議、交流会の導入",
      rationale: "目的と行う位置を説明でき、初めて聞く人にも内容が伝わる。",
    },
  },
  "アクションアイテム": {
    secondary: {
      fitContext: "担当者と期限を記録する議事録、進捗確認",
      rationale: "単なる作業ではなく、会議後に対応すべき項目であることを表せる。",
    },
  },
};

function supplementalToSeedTerm(term: SupplementalTerm, index: number): SeedTerm {
  const exampleOverride = supplementalExampleOverrides[term.headword];
  const detailOverride = supplementalProposalDetailOverrides[term.headword];
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
            fitContext: detailOverride?.primary?.fitContext ?? "一般向け説明、社内文書、公開資料",
            rationale: detailOverride?.primary?.rationale ?? "既存の日本語として意味を推測しやすい。",
            register: detailOverride?.primary?.register,
            labels: ["natural", "clear", "accurate"],
            example: exampleOverride?.primary ?? {
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
            fitContext: detailOverride?.secondary?.fitContext ?? "文書で少し硬めに表したい場面",
            rationale: detailOverride?.secondary?.rationale ?? "短く整理できるが、文脈によって硬く感じる場合がある。",
            register: detailOverride?.secondary?.register ?? "formal",
            labels: ["clear", "document_friendly"],
            example: exampleOverride?.secondary ?? {
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

  const seededVerifiedAt = new Date();
  const admin = await prisma.user.create({
    data: {
      displayName: "管理者",
      handle: "admin",
      email: adminEmail,
      emailVerifiedAt: seededVerifiedAt,
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
      emailVerifiedAt: isPostgres ? null : seededVerifiedAt,
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
      emailVerifiedAt: isPostgres ? null : seededVerifiedAt,
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
      emailVerifiedAt: isPostgres ? null : seededVerifiedAt,
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
