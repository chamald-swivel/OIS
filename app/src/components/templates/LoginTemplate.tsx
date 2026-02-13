import React from "react";
import { SSOButtonGroup } from "../molecules/SSOButtonGroup";
import { ErrorMessage } from "../molecules/ErrorMessage";
import { Text } from "../atoms/Text";
import "./LoginTemplate.css";

/**
 * TEMPLATE: LoginTemplate
 * Layout for login page using SSOButtonGroup and ErrorMessage molecules
 */

interface LoginTemplateProps {
  onLoginWithSSO: () => void;
  error: string | null;
  isLoading: boolean;
}

export const LoginTemplate: React.FC<LoginTemplateProps> = ({
  onLoginWithSSO,
  error,
  isLoading,
}) => {
  return (
    <div className="login-template">
      <div className="login-template__container">
        <div className="login-template__header">
          <div className="login-template__logo">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <rect x="1" y="1" width="10" height="10" fill="#f25022" />
              <rect x="13" y="1" width="10" height="10" fill="#7fba00" />
              <rect x="1" y="13" width="10" height="10" fill="#00a4ef" />
              <rect x="13" y="13" width="10" height="10" fill="#ffb900" />
            </svg>
          </div>
          <Text variant="heading">Welcome</Text>
          <Text variant="body">Sign in to access your dashboard</Text>
        </div>

        <div className="login-template__content">
          {error && <ErrorMessage error={error} />}
          <SSOButtonGroup
            onMicrosoftLogin={onLoginWithSSO}
            isLoading={isLoading}
          />
        </div>

        <div className="login-template__footer">
          <Text variant="caption">
            By signing in, you agree to our terms and conditions
          </Text>
        </div>
      </div>
    </div>
  );
};
