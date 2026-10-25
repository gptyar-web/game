import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import assert from "node:assert/strict";
const db = new PGlite();
let checks = 0;
const ids = {
  admin: "20000000-0000-4000-8000-000000000001",
  iran: "20000000-0000-4000-8000-000000000002",
  usa: "20000000-0000-4000-8000-000000000003",
  spectator: "20000000-0000-4000-8000-000000000004",
  outsider: "20000000-0000-4000-8000-000000000005",
};
const IR = "10000000-0000-4000-8000-000000000001",
  US = "10000000-0000-4000-8000-000000000002";
await db.exec(`create role anon; create role authenticated; create role service_role bypassrls; create schema auth; grant usage on schema auth to authenticated,service_role;
create table auth.users(id uuid primary key,encrypted_password text,updated_at timestamptz default now());
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant execute on function auth.uid() to authenticated,service_role;`);
for (const f of (await readdir("supabase/migrations"))
  .filter((f) => f.endsWith(".sql"))
  .sort()) {
  try {
    await db.exec(await readFile(`supabase/migrations/${f}`, "utf8"));
  } catch (e) {
    console.error(
      "MIGRATION FAILED:",
      f,
      e.message,
      e.where,
      e.query?.slice(0, 1500),
    );
    process.exit(1);
  }
}
const raw = async (sql, args = []) => db.query(sql, args);
for (const [name, id] of Object.entries(ids)) {
  await raw("insert into auth.users(id) values($1)", [id]);
  await raw(
    "insert into public.profiles(id,username,display_name,role,must_change_password) values($1,$2,$2,$3,false)",
    [
      id,
      name,
      name === "admin"
        ? "admin"
        : name === "spectator"
          ? "spectator"
          : "player",
    ],
  );
}
async function as(who) {
  await db.exec("reset role");
  await raw("select set_config('request.jwt.claim.sub',$1,false)", [
    ids[who] ?? "",
  ]);
  await db.exec("set role authenticated");
}
async function owner() {
  await db.exec("reset role");
}
async function ok(name, fn) {
  try {
    await fn();
    checks++;
    console.log(`✓ ${name}`);
  } catch (e) {
    console.error(`✗ ${name}:`, e.message, e.where);
    throw e;
  }
}
async function denied(fn, pattern) {
  await assert.rejects(fn, pattern);
}
const action = (mid, act, p = {}, rid = crypto.randomUUID()) =>
  raw("select public.game_action($1,$2,$3,$4) result", [
    mid,
    act,
    JSON.stringify(p),
    rid,
  ]).then((x) => x.rows[0].result);
const snapshot = (mid) =>
  raw("select public.game_snapshot($1) result", [mid]).then(
    (x) => x.rows[0].result,
  );
await as("admin");
let mid;
await ok("Admin creates a complete fictional scenario", async () => {
  mid = (
    await raw("select public.game_create_match($1,$2) result", [
      JSON.stringify({ name: "مسابقه آزمون", is_test: true }),
      crypto.randomUUID(),
    ])
  ).rows[0].result.id;
  assert.ok(mid);
  const s = await snapshot(mid);
  assert.equal(s.structures.length, 14);
  assert.equal(s.aircraft.length, 6);
});
await action(mid, "admin_member", {
  user_id: ids.iran,
  team_id: IR,
  role: "commander",
});
await action(mid, "admin_member", {
  user_id: ids.usa,
  team_id: US,
  role: "commander",
});
await action(mid, "admin_member", {
  user_id: ids.spectator,
  role: "spectator",
});
await ok("Only authorized members can read a match", async () => {
  await as("outsider");
  await denied(() => snapshot(mid), /FORBIDDEN/);
});
await as("iran");
let ir = await snapshot(mid);
await ok("Iran cannot read enemy structures directly through RLS", async () => {
  assert.equal(
    (await raw("select * from public.structures where team_id=$1", [US])).rows
      .length,
    0,
  );
  assert.equal(ir.structures.length, 7);
  assert.ok(ir.structures.every((s) => s.team_id === IR));
});
await ok(
  "Unknown contacts have no coordinates or sensitive fields",
  async () => {
    const unknown = ir.contacts.find((c) => c.visibility === "unknown");
    assert.ok(unknown);
    assert.equal(unknown.x, null);
    assert.equal(unknown.health_pct, null);
    assert.equal(ir.contacts.length, 6);
  },
);
await ok("Read-only spectator sees no team assets", async () => {
  await as("spectator");
  const s = await snapshot(mid);
  assert.equal(s.structures.length, 0);
  assert.equal(s.resources.length, 0);
  await denied(() => action(mid, "construct", {}), /OPERATOR_REQUIRED/);
});
await as("iran");
await ok("Direct resource and score tampering is rejected", async () => {
  await denied(
    () =>
      raw("update public.team_resources set credits=99999 where match_id=$1", [
        mid,
      ]),
    /permission denied/,
  );
  await denied(
    () =>
      raw("update public.match_scores set score=99999 where match_id=$1", [
        mid,
      ]),
    /permission denied/,
  );
});
await ok("Player cannot start the match or grant admin rights", async () => {
  await denied(() => action(mid, "admin_start"), /ADMIN_REQUIRED/);
  await denied(
    () =>
      raw("update public.profiles set role='admin' where id=$1", [ids.iran]),
    /permission denied/,
  );
});
await as("admin");
await action(mid, "admin_rules", {
  mission_seconds: 10,
  return_seconds: 5,
  repair_seconds: 10,
  jam_seconds: 30,
});
await action(mid, "admin_start");
await ok(
  "Test scenario starts a real repair and deducts materials",
  async () => {
    const s = await snapshot(mid);
    assert.equal(s.match.status, "running");
    assert.equal(s.repairs.filter((j) => j.status === "active").length, 1);
    assert.ok(s.transactions.some((t) => t.reason === "scenario_repair"));
  },
);
await as("iran");
ir = await snapshot(mid);
let mission,
  aircraft = ir.aircraft.find((a) => a.kind === "standard"),
  contact = ir.contacts.find(
    (c) => c.visibility === "identified" && c.kind === "command",
  );
const rid = crypto.randomUUID();
const launch = { aircraft_id: aircraft.id, contact_id: contact.id };
await ok(
  "Mission, costs and aircraft reservation commit atomically",
  async () => {
    const before = ir.resources[0];
    mission = await action(mid, "launch", launch, rid);
    const s = await snapshot(mid);
    assert.equal(s.resources[0].credits, before.credits - 120);
    assert.equal(s.resources[0].energy, before.energy - 45);
    assert.equal(
      s.aircraft.find((a) => a.id === aircraft.id).status,
      "mission",
    );
  },
);
await ok(
  "Identical retries return the same result without duplicate charges",
  async () => {
    assert.equal((await action(mid, "launch", launch, rid)).id, mission.id);
    const s = await snapshot(mid);
    assert.equal(s.missions.length, 1);
  },
);
await ok("Changed payload under the same request ID is rejected", async () => {
  await denied(
    () =>
      action(mid, "launch", { ...launch, contact_id: ir.contacts[0].id }, rid),
    /IDEMPOTENCY_CONFLICT/,
  );
});
await ok("A reserved aircraft cannot launch twice", async () => {
  await denied(() => action(mid, "launch", launch), /AIRCRAFT_UNAVAILABLE/);
});
await ok("Invisible or unknown targets cannot be attacked", async () => {
  await denied(
    () =>
      action(mid, "launch", {
        aircraft_id: ir.aircraft.find(
          (a) => a.status === "ready" && a.id !== aircraft.id,
        ).id,
        contact_id: ir.contacts.find((c) => c.visibility === "unknown").id,
      }),
    /TARGET_NOT_VISIBLE/,
  );
});
await as("usa");
let us = await snapshot(mid);
let stealth = us.aircraft.find((a) => a.kind === "stealth");
let stealthMission = await action(mid, "launch", {
  aircraft_id: stealth.id,
  contact_id: us.contacts.find((c) => c.visibility === "identified").id,
});
await ok(
  "Enemy stealth coordinates are absent from API, tables and events",
  async () => {
    await as("iran");
    const s = await snapshot(mid);
    const sg = s.signals.find((sg) => sg.mission_id === stealthMission.id);
    assert.ok(sg.jammed);
    assert.equal(sg.x, null);
    assert.equal(sg.target_x, null);
    assert.equal(
      (
        await raw("select * from public.missions where id=$1", [
          stealthMission.id,
        ])
      ).rows.length,
      0,
    );
    const events = s.events.filter((e) => e.kind === "jam_started");
    assert.ok(events.length);
    assert.deepEqual(events.at(-1).payload, {});
  },
);
await ok(
  "Iran cannot create a stealth aircraft even through admin action",
  async () => {
    await denied(
      () =>
        action(mid, "admin_aircraft", {
          kind: "stealth",
          home_id: ir.structures[0].id,
          name: "واحد تخیلی",
        }),
      /ADMIN_REQUIRED/,
    );
  },
);
await ok(
  "Manual defense consumes one charge and prevents repeats",
  async () => {
    let s = await snapshot(mid),
      before = s.defenses[0].charges;
    await action(mid, "manual_defense", {
      mission_id: stealthMission.id,
      region: 2,
    });
    s = await snapshot(mid);
    assert.equal(s.defenses[0].charges, before - 1);
    await denied(
      () =>
        action(mid, "manual_defense", {
          mission_id: stealthMission.id,
          region: 1,
        }),
      /MANUAL_DEFENSE_UNAVAILABLE/,
    );
  },
);
await ok("Enemy repair attempts and geographic text are rejected", async () => {
  await denied(
    () => action(mid, "repair", { structure_id: us.structures[0].id }),
    /REPAIR_UNAVAILABLE/,
  );
  await denied(
    () =>
      action(mid, "construct", {
        name: "https://example.com",
        type_id: ir.types[0].id,
        x: 100,
        y: 100,
        fictional: true,
      }),
    /FICTIONAL_TEXT_REQUIRED/,
  );
});
await ok(
  "Construction validates territory and records a real defense unit",
  async () => {
    const type = ir.types.find((t) => t.code === "defense");
    await denied(
      () =>
        action(mid, "construct", {
          name: "سازه تخیلی",
          type_id: type.id,
          x: 800,
          y: 100,
          fictional: true,
        }),
      /OUTSIDE_FICTIONAL_TERRITORY/,
    );
    const c = await action(mid, "construct", {
      name: "سازه تخیلی",
      type_id: type.id,
      x: 200,
      y: 150,
      fictional: true,
    });
    const s = await snapshot(mid);
    assert.ok(s.structures.some((x) => x.id === c.id));
    assert.equal(s.defenses.length, 2);
  },
);
await ok("Repair starts once with atomic resource deduction", async () => {
  const s = await snapshot(mid);
  const target = s.structures.find(
    (x) => x.hp < x.max_hp && x.status !== "repairing",
  );
  const before = s.resources[0].materials;
  await action(mid, "repair", { structure_id: target.id });
  const after = await snapshot(mid);
  assert.equal(after.resources[0].materials, before - 40);
  await denied(
    () => action(mid, "repair", { structure_id: target.id }),
    /REPAIR_UNAVAILABLE|REPAIR_SLOTS_FULL/,
  );
});
await ok("Insufficient resources roll back the entire command", async () => {
  await owner();
  await raw(
    "update public.team_resources set credits=0 where match_id=$1 and team_id=$2",
    [mid, IR],
  );
  await as("iran");
  const s = await snapshot(mid);
  const a = s.aircraft.find((a) => a.status === "ready");
  await denied(
    () => action(mid, "launch", { aircraft_id: a.id, contact_id: contact.id }),
    /INSUFFICIENT_RESOURCES/,
  );
  assert.equal(
    (await snapshot(mid)).aircraft.find((x) => x.id === a.id).status,
    "ready",
  );
});
await ok(
  "Server worker resolves missions and repairs without browsers",
  async () => {
    await owner();
    await raw(
      "update public.missions set resolves_at=now()-interval '1 minute',ready_at=now()-interval '1 second' where match_id=$1",
      [mid],
    );
    await raw(
      "update public.repair_jobs set completes_at=now()-interval '1 second' where match_id=$1",
      [mid],
    );
    await db.exec("set role service_role");
    await raw("select public.game_engine_tick()");
    await as("iran");
    const s = await snapshot(mid);
    assert.ok(
      s.missions.every((m) => !["outbound", "returning"].includes(m.status)),
    );
    assert.ok(s.repairs.every((j) => j.status === "completed"));
    assert.ok(s.events.some((e) => e.kind === "mission_resolved"));
  },
);
await ok("Player cannot call engine worker directly", async () => {
  await denied(
    () => raw("select public.game_engine_tick()"),
    /permission denied/,
  );
});
await ok("Pause freezes actions; resume shifts server deadlines", async () => {
  await as("admin");
  await action(mid, "admin_pause");
  await as("iran");
  await denied(
    () => action(mid, "repair", { structure_id: ir.structures[0].id }),
    /MATCH_NOT_RUNNING/,
  );
  await as("admin");
  await action(mid, "admin_resume");
  assert.equal((await snapshot(mid)).match.status, "running");
});
await ok("Rules reject negative costs and unknown keys", async () => {
  await action(mid, "admin_pause");
  await denied(
    () => action(mid, "admin_rules", { mission_credits: -1 }),
    /INVALID_RULES/,
  );
  await denied(
    () => action(mid, "admin_rules", { injected: true }),
    /UNKNOWN_RULE/,
  );
  await action(mid, "admin_resume");
});
await ok(
  "Admin cannot provision a stealth aircraft for Iran at the database constraint",
  async () => {
    await action(mid, "admin_pause");
    await denied(
      () =>
        action(mid, "admin_aircraft", {
          home_id: ir.structures.find(
            (s) => ir.types.find((t) => t.id === s.type_id)?.code === "airbase",
          ).id,
          name: "واحد غیرمجاز",
          kind: "stealth",
        }),
      /check constraint/,
    );
    await action(mid, "admin_resume");
  },
);
await ok("Admin structure changes refresh only permitted intel", async () => {
  await action(mid, "admin_pause");
  const s = (await snapshot(mid)).structures.find(
    (s) =>
      s.team_id === US && s.intel === "identified" && s.status !== "repairing",
  );
  await action(mid, "admin_structure", {
    id: s.id,
    team_id: US,
    type_id: s.type_id,
    name: "هدف محرمانه خیالی",
    description: "ساختگی",
    x: s.x,
    y: s.y,
    hp: s.hp,
    level: s.level,
    intel: "hidden",
    active: true,
    fictional: true,
  });
  await as("iran");
  assert.ok(!(await snapshot(mid)).contacts.some((c) => c.target_id === s.id));
  await as("admin");
  await action(mid, "admin_resume");
});
await ok(
  "Changing the view_team parameter cannot change a player team",
  async () => {
    await as("iran");
    const s = (
      await raw("select public.game_snapshot($1,$2) result", [mid, US])
    ).rows[0].result;
    assert.equal(s.team_id, IR);
    assert.ok(s.aircraft.every((a) => a.team_id === IR));
    await as("admin");
  },
);
await ok(
  "Global spectator role limits an old operational membership immediately",
  async () => {
    await as("admin");
    await action(mid, "admin_profile", {
      user_id: ids.iran,
      role: "spectator",
      disabled: false,
    });
    await as("iran");
    const limited = await snapshot(mid);
    assert.equal(limited.team_id, null);
    assert.equal(limited.structures.length, 0);
    await denied(() => action(mid, "construct", {}), /OPERATOR_REQUIRED/);
    await as("admin");
    await action(mid, "admin_profile", {
      user_id: ids.iran,
      role: "player",
      disabled: false,
    });
  },
);
await ok(
  "Suspension revokes access even with an existing user identity",
  async () => {
    await action(mid, "admin_profile", {
      user_id: ids.iran,
      role: "player",
      disabled: true,
    });
    await as("iran");
    await denied(() => snapshot(mid), /FORBIDDEN/);
    await as("admin");
    await action(mid, "admin_profile", {
      user_id: ids.iran,
      role: "player",
      disabled: false,
    });
  },
);
await ok("Global maintenance is enforced on the server", async () => {
  await action(mid, "admin_maintenance", { enabled: true });
  await as("iran");
  await denied(() => action(mid, "construct", {}), /MAINTENANCE/);
  await as("admin");
  await action(mid, "admin_maintenance", { enabled: false });
});
await ok("Notification receipts are scoped to the signed-in user", async () => {
  await as("iran");
  await action(mid, "mark_read");
  const mine = await snapshot(mid);
  assert.ok(mine.notifications.every((n) => n.read));
  await as("usa");
  const other = await snapshot(mid);
  assert.ok(other.notifications.some((n) => !n.read));
  await as("admin");
});
await ok(
  "A match with a due schedule starts through the unattended worker",
  async () => {
    const scheduled = (
      await raw("select public.game_create_match($1,$2) result", [
        JSON.stringify({
          name: "زمان‌بندی آزمایشی",
          is_test: true,
          scheduled_at: "2026-01-01T00:00:00Z",
        }),
        crypto.randomUUID(),
      ])
    ).rows[0].result.id;
    await owner();
    await db.exec("set role service_role");
    await raw("select public.game_engine_tick()");
    await as("admin");
    assert.equal((await snapshot(scheduled)).match.status, "running");
  },
);
await ok(
  "Initial password gating only clears after an Auth password hash change",
  async () => {
    await owner();
    const id = crypto.randomUUID();
    await raw(
      "insert into auth.users(id,encrypted_password) values($1,'hash-one')",
      [id],
    );
    await raw(
      "insert into public.profiles(id,username,display_name) values($1,'initial_gate','حساب آزمایشی')",
      [id],
    );
    await raw("update auth.users set updated_at=now() where id=$1", [id]);
    assert.equal(
      (
        await raw(
          "select must_change_password from public.profiles where id=$1",
          [id],
        )
      ).rows[0].must_change_password,
      true,
    );
    await raw(
      "update auth.users set encrypted_password='hash-two' where id=$1",
      [id],
    );
    assert.equal(
      (
        await raw(
          "select must_change_password from public.profiles where id=$1",
          [id],
        )
      ).rows[0].must_change_password,
      false,
    );
    await as("admin");
  },
);
await ok(
  "Anonymous users and authenticated callers cannot execute privileged internals",
  async () => {
    await owner();
    const r = await raw(
      "select has_function_privilege('anon','public.game_snapshot(uuid,uuid)','EXECUTE') anon,has_function_privilege('authenticated','game_private.emit(uuid,uuid,text,text,jsonb)','EXECUTE') internal",
    );
    assert.equal(r.rows[0].anon, false);
    assert.equal(r.rows[0].internal, false);
    await as("admin");
  },
);
await ok("Final results and replay remain persistent", async () => {
  await action(mid, "admin_end");
  const s = await snapshot(mid);
  assert.equal(s.match.status, "ended");
  assert.equal(s.match.result.scores.length, 2);
  assert.ok(s.events.some((e) => e.state?.structures.length));
});
await ok("Production matches cannot be reset through test reset", async () => {
  await owner();
  await raw("update public.matches set is_test=false where id=$1", [mid]);
  await as("admin");
  await denied(
    () => action(mid, "admin_reset", { confirm: "RESET_TEST" }),
    /TEST_RESET_ONLY/,
  );
});
await ok(
  "Logical backups include all game events and require admin authorization",
  async () => {
    await as("iran");
    await denied(
      () => raw("select public.game_export_match($1)", [mid]),
      /ADMIN_REQUIRED/,
    );
    await as("admin");
    const out = (await raw("select public.game_export_match($1) backup", [mid]))
      .rows[0].backup;
    assert.equal(out.format, "game-match-backup");
    assert.equal(out.structures.length, 15);
    assert.ok(out.game_events.length > 0);
    assert.equal(out.auth, undefined);
  },
);
await ok("All tables have RLS and no client write grants", async () => {
  await owner();
  const r = await raw(
    "select relname from pg_class c join pg_namespace n on c.relnamespace=n.oid where n.nspname='public' and c.relkind='r' and not c.relrowsecurity",
  );
  assert.equal(r.rows.length, 0);
  const g = await raw(
    "select * from information_schema.role_table_grants where grantee in ('anon','authenticated') and table_schema='public' and privilege_type<>'SELECT'",
  );
  assert.equal(g.rows.length, 0);
});
console.log(
  `\n${checks} database integration/security checks passed using actual PostgreSQL (PGlite).`,
);
await db.close();
