import { createClient } from "@supabase/supabase-js";
import assert from "node:assert/strict";
// Input from a secret manager via stdin: {url,publishable_key,admin:{username,password},iran:{username,password},usa:{username,password}}.
// Uses an independent disposable test match; existing matches are never reset or altered.
let input = "";
for await (const c of process.stdin) input += c;
const config = JSON.parse(input);
input = "";
const IR = "10000000-0000-4000-8000-000000000001",
  US = "10000000-0000-4000-8000-000000000002";
const clients = [];
let mid;
const received = { iran: [], usa: [] };
async function endpoint(name, body, token) {
  const res = await fetch(`${config.url}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      apikey: config.publishable_key,
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error || "Endpoint failed");
  return json;
}
async function login(who) {
  const session = await endpoint("auth-session", {
    action: "login",
    ...config[who],
  });
  config[who].password = "";
  const c = createClient(config.url, config.publishable_key, {
    auth: { persistSession: false },
  });
  const { error } = await c.auth.setSession(session);
  if (error) throw new Error("Session setup failed");
  clients.push(c);
  const {
    data: { user },
  } = await c.auth.getUser();
  return { c, id: user.id, token: session.access_token };
}
async function rpc(user, name, p) {
  const { data, error } = await user.c.rpc(name, p);
  if (error) throw new Error(error.message);
  return data;
}
async function command(
  user,
  action,
  payload = {},
  request_id = crypto.randomUUID(),
) {
  return endpoint(
    "game-command",
    { match_id: mid, action, payload, request_id },
    user.token,
  );
}
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  const admin = await login("admin"),
    iran = await login("iran"),
    usa = await login("usa");
  assert.notEqual(iran.id, usa.id);
  assert.notEqual(admin.id, iran.id);
  assert.notEqual(admin.id, usa.id);
  mid = (
    await endpoint(
      "game-command",
      {
        action: "create_match",
        payload: { name: "آزمون یکپارچه زنده", is_test: true },
        request_id: crypto.randomUUID(),
      },
      admin.token,
    )
  ).id;
  await command(admin, "admin_member", {
    user_id: iran.id,
    team_id: IR,
    role: "commander",
  });
  await command(admin, "admin_member", {
    user_id: usa.id,
    team_id: US,
    role: "commander",
  });
  await command(admin, "admin_rules", {
    mission_seconds: 5,
    return_seconds: 5,
    repair_seconds: 5,
    jam_seconds: 10,
  });
  const subscribe = (name, user) =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("Realtime subscription timeout")),
        15000,
      );
      user.c
        .channel(`smoke:${mid}:${name}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "game_events",
            filter: `match_id=eq.${mid}`,
          },
          (p) => received[name].push(p.new),
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            clearTimeout(timer);
            resolve();
          }
        });
    });
  await Promise.all([subscribe("iran", iran), subscribe("usa", usa)]);
  await command(admin, "admin_start");
  let ir = await rpc(iran, "game_snapshot", { p_match_id: mid }),
    us = await rpc(usa, "game_snapshot", { p_match_id: mid });
  assert.ok(ir.structures.every((s) => s.team_id === IR));
  assert.ok(us.aircraft.every((a) => a.team_id === US));
  const { data: forbidden, error: readError } = await iran.c
    .from("aircraft")
    .select("*")
    .eq("team_id", US);
  if (readError) throw new Error("RLS query failed");
  assert.equal(forbidden.length, 0);
  const aircraft = ir.aircraft.find((a) => a.kind === "standard"),
    target = ir.contacts.find((c) => c.visibility === "identified"),
    request = crypto.randomUUID();
  const payload = { aircraft_id: aircraft.id, contact_id: target.id };
  const [a, b] = await Promise.all([
    command(iran, "launch", payload, request),
    command(iran, "launch", payload, request),
  ]);
  assert.equal(a.id, b.id);
  const after = await rpc(iran, "game_snapshot", { p_match_id: mid });
  assert.equal(after.resources[0].credits, ir.resources[0].credits - 120);
  const stealth = us.aircraft.find((a) => a.kind === "stealth");
  const hidden = await command(usa, "launch", {
    aircraft_id: stealth.id,
    contact_id: us.contacts.find((c) => c.visibility === "identified").id,
  });
  ir = await rpc(iran, "game_snapshot", { p_match_id: mid });
  const signal = ir.signals.find((s) => s.mission_id === hidden.id);
  assert.equal(signal.x, null);
  assert.equal(signal.target_x, null);
  await command(iran, "manual_defense", { mission_id: hidden.id, region: 1 });
  const repairTarget = ir.structures.find(
    (s) => s.hp < s.max_hp && s.status !== "repairing",
  );
  await command(iran, "repair", { structure_id: repairTarget.id });
  await iran.c.realtime.disconnect();
  await usa.c.realtime.disconnect();
  // Only direct SELECTs are used while waiting: they do not invoke lazy tick processing.
  let resolved = false;
  for (let i = 0; i < 16; i++) {
    await pause(2000);
    const { data, error } = await iran.c
      .from("missions")
      .select("status")
      .eq("id", a.id);
    if (error) throw new Error("Read failed");
    if (data[0] && !["outbound", "returning"].includes(data[0].status)) {
      resolved = true;
      break;
    }
  }
  assert.ok(
    resolved,
    "Cron did not finish the mission with browsers disconnected",
  );
  ir = await rpc(iran, "game_snapshot", { p_match_id: mid });
  assert.ok(
    ir.repairs.some(
      (r) => r.structure_id === repairTarget.id && r.status === "completed",
    ),
  );
  assert.ok(
    received.iran.length > 0 && received.usa.length > 0,
    "Realtime did not deliver authorized events",
  );
  assert.ok(
    received.iran
      .filter((e) => e.kind === "jam_started")
      .every((e) => !("target_x" in e.payload)),
  );
  await command(admin, "admin_end");
  await command(admin, "admin_archive");
  console.log(
    JSON.stringify(
      {
        ok: true,
        match_id: mid,
        checks: [
          "username login",
          "team isolation",
          "RLS direct query",
          "parallel idempotency",
          "atomic costs",
          "stealth redaction",
          "manual defense",
          "server cron while disconnected",
          "repair recovery",
          "Realtime delivery",
          "final result",
        ],
      },
      null,
      2,
    ),
  );
} catch (e) {
  console.error(JSON.stringify({ ok: false, match_id: mid, error: e.message }));
  process.exitCode = 1;
} finally {
  for (const c of clients) {
    await c.removeAllChannels();
    await c.auth.signOut({ scope: "local" });
  }
}
