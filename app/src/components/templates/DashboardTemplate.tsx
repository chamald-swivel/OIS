import React from "react";
import { UserCard } from "../molecules/UserCard";
import { Button } from "../atoms/Button";
import { Text } from "../atoms/Text";
import "./DashboardTemplate.css";

/**
 * TEMPLATE: DashboardTemplate
 * Layout for dashboard with header, user info, and content area
 */

interface DashboardTemplateProps {
  userName: string;
  userEmail: string;
  children: React.ReactNode;
  onLogout: () => void;
}

export const DashboardTemplate: React.FC<DashboardTemplateProps> = ({
  userName,
  userEmail,
  children,
  onLogout,
}) => {
  return (
    <div className="dashboard-template">
      <header className="dashboard-template__header">
        <div className="dashboard-template__header-content">
          <Text variant="heading">Dashboard</Text>
          <div className="dashboard-template__user-section">
            <UserCard userName={userName} userEmail={userEmail} />
            <Button variant="secondary" size="sm" onClick={onLogout}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="dashboard-template__main">
        <div className="dashboard-template__content">{children}</div>
      </main>
    </div>
  );
};
