import React from "react";
import { useMsal } from "@azure/msal-react";
import { useNavigate } from "react-router-dom";

import { DashboardTemplate } from "../components/templates/DashboardTemplate";
import { Card } from "../components/atoms/Card";
import { Text } from "../components/atoms/Text";
import { Button } from "../components/atoms/Button";
import { getUserProfile } from "../services/userService";
import { logError } from "../utils/errorHandler";
import "./Dashboard.css";

/**
 * PAGE: Dashboard
 * Main dashboard page (home page) - Protected route
 * Uses DashboardTemplate component with user data
 */

export const Dashboard: React.FC = () => {
  const { instance, accounts } = useMsal();
  const navigate = useNavigate();

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
    <DashboardTemplate
      userName={userProfile.name}
      userEmail={userProfile.email}
      onLogout={handleLogout}
    >
      {/* Dashboard content */}
      <div className="dashboard-content">
        <Card padding="lg">
          <div className="dashboard-welcome">
            <Text variant="heading">Welcome back, {userProfile.name}!</Text>
            <Text variant="body">
              You have successfully logged in with Microsoft Azure AD.
            </Text>
            <div style={{ marginTop: "1.5rem", display: "flex", gap: "1rem" }}>
              <Button
                variant="primary"
                size="lg"
                onClick={() => navigate("/sanitize-pii")}
              >
                🔒 Sanitize PII
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => navigate("/pii-test")}
              >
                🧪 PII Test
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </DashboardTemplate>
  );
};
