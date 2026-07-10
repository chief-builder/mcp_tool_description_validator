/**
 * Shared text and identifier matching utilities for validation rules.
 *
 * Identifier-aware matching: parameter and tool names use kebab-case,
 * snake_case, dot.case, and camelCase. Naive `\b` regexes cannot see word
 * boundaries inside `user_id` or `userId`, so rules must tokenize first.
 */

/**
 * Split an identifier (or prose) into lowercase word tokens.
 * Handles kebab/snake/dot separators and camelCase transitions,
 * including acronym runs (`APIKey` -> `api`, `key`).
 */
export function tokenizeIdentifier(text: string): string[] {
  return text
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((token) => token.toLowerCase());
}

/** Normalize text into a lowercase, space-separated token string. */
export function normalizeForMatching(text: string): string {
  return tokenizeIdentifier(text).join(' ');
}

/** True when the identifier contains the term as a whole token. */
export function hasToken(text: string, term: string): boolean {
  return tokenizeIdentifier(text).includes(term.toLowerCase());
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Build a whole-word matcher for a word list. The returned function
 * normalizes its input (separators and camelCase become spaces) before
 * matching, so `user_id` matches the word `id`. Multi-word entries
 * ("cannot be undone") match as phrases.
 */
export function makeWordMatcher(
  words: readonly string[]
): (text: string) => boolean {
  const pattern = buildWordPattern(words);
  return (text: string) => pattern.test(normalizeForMatching(text));
}

/**
 * Find which entries of a word list appear as whole tokens/phrases in the
 * text. Returns matched entries in their original spelling, deduplicated.
 */
export function findWordMatches(
  text: string,
  words: readonly string[]
): string[] {
  const normalized = normalizeForMatching(text);
  const matches: string[] = [];
  for (const word of words) {
    const pattern = new RegExp(
      `\\b${escapeRegExp(normalizeForMatching(word))}\\b`
    );
    if (pattern.test(normalized)) {
      matches.push(word);
    }
  }
  return matches;
}

function buildWordPattern(words: readonly string[]): RegExp {
  const alternatives = words
    .map((word) => escapeRegExp(normalizeForMatching(word)))
    .filter(Boolean);
  return new RegExp(`\\b(?:${alternatives.join('|')})\\b`);
}
