import { describe, it, expect } from "vitest";
import { progress, remaining, errorMessage, fa, label } from "./utils";
describe("server timeline projection", () => {
  it("clamps progress before start and after completion", () => {
    expect(
      progress(
        "2026-10-25T00:00:10Z",
        "2026-10-25T00:00:20Z",
        Date.parse("2026-10-25T00:00:00Z"),
      ),
    ).toBe(0);
    expect(
      progress(
        "2026-10-25T00:00:10Z",
        "2026-10-25T00:00:20Z",
        Date.parse("2026-10-25T00:00:15Z"),
      ),
    ).toBe(50);
    expect(
      progress(
        "2026-10-25T00:00:10Z",
        "2026-10-25T00:00:20Z",
        Date.parse("2026-10-25T00:01:00Z"),
      ),
    ).toBe(100);
  });
  it("never displays a negative repair countdown", () => {
    expect(
      remaining("2026-10-25T00:00:00Z", Date.parse("2026-10-25T00:01:00Z")),
    ).toBe("۰:۰۰");
  });
  it("renders Persian numbers and readable states", () => {
    expect(fa(1234)).toBe("۱٬۲۳۴");
    expect(label("repairing")).toBe("در حال تعمیر");
  });
  it("translates PostgREST errors without exposing raw server details", () => {
    expect(errorMessage({ message: "INSUFFICIENT_RESOURCES" })).toContain(
      "منابع کافی",
    );
    expect(
      errorMessage(new Error("SQL private schema secret details")),
    ).not.toContain("secret");
  });
});
