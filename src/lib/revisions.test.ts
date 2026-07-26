import { describe, expect, it } from "vitest";
import { diffRevisionJson } from "./revisions";

describe("revision diffs", () => {
  it("内部フィールド名と状態値を日本語で表示する", () => {
    expect(diffRevisionJson('{"text":"根拠","status":"active"}', '{"text":"根拠","status":"recommended"}')).toEqual([
      { key: "text", label: "日本語案", before: "根拠", after: "根拠", changed: false },
      { key: "status", label: "公開・検討状態", before: "公開中・検討中", after: "推奨", changed: true },
    ]);
  });

  it("変更前の値がないときは「なし」と表示する", () => {
    expect(diffRevisionJson(null, '{"headword":"エビデンス"}')).toEqual([
      { key: "headword", label: "言葉", before: "なし", after: "エビデンス", changed: true },
    ]);
  });

  it("分野IDを名称へ変換し、配列を読みやすく表示する", () => {
    const domains = new Map([["domain-1", "行政"]]);
    expect(diffRevisionJson(
      '{"domainId":null,"tags":[]}',
      '{"domainId":"domain-1","tags":["制度","説明責任"]}',
      { domainNames: domains },
    )).toEqual([
      { key: "domainId", label: "分野", before: "なし", after: "行政", changed: true },
      { key: "tags", label: "タグ", before: "なし", after: "制度、説明責任", changed: true },
    ]);
  });
});
