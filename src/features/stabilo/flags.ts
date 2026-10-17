/**
 * Feature gates. `STABILO_FULL_HORROR` stays false until phases 1–3 have been
 * reviewed; ph4/ph5, the jumpscare and its audio must not exist behind a default
 * that can be turned on by accident (tourStabilo.md §18).
 */
export const STABILO_FULL_HORROR = false;

/**
 * Until the artwork exists, a labelled silhouette stands in during development.
 * In a production build a missing core sprite hides Stabilo entirely and the
 * classic tour takes over — a broken image would be worse than no character.
 */
export const STABILO_PLACEHOLDER = process.env.NODE_ENV !== "production";
