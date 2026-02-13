import React, { useState } from "react";
import { useMsal } from "@azure/msal-react";
import { useNavigate } from "react-router-dom";

import { ProtectedTemplate } from "../../components/templates/ProtectedTemplate";
import { Card } from "../../components/atoms/Card";
import { Text } from "../../components/atoms/Text";
import { Button } from "../../components/atoms/Button";
import { Spinner } from "../../components/atoms/Spinner";
import { ErrorMessage } from "../../components/molecules/ErrorMessage";
import { sanitizeDocument, downloadBlob } from "../../services/sanitizeService";
import { getUserProfile } from "../../services/userService";
import { logError } from "../../utils/errorHandler";
import "./SanitizePII.css";

/**
 * PAGE: Sanitize PII
 * Upload and sanitize DOCX documents to remove PII
 */

export const SanitizePII: React.FC = () => {
  const { instance, accounts } = useMsal();
  const navigate = useNavigate();

  // State management
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Get user profile
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

  /**
   * Handle file selection
   */
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Clear previous messages
      setError(null);
      setSuccessMessage(null);

      // Validate file type
      const fileName = file.name.toLowerCase();
      if (!fileName.endsWith(".docx") && !fileName.endsWith(".pdf")) {
        setError("Please select a .docx or .pdf file");
        setSelectedFile(null);
        return;
      }

      setSelectedFile(file);
    }
  };

  /**
   * Handle file upload and sanitization
   */
  const handleSanitize = async () => {
    if (!selectedFile) {
      setError("Please select a file first");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Call the sanitize service
      const response = await sanitizeDocument(selectedFile);

      if (response.success && response.blob) {
        // Generate filename for sanitized document - preserve original extension
        const fileExtension = selectedFile.name.substring(
          selectedFile.name.lastIndexOf("."),
        );
        const originalName = selectedFile.name.substring(
          0,
          selectedFile.name.lastIndexOf("."),
        );
        const sanitizedFilename = `sanitized_${originalName}${fileExtension}`;

        // Download the sanitized file
        downloadBlob(response.blob, sanitizedFilename);

        // Show success message
        setSuccessMessage(
          `Document sanitized successfully! File "${sanitizedFilename}" has been downloaded.`,
        );

        // Clear the selected file
        setSelectedFile(null);
        // Reset the file input
        const fileInput = document.getElementById(
          "file-input",
        ) as HTMLInputElement;
        if (fileInput) {
          fileInput.value = "";
        }
      } else {
        // Show error from API
        setError(response.error || "Failed to sanitize document");
      }
    } catch (err) {
      logError(err, "Document Sanitization");
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Clear file selection
   */
  const handleClearFile = () => {
    setSelectedFile(null);
    setError(null);
    setSuccessMessage(null);
    const fileInput = document.getElementById("file-input") as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
  };

  /**
   * Navigate back to dashboard
   */
  const handleBackToDashboard = () => {
    navigate("/dashboard");
  };

  if (!userProfile) {
    return null;
  }

  return (
    <ProtectedTemplate userName={userProfile.name} onLogout={handleLogout}>
      <div className="sanitize-pii-page">
        {/* Header */}
        <div className="sanitize-pii-header">
          <Button variant="secondary" size="sm" onClick={handleBackToDashboard}>
            ← Back to Dashboard
          </Button>
          <br></br>
          <Text variant="heading">Sanitize PII from Documents</Text>
          <Text variant="body">
            Upload a Word document (.docx) or PDF file (.pdf) to automatically
            detect and remove personally identifiable information (PII).
          </Text>
        </div>

        {/* Error Message */}
        {error && (
          <ErrorMessage error={error} onDismiss={() => setError(null)} />
        )}

        {/* Success Message */}
        {successMessage && (
          <Card padding="md">
            <div className="success-message">
              <Text variant="body">
                <span style={{ color: "#107c10" }}>✓ {successMessage}</span>
              </Text>
            </div>
          </Card>
        )}

        {/* Upload Card */}
        <Card padding="lg">
          <div className="upload-section">
            <Text variant="subheading">Upload Document</Text>
            <div style={{ marginBottom: "1rem" }}>
              <Text variant="caption">
                Select a .docx or .pdf file to sanitize
              </Text>
            </div>

            {/* File Input */}
            <div className="file-input-container">
              <input
                id="file-input"
                type="file"
                accept=".docx,.pdf"
                onChange={handleFileChange}
                disabled={isProcessing}
                className="file-input"
              />
              <label htmlFor="file-input" className="file-input-label">
                {selectedFile ? "📄 Change File" : "📄 Choose File"}
              </label>
            </div>

            {/* Selected File Info */}
            {selectedFile && (
              <div className="selected-file-info">
                <div className="file-details">
                  <Text variant="body">
                    <strong>Selected:</strong> {selectedFile.name}
                  </Text>
                  <Text variant="caption">
                    Size: {(selectedFile.size / 1024).toFixed(2)} KB
                  </Text>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleClearFile}
                  disabled={isProcessing}
                >
                  Clear
                </Button>
              </div>
            )}

            {/* Action Buttons */}
            <div className="action-buttons">
              <Button
                variant="primary"
                size="lg"
                onClick={handleSanitize}
                disabled={!selectedFile || isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Spinner size="sm" />
                    <span style={{ marginLeft: "0.5rem" }}>Processing...</span>
                  </>
                ) : (
                  "🔒 Sanitize Document"
                )}
              </Button>
            </div>
          </div>
        </Card>

        {/* Information Card */}
        <Card padding="md">
          <div className="info-section">
            <Text variant="subheading">What gets sanitized?</Text>
            <ul className="info-list">
              <li>
                <Text variant="body">
                  Full names, partial names, and nicknames
                </Text>
              </li>
              <li>
                <Text variant="body">Job titles and positions</Text>
              </li>
              <li>
                <Text variant="body">Email addresses</Text>
              </li>
              <li>
                <Text variant="body">
                  Phone numbers (all formats, international)
                </Text>
              </li>
              <li>
                <Text variant="body">
                  Physical addresses (street, city, postal code, countries)
                </Text>
              </li>
              <li>
                <Text variant="body">
                  Organizations, companies, and bank names
                </Text>
              </li>
              <li>
                <Text variant="body">
                  Financial information (account numbers, card numbers, amounts)
                </Text>
              </li>
              <li>
                <Text variant="body">
                  Identity numbers (NIC, passport, SSN, employee IDs)
                </Text>
              </li>
              <li>
                <Text variant="body">Dates of birth and identifying dates</Text>
              </li>
              <li>
                <Text variant="body">URLs and website addresses</Text>
              </li>
              <li>
                <Text variant="body">API keys and technical IDs</Text>
              </li>
              <li>
                <Text variant="body">Images (replaced with placeholders)</Text>
              </li>
            </ul>
          </div>
        </Card>
      </div>
    </ProtectedTemplate>
  );
};
