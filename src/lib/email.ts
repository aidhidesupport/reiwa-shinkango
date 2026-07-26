import { appendFile, readFile } from "node:fs/promises";
import nodemailer, { type Transporter } from "nodemailer";

type EmailKind = "email-verification" | "password-reset" | "password-changed";

type OutgoingEmail = {
  kind: EmailKind;
  to: string;
  subject: string;
  text: string;
  html: string;
  resetUrl?: string;
  createdAt: string;
};

type MailGlobals = typeof globalThis & {
  __reiwaSmtpTransporter?: Transporter;
};

const mailGlobals = globalThis as MailGlobals;

function smtpPort() {
  const value = Number(process.env.SMTP_PORT ?? "465");
  if (!Number.isInteger(value) || value < 1 || value > 65535) {
    throw new Error("SMTP_PORT must be a valid port number.");
  }
  return value;
}

function smtpTransporter() {
  if (mailGlobals.__reiwaSmtpTransporter) return mailGlobals.__reiwaSmtpTransporter;

  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const password = process.env.SMTP_PASSWORD;
  if (!host || !user || !password) {
    throw new Error("SMTP settings are incomplete.");
  }

  const port = smtpPort();
  const secure = process.env.SMTP_SECURE
    ? process.env.SMTP_SECURE === "true"
    : port === 465;

  mailGlobals.__reiwaSmtpTransporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass: password },
    connectionTimeout: 8_000,
    greetingTimeout: 8_000,
    socketTimeout: 12_000,
    disableFileAccess: true,
    disableUrlAccess: true,
  });
  return mailGlobals.__reiwaSmtpTransporter;
}

async function storeTestEmail(email: OutgoingEmail) {
  const mailboxPath = process.env.E2E_MAILBOX_PATH;
  if (!mailboxPath) throw new Error("E2E_MAILBOX_PATH is not configured.");
  await appendFile(mailboxPath, `${JSON.stringify(email)}\n`, { encoding: "utf8", mode: 0o600 });
}

async function deliverEmail(email: OutgoingEmail) {
  if (process.env.E2E_TEST_MODE === "1") {
    await storeTestEmail(email);
    return;
  }

  const from = process.env.EMAIL_FROM?.trim() || process.env.SMTP_USER?.trim();
  if (!from) {
    if (process.env.NODE_ENV === "production") throw new Error("EMAIL_FROM is not configured.");
    return;
  }

  await smtpTransporter().sendMail({
    from,
    to: email.to,
    subject: email.subject,
    text: email.text,
    html: email.html,
  });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

export async function sendPasswordResetEmail(to: string, resetUrl: string, expiresInMinutes: number) {
  const safeResetUrl = escapeHtml(resetUrl);
  await deliverEmail({
    kind: "password-reset",
    to,
    subject: "令和新漢語 パスワード再設定のご案内",
    text: [
      "令和新漢語のパスワード再設定が申請されました。",
      `次のURLを${expiresInMinutes}分以内に開いて、新しいパスワードを設定してください。`,
      resetUrl,
      "",
      "心当たりがない場合は、このメールを無視してください。パスワードは変更されません。",
    ].join("\n"),
    html: [
      "<p>令和新漢語のパスワード再設定が申請されました。</p>",
      `<p>次のリンクを${expiresInMinutes}分以内に開いて、新しいパスワードを設定してください。</p>`,
      `<p><a href="${safeResetUrl}">パスワードを再設定する</a></p>`,
      "<p>心当たりがない場合は、このメールを無視してください。パスワードは変更されません。</p>",
    ].join(""),
    resetUrl,
    createdAt: new Date().toISOString(),
  });
}

export async function sendEmailVerificationEmail(to: string, verificationUrl: string, expiresInHours: number) {
  const safeVerificationUrl = escapeHtml(verificationUrl);
  await deliverEmail({
    kind: "email-verification",
    to,
    subject: "令和新漢語 メールアドレス確認のご案内",
    text: [
      "令和新漢語への登録ありがとうございます。",
      `次のURLを${expiresInHours}時間以内に開いて、メールアドレスを確認してください。`,
      verificationUrl,
      "",
      "心当たりがない場合は、このメールを無視してください。",
    ].join("\n"),
    html: [
      "<p>令和新漢語への登録ありがとうございます。</p>",
      `<p>次のリンクを${expiresInHours}時間以内に開いて、メールアドレスを確認してください。</p>`,
      `<p><a href="${safeVerificationUrl}">メールアドレスを確認する</a></p>`,
      "<p>心当たりがない場合は、このメールを無視してください。</p>",
    ].join(""),
    resetUrl: verificationUrl,
    createdAt: new Date().toISOString(),
  });
}

export async function sendPasswordChangedEmail(to: string) {
  await deliverEmail({
    kind: "password-changed",
    to,
    subject: "令和新漢語 パスワード変更のお知らせ",
    text: [
      "令和新漢語のパスワードが変更されました。",
      "心当たりがない場合は、運営窓口へ至急ご連絡ください。",
    ].join("\n"),
    html: [
      "<p>令和新漢語のパスワードが変更されました。</p>",
      "<p>心当たりがない場合は、運営窓口へ至急ご連絡ください。</p>",
    ].join(""),
    createdAt: new Date().toISOString(),
  });
}

export async function latestTestEmail(to: string, kind?: EmailKind) {
  if (process.env.E2E_TEST_MODE !== "1") return null;
  const mailboxPath = process.env.E2E_MAILBOX_PATH;
  if (!mailboxPath) return null;
  const contents = await readFile(mailboxPath, "utf8").catch(() => "");
  const emails = contents
    .split("\n")
    .filter(Boolean)
    .flatMap((line) => {
      try {
        return [JSON.parse(line) as OutgoingEmail];
      } catch {
        return [];
      }
    });
  return emails
    .reverse()
    .find((email) => email.to === to && (!kind || email.kind === kind)) ?? null;
}
