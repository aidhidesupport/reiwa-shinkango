const allowLocal = process.env.ALLOW_INSECURE_LOCAL_PRODUCTION === "1";
const errors = [];
const reservedEmailDomainPattern = /@(example\.(com|net|org)|.+\.(test|invalid|example|localhost|local))$/i;

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

if (databaseUrl && !databaseUrl.startsWith("postgresql://") && !databaseUrl.startsWith("postgres://")) {
  errors.push("DATABASE_URL must be a PostgreSQL URL.");
}
if (directUrl && !directUrl.startsWith("postgresql://") && !directUrl.startsWith("postgres://")) {
  errors.push("DIRECT_URL must be a PostgreSQL URL.");
}
if (databaseUrl.includes("placeholder") || directUrl.includes("placeholder")) {
  errors.push("Database URLs must not contain placeholder credentials.");
}
if (sessionSecret.length < 32 || ["replace-with-a-long-random-secret", "change-me", "secret"].includes(sessionSecret)) {
  errors.push("SESSION_SECRET must be a unique random value of at least 32 characters.");
}
if (!allowLocal && !siteUrl.startsWith("https://")) {
  errors.push("NEXT_PUBLIC_SITE_URL must use HTTPS.");
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
if (!["site-only", "CC-BY-4.0", "CC-BY-SA-4.0"].includes(dataLicense)) {
  errors.push("DATA_LICENSE must be site-only, CC-BY-4.0, or CC-BY-SA-4.0.");
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

console.log("Production environment check passed.");
