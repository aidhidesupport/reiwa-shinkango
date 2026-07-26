import Link from "next/link";
import { Search } from "lucide-react";

type SearchBoxProps = {
  defaultValue?: string;
  autoFocus?: boolean;
  filters?: {
    scope: string;
    domain: string;
    tag: string;
    sort: string;
    domains: Array<{ slug: string; name: string }>;
    tags: Array<{ slug: string; name: string }>;
  };
};

export function SearchBox({ defaultValue = "", autoFocus = false, filters }: SearchBoxProps) {
  return (
    <form action="/search" className={`search-box${filters ? " advanced-search" : ""}`}>
      <div className="search-query-row">
        <Search size={20} aria-hidden="true" />
        <input
          name="q"
          aria-label="検索語"
          defaultValue={defaultValue}
          autoFocus={autoFocus}
          placeholder="例: エビデンス、コミット、反応度"
        />
        <button type="submit">検索</button>
      </div>
      {filters ? (
        <div className="search-filters">
          <label>
            検索対象
            <select name="scope" defaultValue={filters.scope}>
              <option value="all">すべて</option>
              <option value="terms">言葉・使われ方</option>
              <option value="proposals">日本語案</option>
            </select>
          </label>
          <label>
            分野
            <select name="domain" defaultValue={filters.domain}>
              <option value="">すべての分野</option>
              {filters.domains.map((domain) => (
                <option key={domain.slug} value={domain.slug}>{domain.name}</option>
              ))}
            </select>
          </label>
          <label>
            タグ
            <select name="tag" defaultValue={filters.tag}>
              <option value="">すべてのタグ</option>
              {filters.tags.map((tag) => (
                <option key={tag.slug} value={tag.slug}>{tag.name}</option>
              ))}
            </select>
          </label>
          <label>
            並び順
            <select name="sort" defaultValue={filters.sort}>
              <option value="relevance">関連度順</option>
              <option value="popular">人気順</option>
              <option value="newest">新着順</option>
              <option value="evaluation">評価順</option>
            </select>
          </label>
          <Link href="/search" className="search-reset">条件をリセット</Link>
        </div>
      ) : null}
    </form>
  );
}
