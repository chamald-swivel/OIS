/**
 * Authentication Service
 * Handles authentication-related operations
 */

/**
 * Handle authentication errors
 * @param error - Error object
 * @returns User-friendly error message
 */
export const handleAuthError = (error: unknown): string => {
  if (error instanceof Error) {
    // Check for common MSAL errors
    if (error.message.includes("user_cancelled")) {
      return "Login was cancelled. Please try again.";
    }
    if (error.message.includes("consent_required")) {
      return "Consent required. Please accept the permissions.";
    }
    if (error.message.includes("interaction_in_progress")) {
      return "Another login is in progress. Please wait.";
    }

    return error.message;
  }

  return "An unexpected error occurred during authentication.";
};

/**
 * Validate if user is authenticated
 * @param accounts - Array of MSAL accounts
 * @returns True if user is authenticated
 */
export const isUserAuthenticated = (accounts: unknown[]): boolean => {
  return accounts.length > 0;
};
