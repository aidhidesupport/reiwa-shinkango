export const metadata = {
  title: "利用規約",
};

export default function TermsOfServicePage() {
  return (
    <div className="page-shell narrow prose-page">
      <p className="eyebrow">Legal</p>
      <h1>利用規約</h1>
      <p>この文書は公開前の雛形です。正式公開前に法務確認を行ってください。</p>
      <h2>投稿内容</h2>
      <p>投稿者は、自身の投稿について、令和新漢語上での掲載、編集、要約、再配布、検索表示を許諾します。</p>
      <h2>禁止事項</h2>
      <p>差別、侮辱、個人情報、機密情報、著作権を侵害する長文引用、宣伝、荒らし、サービス妨害を禁止します。</p>
      <h2>編集と非表示</h2>
      <p>運営者または編集者は、品質維持と安全確保のため、投稿の整理、非表示、差し戻し、アカウント停止を行うことがあります。</p>
      <h2>公開データ</h2>
      <p>将来的に訳語データを公開する場合は、CC BY-SA または CC BY を候補とし、公開前にサイト上で明示します。</p>
    </div>
  );
}
