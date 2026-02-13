import type { AccountInfo } from "@azure/msal-browser";
import type { UserProfile } from "../types/user";

/**
 * User Service
 * Handles user-related operations and data transformations
 */

/**
 * Extract user profile from MSAL AccountInfo
 * @param account - MSAL AccountInfo object
 * @returns UserProfile object
 */
export const getUserProfile = (account: AccountInfo): UserProfile => {
  return {
    id: account.homeAccountId,
    name: account.name || "Unknown User",
    email: account.username || "",
    lastLogin: new Date(),
  };
};

/**
 * Update user profile (stub for future implementation)
 * @param userId - User ID
 * @param updates - Partial user profile updates
 * @returns Promise resolving to updated user profile
 */
export const updateUserProfile = async (
  userId: string,
  updates: Partial<UserProfile>,
): Promise<UserProfile> => {
  // This is a stub for future implementation
  // In a real app, this would make an API call to update the user profile
  console.log("Updating user profile:", userId, updates);

  // Return mock updated profile
  return {
    id: userId,
    name: updates.name || "Unknown User",
    email: updates.email || "",
    lastLogin: new Date(),
  };
};
