import { ZodError } from "zod";

/**
 * Formats a Zod validation error into a user-friendly string.
 * It takes the message from the first issue found.
 */
export const formatZodError = (error: ZodError): string => {
  const issues = error.issues;
  if (issues && issues.length > 0) {
    const firstIssue = issues[0];
    if (firstIssue) {
      return firstIssue.message;
    }
  }
  return "Validation failed";
};
