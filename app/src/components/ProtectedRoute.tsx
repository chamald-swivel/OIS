import React from "react";
import { Navigate } from "react-router-dom";
import { useIsAuthenticated } from "@azure/msal-react";
import { Spinner } from "./atoms/Spinner";
import "./ProtectedRoute.css";

/**
 * ProtectedRoute Component
 * Route guard that ensures user is authenticated before rendering children
 */

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const isAuthenticated = useIsAuthenticated();

  // Show loading spinner while checking authentication
  if (isAuthenticated === undefined) {
    return (
      <div className="protected-route-loading">
        <Spinner size="lg" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Render children if authenticated
  return <>{children}</>;
};
