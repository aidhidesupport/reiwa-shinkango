import { Plus, Send } from "lucide-react";
import {
  addProposalWithState,
  addSenseWithState,
  createTermWithState,
  submitEditSuggestionWithState,
} from "@/app/actions";
import { ActionForm } from "@/components/ActionForm";
import { REGISTERS } from "@/lib/labels";

type Domain = {
  id: string;
  name: string;
};

export function NewTermForm({ domains, defaultHeadword = "" }: { domains: Domain[]; defaultHeadword?: string }) {
  return (
    <ActionForm action={createTermWithState} className="stacked-form" pendingMessage="項目を作成しています…">
      <section className="term-form-guide" aria-labelledby="term-form-guide-title">
        <h2 id="term-form-guide-title">この画面で登録するもの</h2>
        <ol>
          <li><strong>言葉</strong><span>取り上げたい横文字・専門語</span></li>
          <li><strong>使われ方</strong><span>その言葉が何を指すか</span></li>
          <li><strong>日本語案</strong><span>その使われ方に合う言い換え</span></li>
        </ol>
      </section>

      <section className="form-step" aria-labelledby="term-step-word">
        <div className="form-step-heading">
          <span aria-hidden="true">1</span>
          <div>
            <h2 id="term-step-word">取り上げる言葉</h2>
            <p>日本語に言い換えたい言葉そのものを入力します。</p>
          </div>
        </div>
        <label>
          取り上げる言葉（必須）
          <input name="headword" required defaultValue={defaultHeadword} placeholder="例：アカウンタビリティ" />
        </label>
        <label>
          元の外国語（任意）
          <input name="originalWord" placeholder="例：accountability" />
        </label>
      </section>

      <section className="form-step" aria-labelledby="term-step-sense">
        <div className="form-step-heading">
          <span aria-hidden="true">2</span>
          <div>
            <h2 id="term-step-sense">この言葉の使われ方</h2>
            <p>同じ言葉でも意味が分かれることがあります。まず1つの使われ方を登録します。</p>
          </div>
        </div>
        <label>
          使われ方を短く表す名前（必須）
          <input name="senseTitle" required placeholder="例：事情を説明する責任" />
        </label>
        <label>
          この使われ方の説明（必須）
          <textarea
            name="senseDescription"
            required
            minLength={8}
            rows={3}
            placeholder="例：判断や行動の内容と理由を、関係者に説明する責任を指します。"
          />
        </label>
        <fieldset className="classification-fields">
          <legend>分類（任意）</legend>
          <p>大まかな分野を選び、必要なら自由なタグを付けられます。両方空でも投稿できます。</p>
          <div className="form-grid">
            <label>
              分野
              <select name="domainId" defaultValue="">
                <option value="">未分類</option>
                {domains.map((domain) => (
                  <option key={domain.id} value={domain.id}>{domain.name}</option>
                ))}
              </select>
            </label>
            <label>
              タグ（複数可）
              <input name="tags" placeholder="例：会議、組織運営、説明責任" />
            </label>
          </div>
        </fieldset>
      </section>

      <section className="form-step proposal-step" aria-labelledby="term-step-proposal">
        <div className="form-step-heading">
          <span aria-hidden="true">3</span>
          <div>
            <h2 id="term-step-proposal">日本語案を登録する</h2>
            <p>この投稿の中心です。この使われ方を自然に表せる日本語を、まず1案入力します。</p>
          </div>
        </div>
        <div className="proposal-main-field">
          <label htmlFor="new-term-proposal">日本語案（必須）</label>
          <input
            id="new-term-proposal"
            name="proposalText"
            required
            maxLength={120}
            aria-describedby="new-term-proposal-help"
            placeholder="例：説明責任"
          />
          <p id="new-term-proposal-help">長い説明ではなく、実際に言い換えとして使える短い案を入力します。</p>
        </div>

        <fieldset className="proposal-support-fields">
          <legend>案の使いどころ・理由（任意）</legend>
          <p>どんな場面に合う案なのかを補足すると、ほかの人が評価しやすくなります。</p>
          <div className="form-grid">
            <label>
              文体
              <select name="register" defaultValue="neutral">
                {REGISTERS.map((register) => (
                  <option key={register.id} value={register.id}>{register.label}</option>
                ))}
              </select>
            </label>
            <label>
              よく合う場面
              <input name="fitContext" placeholder="例：行政文書、組織運営" />
            </label>
          </div>
          <label>
            この案を選んだ理由
            <textarea name="rationale" rows={2} placeholder="例：意味が伝わりやすく、すでに広く使われているため。" />
          </label>
        </fieldset>

        <fieldset className="proposal-support-fields">
          <legend>言い換え例（任意）</legend>
          <p>元の文と言い換えた文を、セットで入力します。</p>
          <div className="form-grid">
            <label>
              元の言葉を使った文
              <textarea name="originalSentence" rows={3} placeholder="例：経営にはアカウンタビリティが必要です。" />
            </label>
            <label>
              日本語案に言い換えた文
              <textarea name="rewrittenSentence" rows={3} placeholder="例：経営には説明責任が必要です。" />
            </label>
          </div>
        </fieldset>
      </section>
      <button type="submit" className="button">
        <Plus size={17} />
        <span>この日本語案を投稿</span>
      </button>
    </ActionForm>
  );
}

export function AddSenseForm({ termId, termSlug, domains }: { termId: string; termSlug: string; domains: Domain[] }) {
  return (
    <details className="section-details">
      <summary>別の使われ方を追加</summary>
      <ActionForm action={addSenseWithState} className="stacked-form compact-form" pendingMessage="使われ方を追加しています…">
        <input type="hidden" name="termId" value={termId} />
        <input type="hidden" name="termSlug" value={termSlug} />
        <label>
          使われ方を短く表す名前
          <input name="title" required placeholder="例：結果について責任を負うこと" />
        </label>
        <label>
          この使われ方の説明
          <textarea name="description" required minLength={8} rows={3} />
        </label>
        <fieldset className="classification-fields">
          <legend>分類（任意）</legend>
          <div className="form-grid">
            <label>
              分野
              <select name="domainId" defaultValue="">
                <option value="">未分類</option>
                {domains.map((domain) => (
                  <option key={domain.id} value={domain.id}>{domain.name}</option>
                ))}
              </select>
            </label>
            <label>
              タグ（複数可）
              <input name="tags" placeholder="例：会議、組織運営" />
            </label>
          </div>
        </fieldset>
        <button type="submit" className="button secondary">
          <Plus size={17} />
          <span>追加</span>
        </button>
      </ActionForm>
    </details>
  );
}

export function AddProposalForm({
  termId,
  termSlug,
  senseId,
}: {
  termId: string;
  termSlug: string;
  senseId: string;
}) {
  return (
    <details className="section-details">
      <summary>日本語案を追加</summary>
      <ActionForm action={addProposalWithState} className="stacked-form compact-form" pendingMessage="日本語案を投稿しています…">
        <input type="hidden" name="termId" value={termId} />
        <input type="hidden" name="termSlug" value={termSlug} />
        <input type="hidden" name="senseId" value={senseId} />
        <div className="proposal-main-field">
          <label htmlFor={`proposal-text-${senseId}`}>日本語案（必須）</label>
          <input id={`proposal-text-${senseId}`} name="proposalText" required maxLength={120} />
        </div>
        <div className="form-grid">
          <label>
            文体
            <select name="register" defaultValue="neutral">
              {REGISTERS.map((register) => (
                <option key={register.id} value={register.id}>{register.label}</option>
              ))}
            </select>
          </label>
        </div>
        <label>
          合う文脈
          <input name="fitContext" required />
        </label>
        <label>
          避けたい文脈
          <input name="unfitContext" />
        </label>
        <label>
          理由
          <textarea name="rationale" rows={3} />
        </label>
        <div className="form-grid">
          <label>
            良い点
            <input name="pros" />
          </label>
          <label>
            弱い点
            <input name="cons" />
          </label>
        </div>
        <div className="form-grid">
          <label>
            元文
            <textarea name="originalSentence" rows={3} />
          </label>
          <label>
            言い換え
            <textarea name="rewrittenSentence" rows={3} />
          </label>
        </div>
        <button type="submit" className="button secondary">
          <Send size={17} />
          <span>投稿</span>
        </button>
      </ActionForm>
    </details>
  );
}

export function EditSenseForm({
  sense,
  termSlug,
  domains,
  canApplyNow,
}: {
  sense: {
    id: string;
    title: string;
    description: string;
    usageNote: string | null;
    domainId: string | null;
    tags: Array<{ tag: { name: string } }>;
  };
  termSlug: string;
  domains: Domain[];
  canApplyNow: boolean;
}) {
  return (
    <details className="editor-details edit-details">
      <summary>{canApplyNow ? "使われ方を編集・修正提案" : "使われ方の修正を提案"}</summary>
      <ActionForm
        action={submitEditSuggestionWithState}
        className="stacked-form compact-form"
        pendingMessage="修正内容を送信しています…"
      >
        <input type="hidden" name="targetType" value="sense" />
        <input type="hidden" name="targetId" value={sense.id} />
        <input type="hidden" name="returnTo" value={`/terms/${termSlug}#sense-${sense.id}`} />
        <label>
          使われ方を短く表す名前
          <input name="title" required defaultValue={sense.title} />
        </label>
        <label>
          この使われ方の説明
          <textarea name="description" required minLength={8} rows={3} defaultValue={sense.description} />
        </label>
        <label>
          用法メモ
          <textarea name="usageNote" rows={2} defaultValue={sense.usageNote ?? ""} />
        </label>
        <fieldset className="classification-fields">
          <legend>分類（任意）</legend>
          <div className="form-grid">
            <label>
              分野
              <select name="domainId" defaultValue={sense.domainId ?? ""}>
                <option value="">未分類</option>
                {domains.map((domain) => (
                  <option key={domain.id} value={domain.id}>{domain.name}</option>
                ))}
              </select>
            </label>
            <label>
              タグ（複数可）
              <input name="tags" defaultValue={sense.tags.map(({ tag }) => tag.name).join("、")} />
            </label>
          </div>
        </fieldset>
        <label>
          修正理由
          <textarea name="reason" required minLength={5} rows={2} placeholder="どこを、なぜ直すか" />
        </label>
        {canApplyNow ? (
          <label className="check-line">
            <input type="checkbox" name="applyNow" value="1" />
            編集者権限で直ちに反映する
          </label>
        ) : null}
        <button type="submit" className="button secondary">
          <Send size={17} />
          <span>{canApplyNow ? "編集または提案を送信" : "修正を提案"}</span>
        </button>
      </ActionForm>
    </details>
  );
}
