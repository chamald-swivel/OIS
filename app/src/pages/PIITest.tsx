import React, { useState } from "react";
import { useMsal } from "@azure/msal-react";
import { useNavigate } from "react-router-dom";

import { ProtectedTemplate } from "../components/templates/ProtectedTemplate";
import { Card } from "../components/atoms/Card";
import { Text } from "../components/atoms/Text";
import { Button } from "../components/atoms/Button";
import { Spinner } from "../components/atoms/Spinner";
import { ErrorMessage } from "../components/molecules/ErrorMessage";
import { recognizePII } from "../services/azureLanguageService";
import type { PIIEntity } from "../services/azureLanguageService";
import {
  sanitizeDocumentWithDocumentIntelligence,
  downloadBlob,
} from "../services/documentSanitizationService";
import { getUserProfile } from "../services/userService";
import { logError } from "../utils/errorHandler";
import "./PIITest.css";

/**
 * PAGE: PII Test
 * Test Azure Cognitive Services for Language - PII Recognition
 * Allows users to input text and see detected PII entities
 */

export const PIITest: React.FC = () => {
  const { instance, accounts } = useMsal();
  const navigate = useNavigate();

  // State management
  const [inputText, setInputText] = useState("");
  const [redactedText, setRedactedText] = useState("");
  const [entities, setEntities] = useState<PIIEntity[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState<"text" | "document">("text");

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
   * Handle PII recognition
   */
  const handleRecognizePII = async () => {
    if (!inputText.trim()) {
      setError("Please enter some text to analyze");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setRedactedText("");
    setEntities([]);

    try {
      const response = await recognizePII(inputText);

      if (response.success) {
        setRedactedText(response.redactedText || "");
        setEntities(response.entities || []);
      } else {
        setError(response.error || "Failed to recognize PII");
      }
    } catch (err) {
      logError(err, "PII Recognition");
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Clear all fields
   */
  const handleClear = () => {
    setInputText("");
    setRedactedText("");
    setEntities([]);
    setError(null);
    setSuccessMessage(null);
    setSelectedFile(null);
  };

  /**
   * Handle file selection
   */
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setError(null);
      setSuccessMessage(null);

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
   * Handle document sanitization
   */
  const handleSanitizeDocument = async () => {
    if (!selectedFile) {
      setError("Please select a file first");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response =
        await sanitizeDocumentWithDocumentIntelligence(selectedFile);

      if (response.success && response.blob) {
        const fileExtension = selectedFile.name.substring(
          selectedFile.name.lastIndexOf("."),
        );
        const originalName = selectedFile.name.substring(
          0,
          selectedFile.name.lastIndexOf("."),
        );

        // For PDFs, use .txt extension since output is plain text
        const isPdf = fileExtension.toLowerCase() === ".pdf";
        const sanitizedFilename = isPdf
          ? `sanitized_${originalName}.txt`
          : `sanitized_${originalName}${fileExtension}`;

        downloadBlob(response.blob, sanitizedFilename);

        setSuccessMessage(
          `Document sanitized successfully! File "${sanitizedFilename}" has been downloaded.${
            response.inputBlobName
              ? ` Stored in Azure Blob Storage: ${response.outputBlobName}`
              : ""
          }`,
        );

        setSelectedFile(null);
        const fileInput = document.getElementById(
          "file-input",
        ) as HTMLInputElement;
        if (fileInput) {
          fileInput.value = "";
        }
      } else {
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
   * Load example text
   */
  const handleLoadExample = () => {
    const exampleText = `My name is Sarah Johnson and I work at Microsoft Corporation. You can reach me at sarah.johnson@microsoft.com or call me at +1 (425) 555-0123. My employee ID is EMP-98765 and I live at 123 Main Street, Seattle, WA 98101. My social security number is 123-45-6789 and my credit card ending in 4532 expires on 12/2025.`;
    setInputText(exampleText);
    setRedactedText("");
    setEntities([]);
    setError(null);
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
      <div className="pii-test-page">
        {/* Header */}
        <div className="pii-test-header">
          <Button variant="secondary" size="sm" onClick={handleBackToDashboard}>
            ← Back to Dashboard
          </Button>
          <br />
          <br />
          <Text variant="heading">PII Recognition Test</Text>
          <Text variant="body">
            Test Azure Cognitive Services for Language to detect and redact
            personally identifiable information (PII) from text.
          </Text>
        </div>

        {/* Error Message */}
        {error && (
          <ErrorMessage error={error} onDismiss={() => setError(null)} />
        )}

        {/* Success Message */}
        {successMessage && (
          <Card padding="md">
            <div style={{ color: "#107c10", padding: "1rem" }}>
              ✓ {successMessage}
            </div>
          </Card>
        )}

        {/* Tab Selector */}
        <div style={{ marginBottom: "2rem" }}>
          <div
            style={{
              display: "flex",
              gap: "1rem",
              borderBottom: "2px solid #e5e7eb",
            }}
          >
            <button
              onClick={() => setActiveTab("text")}
              style={{
                padding: "1rem 2rem",
                background: activeTab === "text" ? "#0078d4" : "transparent",
                color: activeTab === "text" ? "white" : "#6b7280",
                border: "none",
                borderBottom:
                  activeTab === "text" ? "2px solid #0078d4" : "none",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "16px",
                transition: "all 0.2s",
              }}
            >
              📝 Text Analysis
            </button>
            <button
              onClick={() => {
                setActiveTab("document");
                setError(null);
                setSuccessMessage(null);
              }}
              style={{
                padding: "1rem 2rem",
                background:
                  activeTab === "document" ? "#0078d4" : "transparent",
                color: activeTab === "document" ? "white" : "#6b7280",
                border: "none",
                borderBottom:
                  activeTab === "document" ? "2px solid #0078d4" : "none",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "16px",
                transition: "all 0.2s",
              }}
            >
              📄 Document Sanitization
            </button>
          </div>
        </div>

        {/* Example Info */}
        {activeTab === "text" && (
          <div className="pii-test-example">
            <div className="pii-test-example-title">💡 Try it out</div>
            <div className="pii-test-example-text">
              Enter text containing PII (names, emails, phone numbers,
              addresses, etc.) or{" "}
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  handleLoadExample();
                }}
                style={{ color: "#92400e", textDecoration: "underline" }}
              >
                load an example
              </a>
              .
            </div>
          </div>
        )}

        {activeTab === "document" && (
          <div className="pii-test-example">
            <div className="pii-test-example-title">
              📄 Document Sanitization
            </div>
            <div className="pii-test-example-text">
              Upload a PDF or DOCX file to sanitize PII. Uses Azure AI Document
              Intelligence for text extraction (with OCR support) and Azure
              Language Service for PII detection. Files are stored in Azure Blob
              Storage (piiinput/piioutput containers).
            </div>
          </div>
        )}

        {/* Main Content */}
        {activeTab === "text" ? (
          <div className="pii-test-content">
            {/* Input Section */}
            <div className="pii-test-input-section">
              <Card padding="md">
                <Text variant="subheading">Input Text</Text>
                <textarea
                  className="pii-test-textarea"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Enter text to analyze for PII..."
                  disabled={isProcessing}
                />
                <div className="pii-test-actions">
                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleRecognizePII}
                    disabled={!inputText.trim() || isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <Spinner size="sm" />
                        <span style={{ marginLeft: "0.5rem" }}>
                          Analyzing...
                        </span>
                      </>
                    ) : (
                      "🔍 Recognize PII"
                    )}
                  </Button>
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={handleClear}
                    disabled={isProcessing}
                  >
                    Clear
                  </Button>
                </div>
              </Card>
            </div>

            {/* Output Section */}
            <div className="pii-test-output-section">
              <Card padding="md">
                <Text variant="subheading">Redacted Text</Text>
                <div className="pii-test-output-box">
                  {redactedText ? (
                    redactedText
                  ) : (
                    <div className="pii-test-empty-state">
                      Redacted text will appear here after analysis
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        ) : (
          <div className="pii-test-content">
            <Card padding="md">
              <Text variant="subheading">Upload Document</Text>
              <div style={{ marginBottom: "1rem" }}>
                <input
                  type="file"
                  id="file-input"
                  accept=".pdf,.docx"
                  onChange={handleFileChange}
                  disabled={isProcessing}
                  style={{
                    display: "block",
                    marginBottom: "1rem",
                    padding: "0.5rem",
                  }}
                />
                {selectedFile && (
                  <div
                    style={{
                      padding: "1rem",
                      backgroundColor: "#f3f4f6",
                      borderRadius: "8px",
                      marginBottom: "1rem",
                    }}
                  >
                    <strong>Selected file:</strong> {selectedFile.name} (
                    {(selectedFile.size / 1024).toFixed(1)} KB)
                  </div>
                )}
              </div>

              <div className="pii-test-actions">
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleSanitizeDocument}
                  disabled={!selectedFile || isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Spinner size="sm" />
                      <span style={{ marginLeft: "0.5rem" }}>
                        Processing...
                      </span>
                    </>
                  ) : (
                    "🔒 Sanitize Document"
                  )}
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={handleClear}
                  disabled={isProcessing}
                >
                  Clear
                </Button>
              </div>

              <div
                style={{
                  marginTop: "2rem",
                  padding: "1rem",
                  backgroundColor: "#fffbeb",
                  border: "1px solid #fbbf24",
                  borderRadius: "8px",
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>
                  ℹ️ Important Notes
                </div>
                <ul style={{ margin: 0, paddingLeft: "1.5rem" }}>
                  <li>Supported formats: PDF, DOCX, and image files</li>
                  <li>Maximum file size: 10 MB</li>
                  <li>
                    Uses Azure AI Document Intelligence (processes files
                    directly)
                  </li>
                  <li>Original files uploaded to "piiinput" blob container</li>
                  <li>
                    Sanitized files uploaded to "piioutput" blob container
                  </li>
                  <li>Supports OCR for scanned documents</li>
                  <li>Note: Output is text-based (formatting simplified)</li>
                </ul>
              </div>
            </Card>
          </div>
        )}

        {/* Statistics */}
        {entities.length > 0 && (
          <div style={{ marginTop: "2rem" }}>
            <Card padding="md">
              <div className="pii-test-stats">
                <div className="pii-test-stat">
                  <div className="pii-test-stat-label">Total Entities</div>
                  <div className="pii-test-stat-value">{entities.length}</div>
                </div>
                <div className="pii-test-stat">
                  <div className="pii-test-stat-label">Unique Categories</div>
                  <div className="pii-test-stat-value">
                    {new Set(entities.map((e) => e.category)).size}
                  </div>
                </div>
                <div className="pii-test-stat">
                  <div className="pii-test-stat-label">Avg Confidence</div>
                  <div className="pii-test-stat-value">
                    {(
                      (entities.reduce((sum, e) => sum + e.confidenceScore, 0) /
                        entities.length) *
                      100
                    ).toFixed(0)}
                    %
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Detected Entities */}
        {entities.length > 0 && (
          <div className="pii-test-entities">
            <Card padding="md">
              <Text variant="subheading">
                Detected PII Entities ({entities.length})
              </Text>
              <div className="pii-test-entities-grid">
                {entities.map((entity, index) => (
                  <div key={index} className="pii-entity-item">
                    <div className="pii-entity-text">"{entity.text}"</div>
                    <div className="pii-entity-category">
                      {entity.category}
                      {entity.subcategory ? `: ${entity.subcategory}` : ""}
                    </div>
                    <div className="pii-entity-confidence">
                      {(entity.confidenceScore * 100).toFixed(1)}% confident
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>
    </ProtectedTemplate>
  );
};
