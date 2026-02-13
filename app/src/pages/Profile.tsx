import React from "react";
import { useMsal } from "@azure/msal-react";
import { ProtectedTemplate } from "../components/templates/ProtectedTemplate";
import { UserCard } from "../components/molecules/UserCard";
import { Card } from "../components/atoms/Card";
import { Text } from "../components/atoms/Text";
import { getUserProfile } from "../services/userService";
import { logError } from "../utils/errorHandler";
import "./Profile.css";

/**
 * PAGE: Profile
 * User profile page - Protected route
 * Uses ProtectedTemplate component
 */

export const Profile: React.FC = () => {
  const { instance, accounts } = useMsal();

  // Get user profile from MSAL account
  const userProfile = accounts.length > 0 ? getUserProfile(accounts[0]) : null;

  /**
   * Handle logout
   */
  const handleLogout = async () => {
    try {
      await instance.logoutRedirect({
        postLogoutRedirectUri: "/login",
      });
    } catch (err) {
      logError(err, "Logout");
    }
  };

  if (!userProfile) {
    return null;
  }

  return (
    <ProtectedTemplate userName={userProfile.name} onLogout={handleLogout}>
      <div className="profile-content">
        <Card padding="lg">
          <Text variant="heading">Profile</Text>
          <div className="profile-section">
            <Text variant="subheading">Account Information</Text>
            <UserCard
              userName={userProfile.name}
              userEmail={userProfile.email}
            />
          </div>
        </Card>

        <Card padding="lg">
          <Text variant="subheading">Account Details</Text>
          <div className="profile-details">
            <div className="profile-detail-item">
              <Text variant="label">User ID:</Text>
              <Text variant="body">{userProfile.id}</Text>
            </div>
            <div className="profile-detail-item">
              <Text variant="label">Email:</Text>
              <Text variant="body">{userProfile.email}</Text>
            </div>
            <div className="profile-detail-item">
              <Text variant="label">Name:</Text>
              <Text variant="body">{userProfile.name}</Text>
            </div>
            {userProfile.lastLogin && (
              <div className="profile-detail-item">
                <Text variant="label">Last Login:</Text>
                <Text variant="body">
                  {userProfile.lastLogin.toLocaleString()}
                </Text>
              </div>
            )}
          </div>
        </Card>
      </div>
    </ProtectedTemplate>
  );
};
