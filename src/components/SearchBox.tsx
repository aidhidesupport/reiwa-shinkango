import { Search } from "lucide-react";

type SearchBoxProps = {
  defaultValue?: string;
  autoFocus?: boolean;
};

export function SearchBox({ defaultValue = "", autoFocus = false }: SearchBoxProps) {
  return (
    <form action="/search" className="search-box">
      <Search size={20} aria-hidden="true" />
      <input
        name="q"
        defaultValue={defaultValue}
        autoFocus={autoFocus}
        placeholder="例: エビデンス、コミット、反応度"
      />
      <button type="submit">検索</button>
    </form>
  );
}
