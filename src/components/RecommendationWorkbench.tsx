import { BarChart3, CheckCircle2, ShieldCheck, Users } from "lucide-react";
import { setRecommendationWithState } from "@/app/actions";
import { ActionForm } from "@/components/ActionForm";
import { EVALUATION_LABEL_GROUPS, RECOMMENDATION_LEVELS } from "@/lib/labels";
import { countLabels, scoreProposal } from "@/lib/scoring";

type RecommendationWorkbenchProps = {
  senseId: string;
  termSlug: string;
  proposals: Array<{
    id: string;
    text: string;
    fitContext: string;
    rationale: string | null;
    status: string;
    examples: unknown[];
    evaluations: Array<{
      labelsCsv: string;
    }>;
    recommendations: Array<{
      level: string;
      context: string;
      rationale: string;
    }>;
  }>;
};

const statusLabels: Record<string, string> = {
  draft: "草案",
  active: "未整理",
  tentative: "暫定推奨",
  recommended: "推奨",
  limited: "限定推奨",
  discouraged: "非推奨",
};

const recommendationLevelIds = new Set(RECOMMENDATION_LEVELS.map((level) => level.id));

export function RecommendationWorkbench({
  senseId,
  termSlug,
  proposals,
}: RecommendationWorkbenchProps) {
  if (proposals.length === 0) return null;

  return (
    <section className="recommendation-workbench" aria-labelledby={`recommendation-workbench-${senseId}`}>
      <header className="recommendation-workbench-head">
        <div>
          <p className="eyebrow">編集者向け</p>
          <h3 id={`recommendation-workbench-${senseId}`}>
            <ShieldCheck size={19} />
            推奨する日本語案を比較・決定
          </h3>
        </div>
        <p>合う場面と評価の傾向を比較し、推奨レベル・対象場面・判断根拠を記録します。</p>
      </header>

      <dl className="recommendation-level-guide">
        {RECOMMENDATION_LEVELS.map((level) => (
          <div key={level.id}>
            <dt>{level.label}</dt>
            <dd>{level.description}</dd>
          </div>
        ))}
      </dl>

      <div className="recommendation-comparison">
        {proposals.map((proposal) => {
          const labelCounts = countLabels(proposal.evaluations);
          const latestRecommendation = proposal.recommendations.at(-1);
          const defaultLevel = recommendationLevelIds.has(
            proposal.status as (typeof RECOMMENDATION_LEVELS)[number]["id"],
          )
            ? proposal.status
            : "tentative";
          const summaryGroups = EVALUATION_LABEL_GROUPS.map((group) => ({
            ...group,
            labels: group.labels
              .filter((label) => (labelCounts[label.id] ?? 0) > 0)
              .sort((a, b) => (labelCounts[b.id] ?? 0) - (labelCounts[a.id] ?? 0))
              .slice(0, 2),
          }));

          return (
            <article key={proposal.id} className="recommendation-option">
              <header>
                <div>
                  <span className="recommendation-option-label">日本語案</span>
                  <h4>{proposal.text}</h4>
                </div>
                <span className={`status-badge status-${proposal.status}`}>
                  {statusLabels[proposal.status] ?? proposal.status}
                </span>
              </header>

              <div className="recommendation-fit-context">
                <strong>合う場面</strong>
                <p>{proposal.fitContext}</p>
              </div>

              <div className="recommendation-option-metrics">
                <span>
                  <BarChart3 size={14} />
                  参考スコア {scoreProposal(proposal)}
                </span>
                <span>
                  <Users size={14} />
                  評価 {proposal.evaluations.length}人
                </span>
                <span>
                  <CheckCircle2 size={14} />
                  使用例 {proposal.examples.length}件
                </span>
              </div>

              <div className="recommendation-evaluation-brief">
                {summaryGroups.map((group) => (
                  <div key={group.id}>
                    <strong>{group.label}</strong>
                    <p>
                      {group.labels.length > 0
                        ? group.labels.map((label) => `${label.label} ${labelCounts[label.id]}`).join("・")
                        : group.id === "strength"
                          ? "まだ選ばれていません"
                          : "指摘はありません"}
                    </p>
                  </div>
                ))}
              </div>

              <details className="recommendation-decision">
                <summary>この案の推奨内容を設定</summary>
                <ActionForm
                  action={setRecommendationWithState}
                  className="stacked-form compact-form"
                  pendingMessage="推奨する日本語案を保存しています…"
                >
                  <input type="hidden" name="senseId" value={senseId} />
                  <input type="hidden" name="proposalId" value={proposal.id} />
                  <input type="hidden" name="termSlug" value={termSlug} />
                  <label>
                    推奨レベル
                    <select name="level" defaultValue={defaultLevel}>
                      {RECOMMENDATION_LEVELS.map((level) => (
                        <option key={level.id} value={level.id}>{level.label}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    推奨する場面
                    <input
                      name="context"
                      required
                      defaultValue={latestRecommendation?.context ?? proposal.fitContext}
                    />
                  </label>
                  <label>
                    判断根拠
                    <textarea
                      name="rationale"
                      required
                      minLength={5}
                      rows={3}
                      defaultValue={latestRecommendation?.rationale ?? proposal.rationale ?? ""}
                      placeholder="評価結果、意味の正確さ、使う場面などを記録"
                    />
                  </label>
                  <button type="submit" className="button">
                    <ShieldCheck size={17} />
                    <span>この案の推奨内容を保存</span>
                  </button>
                </ActionForm>
              </details>
            </article>
          );
        })}
      </div>
    </section>
  );
}
