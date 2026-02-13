import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useIsAuthenticated } from "@azure/msal-react";
import { Spinner } from "../components/atoms/Spinner";
import "./Root.css";

/**
 * PAGE: Root
 * Root redirect page - redirects to dashboard if authenticated, otherwise to login
 */

export const Root: React.FC = () => {
  const isAuthenticated = useIsAuthenticated();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect based on authentication status
    if (isAuthenticated) {
      navigate("/dashboard");
    } else {
      navigate("/login");
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="root-page">
      <Spinner size="lg" />
    </div>
  );
};
