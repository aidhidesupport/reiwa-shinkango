import {
  AlertTriangle,
  CheckCircle2,
  MessageSquare,
  Plus,
  Quote,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import {
  addCommentWithState,
  addUsageExampleWithState,
  evaluateProposalWithState,
  reportCommentWithState,
  reportProposalWithState,
  reportUsageExampleWithState,
  submitEditSuggestionWithState,
} from "@/app/actions";
import { ActionForm } from "@/components/ActionForm";
import { ProposalFields } from "@/components/TermForms";
import {
  EVALUATION_LABEL_GROUPS,
  EVALUATION_LABELS,
  REGISTERS,
} from "@/lib/labels";
import { canEditContent } from "@/lib/session";
import { countLabels, scoreProposal } from "@/lib/scoring";
import { splitLabels } from "@/lib/normalize";

type User = {
  id: string;
  displayName: string;
  role: string;
};

type ProposalCardProps = {
  termId: string;
  termSlug: string;
  senseId: string;
  proposal: {
    id: string;
    text: string;
    fitContext: string;
    unfitContext: string | null;
    rationale: string | null;
    pros: string | null;
    cons: string | null;
    register: string;
    status: string;
    createdBy: { displayName: string };
    examples: Array<{
      id: string;
      originalSentence: string;
      rewrittenSentence: string;
      contextNote: string | null;
      status: string;
    }>;
    evaluations: Array<{
      id: string;
      userId: string;
      labelsCsv: string;
    }>;
    comments: Array<{
      id: string;
      category: string;
      body: string;
      status: string;
      createdAt: Date;
      user: { displayName: string };
    }>;
    recommendations: Array<{
      id: string;
      level: string;
      context: string;
      rationale: string;
    }>;
  };
  currentUser: User | null;
};

const statusLabels: Record<string, string> = {
  draft: "草案",
  active: "検討中",
  tentative: "暫定推奨",
  recommended: "推奨",
  limited: "限定推奨",
  discouraged: "非推奨",
  hidden: "非表示",
};

const categoryLabels: Record<string, string> = {
  meaning: "意味",
  tone: "語感",
  usage: "使用例",
  domain: "分野",
  alternative: "代案",
  other: "その他",
};

export function ProposalCard({ termId, termSlug, senseId, proposal, currentUser }: ProposalCardProps) {
  const labelCounts = countLabels(proposal.evaluations);
  const userEvaluation = proposal.evaluations.find((evaluation) => evaluation.userId === currentUser?.id);
  const selectedLabels = new Set(splitLabels(userEvaluation?.labelsCsv));
  const score = scoreProposal(proposal);
  const latestRecommendation = proposal.recommendations.at(-1);
  const registerLabel = REGISTERS.find((register) => register.id === proposal.register)?.label ?? proposal.register;
  const hasSupportingDetails = Boolean(proposal.rationale || proposal.pros || proposal.cons);
  const countedEvaluationLabels = EVALUATION_LABELS
    .filter((label) => (labelCounts[label.id] ?? 0) > 0)
    .sort((a, b) => (labelCounts[b.id] ?? 0) - (labelCounts[a.id] ?? 0));
  const evaluationSummaryGroups = EVALUATION_LABEL_GROUPS.map((group) => ({
    ...group,
    countedLabels: group.labels.filter((label) => (labelCounts[label.id] ?? 0) > 0),
  }));
  const cautionLabelIds = new Set<string>(
    EVALUATION_LABEL_GROUPS.find((group) => group.id === "caution")?.labels.map((label) => label.id) ?? [],
  );
  const canInteract = proposal.status !== "hidden" ? currentUser : null;

  return (
    <article
      className={proposal.status === "hidden" ? "proposal-card hidden-content-preview" : "proposal-card"}
      id={`proposal-${proposal.id}`}
    >
      <header className="proposal-head">
        <div className="proposal-identity">
          <div className="proposal-kicker">
            <span>日本語案</span>
            <span>{registerLabel}</span>
          </div>
          <div className="proposal-title-row">
            <h3>{proposal.text}</h3>
            <span className={`status-badge status-${proposal.status}`}>
              {statusLabels[proposal.status] ?? proposal.status}
            </span>
          </div>
          <p className="proposal-byline">投稿: {proposal.createdBy.displayName}</p>
          <div className="proposal-evaluation-snapshot">
            <Users size={14} />
            <strong>{proposal.evaluations.length > 0 ? `評価 ${proposal.evaluations.length}人` : "評価はまだありません"}</strong>
            {countedEvaluationLabels.slice(0, 2).map((label) => (
              <span
                key={label.id}
                className={cautionLabelIds.has(label.id) ? "quick-label caution" : "quick-label"}
              >
                {label.label} {labelCounts[label.id]}
              </span>
            ))}
          </div>
        </div>
        <div
          className="score-pill"
          aria-label={`参考スコア ${score}`}
          title="評価、使用例、推奨状況から算出した比較用の参考値"
        >
          <span>参考スコア</span>
          <strong>{score}</strong>
        </div>
      </header>

      {latestRecommendation ? (
        <div className="recommendation-note">
          <ShieldCheck size={18} />
          <div>
            <strong>{statusLabels[latestRecommendation.level] ?? latestRecommendation.level}: {latestRecommendation.context}</strong>
            <p>{latestRecommendation.rationale}</p>
          </div>
        </div>
      ) : null}

      <section className="proposal-context">
        <div className="proposal-section-label">
          <Sparkles size={16} />
          <h4>合う場面</h4>
        </div>
        <p>{proposal.fitContext}</p>
        {proposal.unfitContext ? (
          <p className="proposal-caution"><strong>避けたい場面:</strong> {proposal.unfitContext}</p>
        ) : null}
      </section>

      {hasSupportingDetails ? (
        <dl className="proposal-support-grid">
          {proposal.rationale ? (
            <div>
              <dt>この案を選ぶ理由</dt>
              <dd>{proposal.rationale}</dd>
            </div>
          ) : null}
          {proposal.pros ? (
            <div className="proposal-strength">
              <dt>良い点</dt>
              <dd>{proposal.pros}</dd>
            </div>
          ) : null}
          {proposal.cons ? (
            <div className="proposal-weakness">
              <dt>弱い点</dt>
              <dd>{proposal.cons}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      <section className="proposal-examples-group">
        <div className="proposal-subheading">
          <h4>
            <Quote size={17} />
            言い換え例
          </h4>
          <span>{proposal.examples.length > 0 ? `${proposal.examples.length}件` : "未登録"}</span>
        </div>
        {proposal.examples.length === 0 ? (
          <p className="proposal-empty-note">この日本語案を文章で使った例は、まだありません。</p>
        ) : null}
        <div className="examples">
          {proposal.examples.map((example) => (
            <div
              key={example.id}
              id={`proposal-${proposal.id}-${example.id}`}
              className={example.status === "hidden" ? "example-block hidden-content-preview" : "example-block"}
            >
              {example.status === "hidden" ? <strong className="hidden-preview-label">非公開中の使用例</strong> : null}
              <div className="example-pair">
                <div>
                  <span>元の言葉を使った文</span>
                  <p>{example.originalSentence}</p>
                </div>
                <div>
                  <span>日本語案に言い換えた文</span>
                  <p>{example.rewrittenSentence}</p>
                </div>
              </div>
              {canInteract && example.status !== "hidden" ? (
                <details className="report-details compact-report">
                  <summary>
                    <AlertTriangle size={15} />
                    使用例を通報
                  </summary>
                  <ActionForm action={reportUsageExampleWithState} className="inline-form" pendingMessage="通報しています…">
                    <input type="hidden" name="exampleId" value={example.id} />
                    <input type="hidden" name="proposalId" value={proposal.id} />
                    <input type="hidden" name="termSlug" value={termSlug} />
                    <select name="reason" defaultValue="meaning_error" aria-label="通報理由">
                      <option value="meaning_error">意味の誤り</option>
                      <option value="duplicate">重複</option>
                      <option value="abuse">攻撃的</option>
                      <option value="copyright">権利問題</option>
                      <option value="other">その他</option>
                    </select>
                    <input name="detail" placeholder="補足" />
                    <button type="submit">送信</button>
                  </ActionForm>
                </details>
              ) : null}
              {canInteract && example.status !== "hidden" ? (
                <details className="editor-details edit-details compact-edit">
                  <summary>{canEditContent(canInteract.role) ? "使用例を編集・修正提案" : "使用例の修正を提案"}</summary>
                  <ActionForm
                    action={submitEditSuggestionWithState}
                    className="stacked-form compact-form"
                    pendingMessage="修正内容を送信しています…"
                  >
                    <input type="hidden" name="targetType" value="example" />
                    <input type="hidden" name="targetId" value={example.id} />
                    <input type="hidden" name="returnTo" value={`/terms/${termSlug}#proposal-${proposal.id}-${example.id}`} />
                    <label>
                      元文
                      <textarea name="originalSentence" required minLength={3} rows={3} defaultValue={example.originalSentence} />
                    </label>
                    <label>
                      言い換え
                      <textarea name="rewrittenSentence" required minLength={3} rows={3} defaultValue={example.rewrittenSentence} />
                    </label>
                    <label>
                      文脈メモ
                      <input name="contextNote" defaultValue={example.contextNote ?? ""} />
                    </label>
                    <label>
                      修正理由
                      <textarea name="reason" required minLength={5} rows={2} />
                    </label>
                    {canEditContent(canInteract.role) ? (
                      <label className="check-line">
                        <input type="checkbox" name="applyNow" value="1" />
                        編集者権限で直ちに反映する
                      </label>
                    ) : null}
                    <button type="submit" className="button secondary">修正内容を送信</button>
                  </ActionForm>
                </details>
              ) : null}
            </div>
          ))}
        </div>

        {canInteract ? (
          <details className="section-details">
            <summary>
              <Plus size={15} />
              使用例を追加
            </summary>
            <ActionForm action={addUsageExampleWithState} className="stacked-form compact-form example-form" pendingMessage="使用例を追加しています…">
              <input type="hidden" name="termId" value={termId} />
              <input type="hidden" name="senseId" value={senseId} />
              <input type="hidden" name="proposalId" value={proposal.id} />
              <input type="hidden" name="termSlug" value={termSlug} />
              <div className="form-grid">
                <label>
                  元文
                  <textarea name="originalSentence" required rows={3} />
                </label>
                <label>
                  言い換え
                  <textarea name="rewrittenSentence" required rows={3} />
                </label>
              </div>
              <label>
                文脈メモ
                <input name="contextNote" placeholder="例: 会議資料、利用者向け説明" />
              </label>
              <button type="submit" className="button secondary">
                <Plus size={17} />
                <span>使用例を追加</span>
              </button>
            </ActionForm>
          </details>
        ) : null}
      </section>

      <section className="proposal-feedback">
        <div className="proposal-subheading">
          <h4>
            <CheckCircle2 size={17} />
            この案への評価
          </h4>
          <span>{proposal.evaluations.length}人</span>
        </div>
        <p className="proposal-feedback-help">評価した人が、この日本語案に当てはまると感じた特徴です。</p>
        <div className="evaluation-summary-groups">
          {evaluationSummaryGroups.map((group) => (
            <div key={group.id} className={`evaluation-summary-group ${group.id}`}>
              <strong>{group.label}</strong>
              <div className="label-counts">
                {group.countedLabels.map((label) => (
                  <span key={label.id} className={`label-chip active ${group.id}`}>
                    {label.label} {labelCounts[label.id]}
                  </span>
                ))}
                {group.countedLabels.length === 0 ? (
                  <span className="muted">
                    {group.id === "strength" ? "まだ選ばれていません。" : "指摘はありません。"}
                  </span>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        {canInteract ? (
          <details className="section-details evaluation-details">
            <summary>自分の評価を付ける・変更する</summary>
            <ActionForm action={evaluateProposalWithState} className="evaluation-form" pendingMessage="評価を保存しています…">
              <input type="hidden" name="proposalId" value={proposal.id} />
              <input type="hidden" name="termSlug" value={termSlug} />
              <p className="evaluation-instructions">
                実際にこの案を使う場面を想像し、当てはまるものを複数選べます。良いところと注意点は同時に選択できます。
                すべて外して保存すると、自分の評価を取り消せます。
              </p>
              <div className="evaluation-groups">
                {EVALUATION_LABEL_GROUPS.map((group) => (
                  <fieldset key={group.id} className={`evaluation-group ${group.id}`}>
                    <legend>{group.label}</legend>
                    <p>{group.description}</p>
                    <div className="checkbox-grid">
                      {group.labels.map((label) => (
                        <label key={label.id}>
                          <input
                            type="checkbox"
                            name="labels"
                            value={label.id}
                            defaultChecked={selectedLabels.has(label.id)}
                          />
                          <span>
                            <strong>{label.label}</strong>
                            <small>{label.description}</small>
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                ))}
              </div>
              <button type="submit" className="button secondary">
                <CheckCircle2 size={17} />
                <span>選んだ評価を保存</span>
              </button>
            </ActionForm>
          </details>
        ) : null}
      </section>

      {canInteract ? (
        <details className="editor-details edit-details">
          <summary>{canEditContent(canInteract.role) ? "日本語案を編集・修正提案" : "日本語案の修正を提案"}</summary>
          <ActionForm
            action={submitEditSuggestionWithState}
            className="stacked-form compact-form"
            pendingMessage="修正内容を送信しています…"
          >
            <input type="hidden" name="targetType" value="proposal" />
            <input type="hidden" name="targetId" value={proposal.id} />
            <input type="hidden" name="returnTo" value={`/terms/${termSlug}#proposal-${proposal.id}`} />
            <ProposalFields
              idPrefix={`edit-proposal-${proposal.id}`}
              values={{
                proposalText: proposal.text,
                register: proposal.register,
                fitContext: proposal.fitContext,
                unfitContext: proposal.unfitContext ?? "",
                rationale: proposal.rationale ?? "",
                pros: proposal.pros ?? "",
                cons: proposal.cons ?? "",
              }}
            />
            <label>
              修正理由
              <textarea name="reason" required minLength={5} rows={2} placeholder="どこを、なぜ直すか" />
            </label>
            {canEditContent(canInteract.role) ? (
              <label className="check-line">
                <input type="checkbox" name="applyNow" value="1" />
                編集者権限で直ちに反映する
              </label>
            ) : null}
            <button type="submit" className="button secondary">修正内容を送信</button>
          </ActionForm>
        </details>
      ) : null}

      <details className="proposal-discussion">
        <summary>
          <MessageSquare size={17} />
          この日本語案についての議論
          <span>{proposal.comments.length}件</span>
        </summary>
        <div className="comments">
          {proposal.comments.length === 0 ? <p className="muted">まだコメントはありません。</p> : null}
          {proposal.comments.map((comment) => (
            <div
              key={comment.id}
              id={`comment-${comment.id}`}
              className={comment.status === "hidden" ? "comment hidden-content-preview" : "comment"}
            >
              {comment.status === "hidden" ? <strong className="hidden-preview-label">非公開中のコメント</strong> : null}
              <span>{categoryLabels[comment.category] ?? "その他"} / {comment.user.displayName}</span>
              <p>{comment.body}</p>
              {canInteract && comment.status !== "hidden" ? (
                <details className="report-details compact-report">
                  <summary>
                    <AlertTriangle size={15} />
                    コメントを通報
                  </summary>
                  <ActionForm action={reportCommentWithState} className="inline-form" pendingMessage="通報しています…">
                    <input type="hidden" name="commentId" value={comment.id} />
                    <input type="hidden" name="proposalId" value={proposal.id} />
                    <input type="hidden" name="termSlug" value={termSlug} />
                    <select name="reason" defaultValue="abuse" aria-label="通報理由">
                      <option value="meaning_error">意味の誤り</option>
                      <option value="duplicate">重複</option>
                      <option value="abuse">攻撃的</option>
                      <option value="copyright">権利問題</option>
                      <option value="other">その他</option>
                    </select>
                    <input name="detail" placeholder="補足" />
                    <button type="submit">送信</button>
                  </ActionForm>
                </details>
              ) : null}
            </div>
          ))}
          {canInteract ? (
            <ActionForm action={addCommentWithState} className="inline-form" pendingMessage="コメントを投稿しています…">
              <input type="hidden" name="proposalId" value={proposal.id} />
              <input type="hidden" name="termSlug" value={termSlug} />
              <select name="category" aria-label="コメント種別" defaultValue="usage">
                <option value="meaning">意味</option>
                <option value="tone">語感</option>
                <option value="usage">使用例</option>
                <option value="domain">分野</option>
                <option value="alternative">代案</option>
                <option value="other">その他</option>
              </select>
              <input name="body" placeholder="論点や代案を記入" />
              <button type="submit" className="icon-button" aria-label="コメントを投稿">
                <Send size={17} />
              </button>
            </ActionForm>
          ) : null}
        </div>
      </details>

      {canInteract ? (
        <details className="report-details">
          <summary>
            <AlertTriangle size={15} />
            通報
          </summary>
          <ActionForm action={reportProposalWithState} className="inline-form" pendingMessage="通報しています…">
            <input type="hidden" name="proposalId" value={proposal.id} />
            <input type="hidden" name="termSlug" value={termSlug} />
            <select name="reason" defaultValue="meaning_error" aria-label="通報理由">
              <option value="meaning_error">意味の誤り</option>
              <option value="duplicate">重複</option>
              <option value="abuse">攻撃的</option>
              <option value="copyright">権利問題</option>
              <option value="other">その他</option>
            </select>
            <input name="detail" placeholder="補足" />
            <button type="submit">送信</button>
          </ActionForm>
        </details>
      ) : null}
    </article>
  );
}
