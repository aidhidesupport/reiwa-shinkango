import Link from "next/link";
import { Check, Minus, ShieldCheck } from "lucide-react";
import {
  APP_ROLES,
  PERMISSION_ROWS,
  ROLE_LABELS,
  hasPermission,
} from "@/lib/permissions";

export const metadata = {
  title: "権限表",
  description: "令和新漢語の閲覧者、利用者、信頼ユーザー、編集者、管理者が行える操作の一覧です。",
};

export default function PermissionsPage() {
  return (
    <div className="page-shell">
      <section className="page-title">
        <p className="eyebrow">運用方針</p>
        <h1>役割と権限</h1>
        <p>
          役割ごとに行える操作を明示しています。編集・運営操作は画面表示だけでなく、保存時にも同じ権限定義で検査します。
        </p>
      </section>

      <div className="permission-legend" aria-label="記号の説明">
        <span><Check size={15} aria-hidden="true" /> 実行できる</span>
        <span><Minus size={15} aria-hidden="true" /> 実行できない</span>
      </div>

      <div className="permission-table-wrap">
        <table className="permission-table">
          <thead>
            <tr>
              <th scope="col">操作</th>
              {APP_ROLES.map((role) => (
                <th scope="col" key={role}>{ROLE_LABELS[role]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSION_ROWS.map((row) => (
              <tr key={row.permission}>
                <th scope="row">
                  <strong>{row.label}</strong>
                  <span>{row.note}</span>
                </th>
                {APP_ROLES.map((role) => {
                  const allowed = hasPermission(role, row.permission);
                  return (
                    <td
                      key={role}
                      className={allowed ? "allowed" : "denied"}
                      aria-label={`${ROLE_LABELS[role]}: ${allowed ? "実行できる" : "実行できない"}`}
                    >
                      {allowed
                        ? <Check size={18} aria-hidden="true" />
                        : <Minus size={18} aria-hidden="true" />}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="permission-notes">
        <ShieldCheck size={22} aria-hidden="true" />
        <div>
          <h2>共通の安全条件</h2>
          <p>
            投稿系の操作にはログインとメール確認が必要です。停止中・退会済み・一時パスワード変更前のアカウントは、
            表で許可された役割でも操作できません。非公開・復元・統合・差し戻しには理由を記録します。
          </p>
        </div>
      </section>

      <div className="document-links">
        <Link href="/rules" className="text-link">投稿ルールへ戻る</Link>
        <Link href="/rules/classification" className="text-link">分野・タグの分類ルール</Link>
      </div>
    </div>
  );
}
