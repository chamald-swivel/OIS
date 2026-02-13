/**
 * Error Handler Utility
 * Centralized error handling and logging
 */

/**
 * Log error to console (in production, this could send to a logging service)
 * @param error - Error object or message
 * @param context - Additional context about where the error occurred
 */
export const logError = (error: unknown, context?: string): void => {
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` [${context}]` : "";

  if (error instanceof Error) {
    console.error(`${timestamp}${contextStr}:`, error.message, error.stack);
  } else {
    console.error(`${timestamp}${contextStr}:`, error);
  }
};

/**
 * Get user-friendly error message
 * @param error - Error object
 * @returns User-friendly error message
 */
export const getUserFriendlyError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "An unexpected error occurred. Please try again.";
};
