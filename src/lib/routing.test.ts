import { describe, expect, it } from "vitest";
import { decodePathSegment } from "./routing";

describe("route path segments", () => {
  it("decodes percent-encoded Japanese slugs", () => {
    expect(decodePathSegment("e2e%E3%83%AF%E3%83%BC%E3%83%89")).toBe("e2eワード");
  });

  it("leaves already decoded and malformed values usable", () => {
    expect(decodePathSegment("日本語")).toBe("日本語");
    expect(decodePathSegment("bad%slug")).toBe("bad%slug");
  });
});
