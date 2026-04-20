import { describe, expect, it } from "vitest";
import { isAllowedAdminEmail, parseAllowlist } from "../allowlist";

describe("parseAllowlist", () => {
  it("returns default list when env is unset", () => {
    expect(parseAllowlist(undefined)).toEqual(["dev@ccmdesign.ca"]);
  });

  it("returns default when env is empty", () => {
    expect(parseAllowlist("")).toEqual(["dev@ccmdesign.ca"]);
  });

  it("returns default when env is only whitespace / commas", () => {
    expect(parseAllowlist(" , ,,")).toEqual(["dev@ccmdesign.ca"]);
  });

  it("splits and normalizes a comma-separated env", () => {
    expect(parseAllowlist(" DEV@ccmdesign.ca , other@example.com ")).toEqual([
      "dev@ccmdesign.ca",
      "other@example.com",
    ]);
  });
});

describe("isAllowedAdminEmail", () => {
  it("returns false for null/undefined/empty", () => {
    expect(isAllowedAdminEmail(null)).toBe(false);
    expect(isAllowedAdminEmail(undefined)).toBe(false);
    expect(isAllowedAdminEmail("")).toBe(false);
  });

  it("accepts the default allowlisted email", () => {
    expect(isAllowedAdminEmail("dev@ccmdesign.ca")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(isAllowedAdminEmail("DEV@CCMDESIGN.CA")).toBe(true);
  });

  it("rejects emails not on the allowlist", () => {
    expect(isAllowedAdminEmail("attacker@example.com")).toBe(false);
  });

  it("honors a per-call env override", () => {
    expect(isAllowedAdminEmail("ops@example.com", "ops@example.com,other@x.com")).toBe(true);
    expect(isAllowedAdminEmail("dev@ccmdesign.ca", "ops@example.com")).toBe(false);
  });
});
