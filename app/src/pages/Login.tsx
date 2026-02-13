import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMsal, useIsAuthenticated } from "@azure/msal-react";

import { LoginTemplate } from "../components/templates/LoginTemplate";
import { loginRequest } from "../config/msalConfig";
import { handleAuthError } from "../services/authService";
import { logError } from "../utils/errorHandler";

/**
 * PAGE: Login
 * Login page with Microsoft SSO authentication
 * Uses LoginTemplate component with authentication logic
 */

export const Login: React.FC = () => {
  const { instance } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  /**
   * Handle Microsoft SSO login
   */
  const handleMicrosoftLogin = async () => {
    console.log("handleMicrosoftLogin called");
    setError(null);
    setIsLoading(true);

    try {
      console.log("Attempting login redirect with:", loginRequest);
      console.log("MSAL instance:", instance);
      // Use redirect flow for authentication
      await instance.loginRedirect(loginRequest);
    } catch (err) {
      console.error("Login error:", err);
      logError(err, "Login");
      setError(handleAuthError(err));
      setIsLoading(false);
    }
  };

  return (
    <LoginTemplate
      onLoginWithSSO={handleMicrosoftLogin}
      error={error}
      isLoading={isLoading}
    />
  );
};
