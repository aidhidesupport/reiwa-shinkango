import { describe, expect, it } from "vitest";
import { diffRevisionJson } from "./revisions";

describe("revision diffs", () => {
  it("shows changed fields across before and after JSON", () => {
    expect(diffRevisionJson('{"text":"根拠","status":"active"}', '{"text":"根拠","status":"recommended"}')).toEqual([
      { key: "text", before: "根拠", after: "根拠", changed: false },
      { key: "status", before: "active", after: "recommended", changed: true },
    ]);
  });

  it("uses なし for missing before values", () => {
    expect(diffRevisionJson(null, '{"headword":"エビデンス"}')).toEqual([
      { key: "headword", before: "なし", after: "エビデンス", changed: true },
    ]);
  });
});

