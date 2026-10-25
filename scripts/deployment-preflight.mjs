/**
 * Deployment gate: GitHub Pages must not advertise an unconnected game.
 * Only public Supabase settings are accepted here; no server secrets.
 */
export function validateDeploymentEnvironment(env) {
  const errors = [];
  const url = env.VITE_SUPABASE_URL ?? "";
  const key = env.VITE_SUPABASE_ANON_KEY ?? "";
  const base = env.VITE_BASE_PATH ?? "/game/";
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)) {
    errors.push("VITE_SUPABASE_URL must be the public HTTPS URL of the dedicated GAME Supabase project.");
  }
  let publicKey = key.startsWith("sb_publishable_") && key.length > 24;
  if (!publicKey && key.split(".").length === 3) {
    try {
      const payload = JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString("utf8"));
      publicKey = payload.role === "anon";
    } catch { /* invalid JWT */ }
  }
  if (!publicKey) {
    errors.push("VITE_SUPABASE_ANON_KEY must be a publishable key or legacy anon JWT (never a service/secret key).");
  }
  if (!/^\/(?:[a-zA-Z0-9_-]+\/)?$/.test(base)) {
    errors.push("VITE_BASE_PATH must be /game/ for repository Pages, or / for a custom domain.");
  }
  return errors;
}

if (process.argv[1] && import.meta.url === new URL("file://" + process.argv[1]).href) {
  const errors = validateDeploymentEnvironment(process.env);
  if (errors.length) {
    for (const issue of errors) console.error("::error::" + issue);
    process.exitCode = 1;
  } else {
    console.log("Deployment environment preflight passed (public settings only).");
  }
}
