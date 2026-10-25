import { describe, it, expect } from "vitest";
import { isPublicKey } from "./supabase";
const token = (role: string) =>
  "eyJ0eXAiOiJKV1QifQ." + btoa(JSON.stringify({ role })) + ".test";
describe("frontend key boundary", () => {
  it("allows publishable and legacy anonymous keys", () => {
    expect(isPublicKey("sb_publishable_testkey")).toBe(true);
    expect(isPublicKey(token("anon"))).toBe(true);
  });
  it("rejects server keys and placeholder configuration", () => {
    expect(isPublicKey("sb_secret_testkey")).toBe(false);
    expect(isPublicKey(token("service_role"))).toBe(false);
    expect(isPublicKey("your-public-publishable-key")).toBe(false);
  });
});
