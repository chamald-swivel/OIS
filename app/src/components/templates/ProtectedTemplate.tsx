import React from "react";
import { Button } from "../atoms/Button";
import { Text } from "../atoms/Text";
import "./ProtectedTemplate.css";

/**
 * TEMPLATE: ProtectedTemplate
 * Wrapper template for all protected pages with navigation and user info
 */

interface ProtectedTemplateProps {
  children: React.ReactNode;
  userName: string;
  onLogout: () => void;
}

export const ProtectedTemplate: React.FC<ProtectedTemplateProps> = ({
  children,
  userName,
  onLogout,
}) => {
  return (
    <div className="protected-template">
      <header className="protected-template__header">
        <div className="protected-template__header-content">
          <Text variant="subheading">My App</Text>
          <div className="protected-template__user-info">
            <Text variant="body">Welcome, {userName}</Text>
            <Button variant="secondary" size="sm" onClick={onLogout}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="protected-template__main">
        <div className="protected-template__content">{children}</div>
      </main>
    </div>
  );
};
