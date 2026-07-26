const allowLocal = process.env.ALLOW_INSECURE_LOCAL_PRODUCTION === "1";
const errors = [];
const warnings = [];
const reservedEmailDomainPattern = /@(example\.(com|net|org)|.+\.(test|invalid|example|localhost|local))$/i;
const placeholderPattern = /(placeholder|change[-_]?me|replace[-_]?with|your[-_]?domain|project[-_]?ref)/i;

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) errors.push(`${name} is required.`);
  return value ?? "";
}

const databaseUrl = required("DATABASE_URL");
const directUrl = required("DIRECT_URL");
const sessionSecret = required("SESSION_SECRET");
const siteUrl = required("NEXT_PUBLIC_SITE_URL");
const adminEmail = required("ADMIN_EMAIL");
const adminPassword = required("ADMIN_PASSWORD");
const contactEmail = required("CONTACT_EMAIL");
required("OPERATOR_NAME");
const smtpHost = required("SMTP_HOST");
const smtpPort = required("SMTP_PORT");
const smtpSecure = required("SMTP_SECURE");
const smtpUser = required("SMTP_USER");
const smtpPassword = required("SMTP_PASSWORD");
const emailFrom = required("EMAIL_FROM");
const dataLicense = required("DATA_LICENSE");
const rateLimitWindow = required("RATE_LIMIT_WINDOW_SECONDS");
const rateLimitPosts = required("RATE_LIMIT_POSTS_PER_WINDOW");
const rateLimitComments = required("RATE_LIMIT_COMMENTS_PER_WINDOW");
const rateLimitReports = required("RATE_LIMIT_REPORTS_PER_WINDOW");

function requireIntegerInRange(name, value, minimum, maximum) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    errors.push(`${name} must be an integer between ${minimum} and ${maximum}.`);
  }
}

function parseUrl(name, value, protocols) {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    if (!protocols.includes(parsed.protocol)) {
      errors.push(`${name} must use ${protocols.join(" or ")}.`);
      return null;
    }
    return parsed;
  } catch {
    errors.push(`${name} must be a valid URL.`);
    return null;
  }
}

function checkDatabaseUrl(name, value) {
  const parsed = parseUrl(name, value, ["postgresql:", "postgres:"]);
  if (!parsed) return null;
  if (!parsed.hostname || !parsed.username || !parsed.password || parsed.pathname === "/") {
    errors.push(`${name} must include a hostname, database user, password, and database name.`);
  }
  if (placeholderPattern.test(value)) {
    errors.push(`${name} must not contain placeholder credentials.`);
  }
  return parsed;
}

const parsedDatabaseUrl = checkDatabaseUrl("DATABASE_URL", databaseUrl);
const parsedDirectUrl = checkDatabaseUrl("DIRECT_URL", directUrl);

if (
  parsedDatabaseUrl
  && parsedDatabaseUrl.hostname.endsWith(".pooler.supabase.com")
  && parsedDatabaseUrl.port === "6543"
  && parsedDatabaseUrl.searchParams.get("pgbouncer") !== "true"
) {
  errors.push("Supabase transaction-mode DATABASE_URL must include pgbouncer=true.");
}
if (parsedDirectUrl?.hostname.endsWith(".pooler.supabase.com") && parsedDirectUrl.port === "6543") {
  errors.push("DIRECT_URL must not use Supabase transaction mode (port 6543). Use direct connection or session mode.");
}
if (databaseUrl && directUrl && databaseUrl === directUrl) {
  warnings.push("DATABASE_URL and DIRECT_URL are identical. Confirm this is an intentional session-mode configuration.");
}
if (sessionSecret.length < 32 || ["replace-with-a-long-random-secret", "change-me", "secret"].includes(sessionSecret)) {
  errors.push("SESSION_SECRET must be a unique random value of at least 32 characters.");
}

const parsedSiteUrl = parseUrl("NEXT_PUBLIC_SITE_URL", siteUrl, allowLocal ? ["https:", "http:"] : ["https:"]);
if (parsedSiteUrl) {
  if (parsedSiteUrl.username || parsedSiteUrl.password || parsedSiteUrl.search || parsedSiteUrl.hash) {
    errors.push("NEXT_PUBLIC_SITE_URL must be a public origin without credentials, query parameters, or a fragment.");
  }
  if (parsedSiteUrl.pathname !== "/" && parsedSiteUrl.pathname !== "") {
    errors.push("NEXT_PUBLIC_SITE_URL must not contain a path.");
  }
  if (!allowLocal && ["localhost", "127.0.0.1", "::1"].includes(parsedSiteUrl.hostname)) {
    errors.push("NEXT_PUBLIC_SITE_URL must not point to a local host.");
  }
  if (!allowLocal && placeholderPattern.test(siteUrl)) {
    errors.push("NEXT_PUBLIC_SITE_URL must not contain a placeholder hostname.");
  }
}
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail) || (!allowLocal && reservedEmailDomainPattern.test(adminEmail))) {
  errors.push("ADMIN_EMAIL must be a real operational email address.");
}
if (adminPassword.length < 16 || ["change-me-admin-password", "password", "admin"].includes(adminPassword)) {
  errors.push("ADMIN_PASSWORD must be a unique value of at least 16 characters.");
}
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail) || (!allowLocal && reservedEmailDomainPattern.test(contactEmail))) {
  errors.push("CONTACT_EMAIL must be a public operational email address.");
}
if (!smtpHost.includes(".") || /\s/.test(smtpHost)) {
  errors.push("SMTP_HOST must be a valid mail server hostname.");
}
requireIntegerInRange("SMTP_PORT", smtpPort, 1, 65535);
if (!["true", "false"].includes(smtpSecure)) {
  errors.push("SMTP_SECURE must be true or false.");
}
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(smtpUser) || (!allowLocal && reservedEmailDomainPattern.test(smtpUser))) {
  errors.push("SMTP_USER must be a real sender email address.");
}
if (smtpPassword.length < 12 || smtpPassword === "replace-with-an-app-password") {
  errors.push("SMTP_PASSWORD must be a real SMTP or app password.");
}
if (!emailFrom.includes("@") || emailFrom === "令和新漢語 <sender@example.com>") {
  errors.push("EMAIL_FROM must identify the configured sender.");
}
if (smtpHost === "smtp.gmail.com") {
  if (smtpSecure === "true" && smtpPort !== "465") {
    errors.push("Gmail with SMTP_SECURE=true must use port 465.");
  }
  if (smtpSecure === "false" && smtpPort !== "587") {
    errors.push("Gmail with SMTP_SECURE=false must use port 587.");
  }
}
if (dataLicense !== "site-only") {
  errors.push("DATA_LICENSE must remain site-only until versioned contribution consent is implemented.");
}
requireIntegerInRange("RATE_LIMIT_WINDOW_SECONDS", rateLimitWindow, 10, 3600);
requireIntegerInRange("RATE_LIMIT_POSTS_PER_WINDOW", rateLimitPosts, 1, 100);
requireIntegerInRange("RATE_LIMIT_COMMENTS_PER_WINDOW", rateLimitComments, 1, 100);
requireIntegerInRange("RATE_LIMIT_REPORTS_PER_WINDOW", rateLimitReports, 1, 100);

if (errors.length > 0) {
  console.error("Production environment check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

for (const warning of warnings) console.warn(`Production environment warning: ${warning}`);
console.log("Production environment check passed.");
