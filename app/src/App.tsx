import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MsalProvider } from "@azure/msal-react";
import { msalInstance } from "./config/msalConfig";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Root } from "./pages/Root";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Profile } from "./pages/Profile";
import { SanitizePII } from "./pages/SanitizePII/SanitizePII";
import { PIITest } from "./pages/PIITest";
import "./App.css";

/**
 * Main App Component
 * Sets up routing and MSAL authentication
 */

function App() {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Initialize MSAL instance
    msalInstance.initialize().then(() => {
      // Handle redirect promise to check for auth response after redirect
      msalInstance
        .handleRedirectPromise()
        .then(() => {
          setIsInitialized(true);
        })
        .catch((error) => {
          console.error("Redirect promise error:", error);
          setIsInitialized(true);
        });
    });
  }, []);

  if (!isInitialized) {
    return <div>Loading...</div>;
  }

  return (
    <MsalProvider instance={msalInstance}>
      <BrowserRouter>
        <Routes>
          {/* Root route - redirects based on authentication status */}
          <Route path="/" element={<Root />} />

          {/* Public route - Login */}
          <Route path="/login" element={<Login />} />

          {/* Protected routes - require authentication */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sanitize-pii"
            element={
              <ProtectedRoute>
                <SanitizePII />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pii-test"
            element={
              <ProtectedRoute>
                <PIITest />
              </ProtectedRoute>
            }
          />

          {/* Fallback route - redirect to root */}
          <Route path="*" element={<Root />} />
        </Routes>
      </BrowserRouter>
    </MsalProvider>
  );
}

export default App;
