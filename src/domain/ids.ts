const ID_ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";

/**
 * Stable, prefixed identifiers. Uses `crypto.randomUUID` when available and
 * falls back to `Math.random`, so this also runs in plain Node during tests.
 */
export function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
  }
  let suffix = "";
  for (let index = 0; index < 12; index += 1) {
    suffix += ID_ALPHABET[Math.floor(Math.random() * ID_ALPHABET.length)];
  }
  return `${prefix}_${suffix}`;
}

/**
 * Deterministic id factory for tests. Honours the requested prefix so callers
 * can assert on the entity kind, and counts up so results are reproducible.
 */
export function createSequentialIdFactory(defaultPrefix = "seq"): (prefix?: string) => string {
  let counter = 0;
  return (prefix?: string) => {
    counter += 1;
    return `${prefix ?? defaultPrefix}_${String(counter).padStart(4, "0")}`;
  };
}
