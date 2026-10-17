/**
 * Double braces, matching `src/i18n/index.ts` which only expands `{{token}}`.
 * The brief wrote `{nama}`; with one brace the raw placeholder would have been
 * printed, because the app has exactly one interpolation syntax.
 */
const TOKEN = /\{\{(\w+)\}\}/g;

export function interpolate(template: string, params?: Record<string, string>): string {
  if (!params) return template;
  return template.replace(TOKEN, (match, token: string) =>
    token in params ? params[token] : match,
  );
}

/**
 * The greeting reads correctly whether or not a name was given, because the
 * `{{name}}` param carries its own leading comma (", Rani") or nothing at all.
 */
export function nameParam(nickname: string): string {
  const trimmed = nickname.trim();
  return trimmed.length > 0 ? `, ${trimmed}` : "";
}
