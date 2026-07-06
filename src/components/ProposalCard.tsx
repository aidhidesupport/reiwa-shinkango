import { AlertTriangle, CheckCircle2, MessageSquare, Plus, Scale, Send, ShieldCheck } from "lucide-react";
import {
  addComment,
  addUsageExample,
  evaluateProposal,
  reportComment,
  reportProposal,
  reportUsageExample,
  setRecommendation,
} from "@/app/actions";
import { EVALUATION_LABELS, RECOMMENDATION_LEVELS } from "@/lib/labels";
import { canEditRecommendations } from "@/lib/session";
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

  return (
    <article className="proposal-card" id={`proposal-${proposal.id}`}>
      <div className="proposal-head">
        <div>
          <div className="proposal-title-row">
            <h4>{proposal.text}</h4>
            <span className={`status-badge status-${proposal.status}`}>
              {statusLabels[proposal.status] ?? proposal.status}
            </span>
          </div>
          <p className="muted">投稿: {proposal.createdBy.displayName} / 文体: {proposal.register}</p>
        </div>
        <div className="score-pill">
          <Scale size={16} />
          <span>{score}</span>
        </div>
      </div>

      <dl className="definition-grid compact">
        <div>
          <dt>合う文脈</dt>
          <dd>{proposal.fitContext}</dd>
        </div>
        {proposal.unfitContext ? (
          <div>
            <dt>避けたい文脈</dt>
            <dd>{proposal.unfitContext}</dd>
          </div>
        ) : null}
        {proposal.rationale ? (
          <div>
            <dt>理由</dt>
            <dd>{proposal.rationale}</dd>
          </div>
        ) : null}
      </dl>

      {latestRecommendation ? (
        <div className="recommendation-note">
          <ShieldCheck size={18} />
          <div>
            <strong>{statusLabels[latestRecommendation.level] ?? latestRecommendation.level}: {latestRecommendation.context}</strong>
            <p>{latestRecommendation.rationale}</p>
          </div>
        </div>
      ) : null}

      <div className="examples">
        {proposal.examples.map((example) => (
          <div key={example.id} id={`proposal-${proposal.id}-${example.id}`} className="example-block">
            <div className="example-pair">
              <div>
                <span>元文</span>
                <p>{example.originalSentence}</p>
              </div>
              <div>
                <span>言い換え</span>
                <p>{example.rewrittenSentence}</p>
              </div>
            </div>
            {currentUser ? (
              <details className="report-details compact-report">
                <summary>
                  <AlertTriangle size={15} />
                  使用例を通報
                </summary>
                <form action={reportUsageExample} className="inline-form">
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
                </form>
              </details>
            ) : null}
          </div>
        ))}
      </div>

      {currentUser ? (
        <details className="section-details">
          <summary>
            <Plus size={15} />
            使用例を追加
          </summary>
          <form action={addUsageExample} className="stacked-form compact-form example-form">
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
          </form>
        </details>
      ) : null}

      <div className="label-counts">
        {EVALUATION_LABELS.map((label) => (
          <span key={label.id} className={labelCounts[label.id] ? "label-chip active" : "label-chip"}>
            {label.label} {labelCounts[label.id] ?? 0}
          </span>
        ))}
      </div>

      {currentUser ? (
        <form action={evaluateProposal} className="evaluation-form">
          <input type="hidden" name="proposalId" value={proposal.id} />
          <input type="hidden" name="termSlug" value={termSlug} />
          <div className="checkbox-grid">
            {EVALUATION_LABELS.map((label) => (
              <label key={label.id}>
                <input type="checkbox" name="labels" value={label.id} defaultChecked={selectedLabels.has(label.id)} />
                <span>{label.label}</span>
              </label>
            ))}
          </div>
          <button type="submit" className="button secondary">
            <CheckCircle2 size={17} />
            <span>評価を保存</span>
          </button>
        </form>
      ) : null}

      <div className="comments">
        <h5>
          <MessageSquare size={17} />
          議論
        </h5>
        {proposal.comments.length === 0 ? <p className="muted">まだコメントはありません。</p> : null}
        {proposal.comments.map((comment) => (
          <div key={comment.id} id={`comment-${comment.id}`} className="comment">
            <span>{categoryLabels[comment.category] ?? "その他"} / {comment.user.displayName}</span>
            <p>{comment.body}</p>
            {currentUser ? (
              <details className="report-details compact-report">
                <summary>
                  <AlertTriangle size={15} />
                  コメントを通報
                </summary>
                <form action={reportComment} className="inline-form">
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
                </form>
              </details>
            ) : null}
          </div>
        ))}
        {currentUser ? (
          <form action={addComment} className="inline-form">
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
          </form>
        ) : null}
      </div>

      {currentUser && canEditRecommendations(currentUser.role) ? (
        <details className="editor-details">
          <summary>推奨訳として整理</summary>
          <form action={setRecommendation} className="stacked-form compact-form">
            <input type="hidden" name="senseId" value={senseId} />
            <input type="hidden" name="proposalId" value={proposal.id} />
            <input type="hidden" name="termSlug" value={termSlug} />
            <label>
              推奨レベル
              <select name="level" defaultValue={proposal.status === "active" ? "recommended" : proposal.status}>
                {RECOMMENDATION_LEVELS.map((level) => (
                  <option key={level.id} value={level.id}>{level.label}</option>
                ))}
              </select>
            </label>
            <label>
              文脈
              <input name="context" defaultValue={proposal.fitContext} />
            </label>
            <label>
              根拠
              <textarea name="rationale" defaultValue={proposal.rationale ?? ""} rows={3} />
            </label>
            <button type="submit" className="button">
              <ShieldCheck size={17} />
              <span>推奨に反映</span>
            </button>
          </form>
        </details>
      ) : null}

      {currentUser ? (
        <details className="report-details">
          <summary>
            <AlertTriangle size={15} />
            通報
          </summary>
          <form action={reportProposal} className="inline-form">
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
          </form>
        </details>
      ) : null}
    </article>
  );
}
