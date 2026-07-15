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
    </ActionForm>
  );
}

export function AddSenseForm({ termId, termSlug, domains }: { termId: string; termSlug: string; domains: Domain[] }) {
  return (
    <details className="section-details">
      <summary>意味を追加</summary>
      <ActionForm action={addSenseWithState} className="stacked-form compact-form" pendingMessage="意味を追加しています…">
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
      <summary>訳語案を追加</summary>
      <ActionForm action={addProposalWithState} className="stacked-form compact-form" pendingMessage="訳語案を投稿しています…">
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
  };
  termSlug: string;
  domains: Domain[];
  canApplyNow: boolean;
}) {
  return (
    <details className="editor-details edit-details">
      <summary>{canApplyNow ? "意味を編集・修正提案" : "意味の修正を提案"}</summary>
      <ActionForm
        action={submitEditSuggestionWithState}
        className="stacked-form compact-form"
        pendingMessage="修正内容を送信しています…"
      >
        <input type="hidden" name="targetType" value="sense" />
        <input type="hidden" name="targetId" value={sense.id} />
        <input type="hidden" name="returnTo" value={`/terms/${termSlug}#sense-${sense.id}`} />
        <label>
          見出し
          <input name="title" required defaultValue={sense.title} />
        </label>
        <label>
          説明
          <textarea name="description" required minLength={8} rows={3} defaultValue={sense.description} />
        </label>
        <label>
          用法メモ
          <textarea name="usageNote" rows={2} defaultValue={sense.usageNote ?? ""} />
        </label>
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
