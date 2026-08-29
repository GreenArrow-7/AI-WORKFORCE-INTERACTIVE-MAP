/** Joins class names, dropping falsy values. Deliberately not a merge utility. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
