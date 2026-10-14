import type { ReactNode } from "react";

/**
 * A deliberately tiny Markdown subset: paragraphs, `-`/`1.` lists, **bold**,
 * *italic* and `code`.
 *
 * It renders React elements instead of an HTML string, so there is no
 * `dangerouslySetInnerHTML` anywhere in the app and user text can never become
 * markup. That is a stronger guarantee than sanitising HTML after the fact.
 */

const INLINE_PATTERN = /(\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`]+`)/g;
const LIST_ITEM_PATTERN = /^(?:[-+]\s+|\*\s+|\d+\.\s+)(.+)$/;

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  return text
    .split(INLINE_PATTERN)
    .filter((part) => part !== "")
    .map((part, index) => {
      const key = `${keyPrefix}-${index}`;
      if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
        return (
          <strong key={key} className="font-semibold text-ink">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
        return (
          <code
            key={key}
            className="rounded-[4px] border border-line bg-surface px-1 py-0.5 text-meta"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
        return <em key={key}>{part.slice(1, -1)}</em>;
      }
      return part;
    });
}

export function renderMarkdown(source: string): ReactNode {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let bullets: string[] = [];
  let paragraph: string[] = [];

  const flushBullets = () => {
    if (bullets.length === 0) return;
    const key = `ul-${blocks.length}`;
    blocks.push(
      <ul key={key} className="ml-4 list-disc space-y-1">
        {bullets.map((item, index) => (
          <li key={`${key}-${index}`}>{renderInline(item, `${key}-${index}`)}</li>
        ))}
      </ul>,
    );
    bullets = [];
  };

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    const key = `p-${blocks.length}`;
    blocks.push(<p key={key}>{renderInline(paragraph.join(" "), key)}</p>);
    paragraph = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "") {
      flushBullets();
      flushParagraph();
      continue;
    }

    const item = LIST_ITEM_PATTERN.exec(trimmed);
    if (item) {
      flushParagraph();
      bullets.push(item[1]);
      continue;
    }

    flushBullets();
    paragraph.push(trimmed);
  }

  flushBullets();
  flushParagraph();

  if (blocks.length === 0) return null;
  return <div className="flex flex-col gap-2">{blocks}</div>;
}

export function hasMarkup(source: string): boolean {
  return INLINE_PATTERN.test(source) || LIST_ITEM_PATTERN.test(source.trim());
}
