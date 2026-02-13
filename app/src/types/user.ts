/**
 * User Profile Interface
 * Represents the user profile data structure used throughout the application
 */
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  lastLogin?: Date;
}

/**
 * Extended user information (optional fields)
 */
export interface ExtendedUserInfo extends UserProfile {
  avatarUrl?: string;
  department?: string;
  jobTitle?: string;
}
