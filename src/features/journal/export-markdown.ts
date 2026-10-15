import type { Reflection } from "@/domain/types";

export interface MarkdownLabels {
  title: string;
  learnings: string;
  favorite: string;
}

/**
 * Journal export. Useful on its own (an internship report, a weekly review) and
 * the same shape a later AI tool would read.
 */
export function reflectionsToMarkdown(
  reflections: Reflection[],
  labels: MarkdownLabels,
): string {
  const sorted = [...reflections].sort((a, b) => a.date.localeCompare(b.date));
  const lines: string[] = [`# ${labels.title}`, ""];

  for (const reflection of sorted) {
    const title = reflection.title.trim();
    // The date stays the anchor so the file still sorts by day; a title, when
    // there is one, rides along with it.
    lines.push(title === "" ? `## ${reflection.date}` : `## ${reflection.date} — ${title}`, "");
    if (reflection.favorite) {
      lines.push(`★ ${labels.favorite}`, "");
    }
    if (reflection.body.trim() !== "") {
      lines.push(reflection.body.trim(), "");
    }
    const learnings = reflection.learnings.filter((item) => item.trim() !== "");
    if (learnings.length > 0) {
      lines.push(`**${labels.learnings}**`, "");
      for (const learning of learnings) {
        lines.push(`- ${learning.trim()}`);
      }
      lines.push("");
    }
  }

  return lines.join("\n").trimEnd();
}
