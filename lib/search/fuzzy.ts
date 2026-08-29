export interface FuzzyMatch {
  score: number;
  /** Indices in the haystack that matched, for highlighting. */
  positions: number[];
}

const BONUS_CONSECUTIVE = 8;
const BONUS_WORD_START = 10;
const BONUS_EXACT_PREFIX = 24;
const PENALTY_GAP = -1;

function isBoundary(text: string, index: number): boolean {
  if (index === 0) return true;
  const prev = text.charCodeAt(index - 1);
  // space, hyphen, slash, underscore, dot
  return prev === 32 || prev === 45 || prev === 47 || prev === 95 || prev === 46;
}

/**
 * Subsequence fuzzy match with positional scoring.
 *
 * Deliberately small and dependency-free: matching "outw" to "Outreach Writer"
 * needs word-start and consecutive-run bonuses, and nothing more elaborate. A
 * full trigram index would be justified past a few thousand entries, not here.
 *
 * `needle` must already be lowercased; `haystack` too.
 */
export function fuzzyMatch(needle: string, haystack: string): FuzzyMatch | null {
  if (needle.length === 0) return { score: 0, positions: [] };
  if (needle.length > haystack.length) return null;

  const positions: number[] = [];
  let score = 0;
  let haystackIndex = 0;
  let lastMatch = -2;

  for (let n = 0; n < needle.length; n += 1) {
    const char = needle[n];
    if (char === undefined) return null;

    let found = -1;
    for (let h = haystackIndex; h < haystack.length; h += 1) {
      if (haystack[h] === char) {
        found = h;
        break;
      }
    }
    if (found === -1) return null;

    if (found === lastMatch + 1) score += BONUS_CONSECUTIVE;
    else score += PENALTY_GAP * Math.min(found - lastMatch - 1, 8);
    if (isBoundary(haystack, found)) score += BONUS_WORD_START;

    positions.push(found);
    lastMatch = found;
    haystackIndex = found + 1;
  }

  if (haystack.startsWith(needle)) score += BONUS_EXACT_PREFIX;
  // Shorter haystacks matching the same needle are more relevant.
  score -= Math.floor(haystack.length / 24);

  return { score, positions };
}

/**
 * Matches a multi-word query: every token must match somewhere, and the total is
 * the sum. This is what makes "sales outreach" find the Outreach Writer.
 */
export function fuzzyMatchTokens(query: string, haystack: string): FuzzyMatch | null {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return { score: 0, positions: [] };

  let total = 0;
  const positions: number[] = [];

  for (const token of tokens) {
    const match = fuzzyMatch(token, haystack);
    if (!match) return null;
    total += match.score;
    positions.push(...match.positions);
  }

  return { score: total, positions };
}
