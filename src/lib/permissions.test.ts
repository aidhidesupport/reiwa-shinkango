import { describe, expect, it } from "vitest";
import {
  APP_PERMISSIONS,
  APP_ROLES,
  PERMISSION_ROWS,
  ROLE_PERMISSIONS,
  hasPermission,
} from "./permissions";

describe("権限表", () => {
  it("画面に出す全操作が権限定義と一対一で対応する", () => {
    expect(PERMISSION_ROWS.map((row) => row.permission)).toEqual(APP_PERMISSIONS);
  });

  it("編集者は編集・モデレーションができ、利用者管理はできない", () => {
    expect(hasPermission("editor", "edit_content")).toBe(true);
    expect(hasPermission("editor", "moderate_content")).toBe(true);
    expect(hasPermission("editor", "merge_terms")).toBe(true);
    expect(hasPermission("editor", "manage_users")).toBe(false);
  });

  it("管理者だけが利用者管理・一時パスワード・削除処理を行える", () => {
    for (const role of APP_ROLES) {
      const expected = role === "admin";
      expect(hasPermission(role, "manage_users")).toBe(expected);
      expect(hasPermission(role, "issue_temporary_passwords")).toBe(expected);
      expect(hasPermission(role, "process_account_deletions")).toBe(expected);
    }
  });

  it("未定義ロールを権限ありとして扱わない", () => {
    for (const permission of APP_PERMISSIONS) {
      expect(hasPermission("unknown", permission)).toBe(false);
    }
  });

  it("全ロールの権限に未定義値が混ざらない", () => {
    const permissions = new Set(APP_PERMISSIONS);
    for (const role of APP_ROLES) {
      expect(ROLE_PERMISSIONS[role].every((permission) => permissions.has(permission))).toBe(true);
    }
  });
});
