import { Plus, Send } from "lucide-react";
import { addProposal, addSense, createTerm } from "@/app/actions";
import { REGISTERS } from "@/lib/labels";

type Domain = {
  id: string;
  name: string;
};

export function NewTermForm({ domains, defaultHeadword = "" }: { domains: Domain[]; defaultHeadword?: string }) {
  return (
    <form action={createTerm} className="stacked-form">
      <div className="form-grid">
        <label>
          横文字
          <input name="headword" required defaultValue={defaultHeadword} placeholder="例: アカウンタビリティ" />
        </label>
        <label>
          原語
          <input name="originalWord" placeholder="例: accountability" />
        </label>
      </div>
      <label>
        概要
        <textarea name="summary" required rows={3} placeholder="この語がどのように使われるか" />
      </label>
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
          タグ
          <input name="tags" placeholder="会議、企画、行政" />
        </label>
      </div>
      <label>
        最初の意味
        <input name="senseTitle" required placeholder="例: 説明責任" />
      </label>
      <label>
        意味の説明
        <textarea name="senseDescription" required rows={3} placeholder="この文脈では何を指すか" />
      </label>
      <section className="form-subsection">
        <h3>訳語案</h3>
        <div className="form-grid">
          <label>
            訳語案
            <input name="proposalText" placeholder="例: 説明責任" />
          </label>
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
          <input name="fitContext" placeholder="例: 行政文書、組織運営" />
        </label>
        <label>
          理由
          <textarea name="rationale" rows={2} placeholder="この訳がなぜ合うか" />
        </label>
        <div className="form-grid">
          <label>
            元文
            <textarea name="originalSentence" rows={3} placeholder="横文字を含む文" />
          </label>
          <label>
            言い換え
            <textarea name="rewrittenSentence" rows={3} placeholder="訳語案を使った文" />
          </label>
        </div>
      </section>
      <button type="submit" className="button">
        <Plus size={17} />
        <span>項目を作成</span>
      </button>
    </form>
  );
}

export function AddSenseForm({ termId, termSlug, domains }: { termId: string; termSlug: string; domains: Domain[] }) {
  return (
    <details className="section-details">
      <summary>意味を追加</summary>
      <form action={addSense} className="stacked-form compact-form">
        <input type="hidden" name="termId" value={termId} />
        <input type="hidden" name="termSlug" value={termSlug} />
        <label>
          見出し
          <input name="title" required />
        </label>
        <label>
          説明
          <textarea name="description" required rows={3} />
        </label>
        <label>
          分野
          <select name="domainId" defaultValue="">
            <option value="">未分類</option>
            {domains.map((domain) => (
              <option key={domain.id} value={domain.id}>{domain.name}</option>
            ))}
          </select>
        </label>
        <button type="submit" className="button secondary">
          <Plus size={17} />
          <span>追加</span>
        </button>
      </form>
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
      <summary>訳語案を追加</summary>
      <form action={addProposal} className="stacked-form compact-form">
        <input type="hidden" name="termId" value={termId} />
        <input type="hidden" name="termSlug" value={termSlug} />
        <input type="hidden" name="senseId" value={senseId} />
        <div className="form-grid">
          <label>
            訳語案
            <input name="proposalText" required />
          </label>
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
      </form>
    </details>
  );
}
