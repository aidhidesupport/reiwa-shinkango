import Link from "next/link";
import { Plus } from "lucide-react";

type EmptyStateProps = {
  title: string;
  body: string;
  actionLabel?: string;
  actionHref?: string;
};

export function EmptyState({ title, body, actionLabel, actionHref }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <h2>{title}</h2>
      <p>{body}</p>
      {actionHref && actionLabel ? (
        <Link href={actionHref} className="button">
          <Plus size={17} />
          <span>{actionLabel}</span>
        </Link>
      ) : null}
    </div>
  );
}
