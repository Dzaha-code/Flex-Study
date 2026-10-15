import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

/**
 * Regression cover for a silent bug: `tailwind-merge` classified our colour
 * tokens (`text-ink`, `text-mute`, `text-accent-ink`) as font sizes, so any
 * element that combined a colour with a size lost the colour. On a primary
 * button — whose fill is also `--ink` — that made the label invisible.
 */
describe("cn", () => {
  it("keeps a text colour when a font size is present", () => {
    expect(cn("text-accent-ink text-meta")).toBe("text-accent-ink text-meta");
    expect(cn("text-ink text-caption")).toBe("text-ink text-caption");
    expect(cn("text-mute text-ui")).toBe("text-mute text-ui");
    expect(cn("text-bg text-body-lg")).toBe("text-bg text-body-lg");
  });

  it("keeps a text colour alongside a background of the same token", () => {
    // The exact combination that produced an invisible button label.
    expect(cn("bg-ink text-bg text-ui")).toBe("bg-ink text-bg text-ui");
  });

  it("still lets a later font size win", () => {
    expect(cn("text-meta text-caption")).toBe("text-caption");
  });

  it("still lets a later text colour win", () => {
    expect(cn("text-ink text-mute")).toBe("text-mute");
  });

  it("still lets a caller override both", () => {
    expect(cn("text-ink text-meta", "text-mute text-caption")).toBe("text-mute text-caption");
  });

  it("does not confuse border colour with text colour", () => {
    expect(cn("border-line-strong text-ink text-caption")).toBe(
      "border-line-strong text-ink text-caption",
    );
  });
});
