const [firstValue, secondValue] = process.argv.slice(2);

if (!firstValue || !secondValue) {
  console.error("Usage: node scripts/postgres-target.mjs POSTGRES_URL POSTGRES_URL");
  process.exit(2);
}

function target(value) {
  const url = new URL(value);
  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    throw new Error("Only PostgreSQL URLs can be compared.");
  }

  const database = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
  const username = decodeURIComponent(url.username);
  const poolerProject =
    url.hostname.endsWith(".pooler.supabase.com") && username.includes(".")
      ? username.split(".").at(-1)
      : "";
  const directProject = url.hostname.match(/^db\.([^.]+)\.supabase\.co$/)?.[1] ?? "";
  const supabaseProject = poolerProject || directProject;

  if (supabaseProject) {
    return `supabase:${supabaseProject}:${database}`;
  }

  return [
    url.hostname.toLowerCase(),
    url.port || "5432",
    username,
    database,
  ].join(":");
}

try {
  console.log(target(firstValue) === target(secondValue) ? "same" : "different");
} catch (error) {
  console.error(error instanceof Error ? error.message : "PostgreSQL URL comparison failed.");
  process.exit(2);
}
