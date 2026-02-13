/**
 * SERVICE: Sanitize Service
 * Handles API calls to the document sanitization endpoint
 */

// Get API base URL from environment variables
const API_BASE_URL =
  import.meta.env.VITE_SANITIZE_API_URL || "http://localhost:7071";

/**
 * Response from sanitize API
 */
export interface SanitizeResponse {
  success: boolean;
  blob?: Blob;
  error?: string;
}

/**
 * Sanitize a document by removing PII
 * @param file - The DOCX or PDF file to sanitize
 * @returns Promise with the sanitized file blob
 */
export const sanitizeDocument = async (
  file: File,
): Promise<SanitizeResponse> => {
  try {
    // Validate file type
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith(".docx") && !fileName.endsWith(".pdf")) {
      return {
        success: false,
        error: "Only .docx and .pdf files are supported",
      };
    }

    // Validate file size (optional - 10MB limit)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_FILE_SIZE) {
      return {
        success: false,
        error: "File size exceeds 10MB limit",
      };
    }

    // Create FormData with the file
    const formData = new FormData();
    formData.append("file", file);

    // Make API request
    const response = await fetch(`${API_BASE_URL}/api/sanitize-docx`, {
      method: "POST",
      body: formData,
    });

    // Handle response
    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: errorText || `Server error: ${response.status}`,
      };
    }

    // Get the sanitized file blob
    const blob = await response.blob();

    return {
      success: true,
      blob,
    };
  } catch (error) {
    console.error("Sanitize API error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to connect to sanitization service",
    };
  }
};

/**
 * Download a blob as a file
 * @param blob - The blob to download
 * @param filename - The filename for the download
 */
export const downloadBlob = (blob: Blob, filename: string): void => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};
