import React from "react";
import { Button } from "../atoms/Button";
import "./SSOButtonGroup.css";

/**
 * MOLECULE: SSOButtonGroup Component
 * Combines Button atom for Microsoft SSO authentication
 */

interface SSOButtonGroupProps {
  onMicrosoftLogin: () => void;
  isLoading?: boolean;
}

export const SSOButtonGroup: React.FC<SSOButtonGroupProps> = ({
  onMicrosoftLogin,
  isLoading = false,
}) => {
  return (
    <div className="sso-button-group">
      <Button
        variant="primary"
        size="lg"
        onClick={onMicrosoftLogin}
        loading={isLoading}
      >
        <svg className="sso-button-group__icon" viewBox="0 0 24 24" fill="none">
          <rect x="1" y="1" width="10" height="10" fill="#f25022" />
          <rect x="13" y="1" width="10" height="10" fill="#7fba00" />
          <rect x="1" y="13" width="10" height="10" fill="#00a4ef" />
          <rect x="13" y="13" width="10" height="10" fill="#ffb900" />
        </svg>
        Sign in with Microsoft
      </Button>
    </div>
  );
};
