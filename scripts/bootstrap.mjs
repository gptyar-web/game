import { createClient } from "@supabase/supabase-js";
// Pipe JSON from your password manager or a secure terminal. Never commit the input.
let text = "";
for await (const c of process.stdin) text += c;
const { url, service_key, username = "game_admin", email } = JSON.parse(text);
text = "";
if (
  !/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url) ||
  !service_key ||
  !/^[a-z0-9_]{3,32}$/.test(username)
)
  throw new Error("Invalid bootstrap input");
const client = createClient(url, service_key, {
  auth: { persistSession: false },
});
const { data: existing, error: readError } = await client
  .from("profiles")
  .select("id")
  .eq("role", "admin")
  .limit(1);
if (readError) throw new Error("Migrations must be applied first");
if (existing.length)
  throw new Error("An admin already exists; use the authenticated admin panel");
const password = crypto.randomUUID() + crypto.randomUUID().slice(0, 12) + "A!7";
const { data, error } = await client.auth.admin.createUser({
  email: email || username + "@login.game.invalid",
  password,
  email_confirm: true,
});
if (error) throw new Error("Auth account creation failed");
const { error: profileError } = await client
  .from("profiles")
  .insert({
    id: data.user.id,
    username,
    display_name: "مدیر GAME",
    role: "admin",
    must_change_password: true,
  });
if (profileError) {
  await client.auth.admin.deleteUser(data.user.id);
  throw new Error("Profile creation failed");
}
process.stdout.write(
  JSON.stringify({
    username,
    initial_password: password,
    note: "One-time delivery. Store securely. A password change is required on first login.",
  }) + "\n",
);
