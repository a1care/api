/**
 * Escape a user-supplied string so it can be safely embedded in a RegExp.
 * Prevents regex-injection / ReDoS and "Invalid regular expression" 500s from
 * inputs like "(" or "*". Returns "" for nullish input.
 */
export const escapeRegex = (input: unknown): string =>
  String(input ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export default escapeRegex;
