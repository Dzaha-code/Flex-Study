/**
 * Version strings as releases use them: "0.5.7", "v0.5.8", "1.0.0-beta.2".
 *
 * Numeric per part, so 0.5.10 is newer than 0.5.9 — a plain string compare gets
 * that wrong, and an update check that thinks 0.5.9 is newer would offer a
 * downgrade. A pre-release sorts before its release (1.0.0-beta < 1.0.0).
 */
function parts(version: string): { numbers: number[]; pre: string | null } {
  const clean = version.trim().replace(/^v/i, "");
  const [core, ...rest] = clean.split("-");
  const numbers = core.split(".").map((part) => {
    const value = Number.parseInt(part, 10);
    return Number.isFinite(value) ? value : 0;
  });
  return { numbers, pre: rest.length > 0 ? rest.join("-") : null };
}

/** Negative when `a` is older, positive when newer, 0 when the same. */
export function compareVersions(a: string, b: string): number {
  const left = parts(a);
  const right = parts(b);
  const length = Math.max(left.numbers.length, right.numbers.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (left.numbers[index] ?? 0) - (right.numbers[index] ?? 0);
    if (difference !== 0) return difference;
  }
  if (left.pre === right.pre) return 0;
  if (left.pre === null) return 1;
  if (right.pre === null) return -1;
  return left.pre < right.pre ? -1 : 1;
}

export function isNewerVersion(candidate: string, current: string): boolean {
  return compareVersions(candidate, current) > 0;
}
