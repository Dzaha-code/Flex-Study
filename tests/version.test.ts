import { describe, expect, it } from "vitest";
import { compareVersions, isNewerVersion } from "@/lib/version";

describe("compareVersions", () => {
  it("compares each part as a number, not as text", () => {
    expect(isNewerVersion("0.5.10", "0.5.9")).toBe(true);
    expect(isNewerVersion("0.5.9", "0.5.10")).toBe(false);
    expect(isNewerVersion("1.0.0", "0.9.99")).toBe(true);
  });

  it("treats a leading v and a missing part as equal", () => {
    expect(compareVersions("v0.5.8", "0.5.8")).toBe(0);
    expect(compareVersions("0.6", "0.6.0")).toBe(0);
  });

  it("never offers the same version or a downgrade", () => {
    expect(isNewerVersion("0.5.7", "0.5.7")).toBe(false);
    expect(isNewerVersion("0.5.6", "0.5.7")).toBe(false);
  });

  it("puts a pre-release before its release", () => {
    expect(isNewerVersion("1.0.0", "1.0.0-beta.2")).toBe(true);
    expect(isNewerVersion("1.0.0-beta.2", "1.0.0")).toBe(false);
    expect(isNewerVersion("1.0.0-beta.2", "1.0.0-beta.1")).toBe(true);
  });
});
