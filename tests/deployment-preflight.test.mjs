import { test } from "node:test";
import assert from "node:assert/strict";
import { validateDeploymentEnvironment as check } from "../scripts/deployment-preflight.mjs";

const valid = {
  VITE_SUPABASE_URL: "https://example-ref.supabase.co",
  VITE_SUPABASE_ANON_KEY: "sb_publishable_" + "a".repeat(32),
  VITE_BASE_PATH: "/game/",
};

test("allows a dedicated Supabase URL and a publishable key", () => {
  assert.deepEqual(check(valid), []);
});

test("rejects missing environment, secret keys, and a wrong Pages base", () => {
  assert.equal(check({}).length, 2);
  assert.equal(check({ ...valid, VITE_SUPABASE_ANON_KEY: "sb_secret_" + "a".repeat(32) }).length, 1);
  assert.equal(check({ ...valid, VITE_BASE_PATH: "/incorrect/nested/" }).length, 1);
  assert.equal(check({ ...valid, VITE_BASE_PATH: "/other/" }).length, 1);
});

test("accepts a correctly scoped legacy anon JWT only", () => {
  const jwt = (role) => "e30." + Buffer.from(JSON.stringify({ role })).toString("base64url") + ".sig";
  assert.deepEqual(check({ ...valid, VITE_SUPABASE_ANON_KEY: jwt("anon") }), []);
  assert.equal(check({ ...valid, VITE_SUPABASE_ANON_KEY: jwt("service_role") }).length, 1);
});
