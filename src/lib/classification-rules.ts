export const DOMAIN_CLASSIFICATION_RULES = [
  {
    slug: "business",
    name: "ビジネス",
    description: "経営、営業、事業運営、取引、一般的な社内業務で使う言葉。",
    boundary: "採用・育成が中心なら「人事」、システム実装が中心なら「IT」を選びます。",
  },
  {
    slug: "public",
    name: "行政",
    description: "国・自治体の制度、公共サービス、法令、行政文書で使う言葉。",
    boundary: "企業内の一般的な法令対応や統治は「ビジネス」を優先します。",
  },
  {
    slug: "it",
    name: "IT",
    description: "ソフトウェア、情報基盤、データ、画面設計、技術運用で使う言葉。",
    boundary: "広告効果や顧客行動の分析が中心なら「マーケティング」を選びます。",
  },
  {
    slug: "marketing",
    name: "マーケティング",
    description: "市場調査、顧客獲得、広告、販売促進、ブランドづくりで使う言葉。",
    boundary: "SNS固有の投稿・拡散・反応を指す場合は「SNS」を選びます。",
  },
  {
    slug: "hr",
    name: "人事",
    description: "採用、育成、評価、労務、キャリア、組織開発で使う言葉。",
    boundary: "部門を問わない経営・組織運営の話なら「ビジネス」を選びます。",
  },
  {
    slug: "sns",
    name: "SNS",
    description: "投稿、アカウント、拡散、交流、SNS上の反応で使う言葉。",
    boundary: "SNSを含む広い広告・顧客獲得施策なら「マーケティング」を選びます。",
  },
  {
    slug: "education",
    name: "教育",
    description: "学校、授業、学習、教材、指導、教育制度で使う言葉。",
    boundary: "社員研修や職業能力の開発が中心なら「人事」を選びます。",
  },
  {
    slug: "daily",
    name: "日常",
    description: "仕事や制度の専門場面に限らない、暮らしや一般会話で使う言葉。",
    boundary: "より具体的な専門分野がある場合は、その分野を優先します。",
  },
] as const;

export const TAG_CLASSIFICATION_RULES = [
  {
    name: "会議",
    description: "会議の準備・進行・合意・決定・次の行動に関する言葉。",
  },
  {
    name: "企画",
    description: "構想、計画、戦略、製品・サービス設計に関する言葉。",
  },
  {
    name: "分析",
    description: "指標、調査、測定、比較、結果の読み取りに関する言葉。",
  },
  {
    name: "組織",
    description: "統治、意思決定、部門連携、組織運営に関する言葉。",
  },
  {
    name: "開発",
    description: "ソフトウェア・製品の開発、基盤、技術運用に関する言葉。",
  },
  {
    name: "広報",
    description: "対外発信、広告、メディア、SNS、販売促進に関する言葉。",
  },
  {
    name: "人材",
    description: "採用、育成、評価、技能、キャリアに関する言葉。",
  },
  {
    name: "社会",
    description: "公共性、権利、多様性、包摂、地域や社会規範に関する言葉。",
  },
] as const;
