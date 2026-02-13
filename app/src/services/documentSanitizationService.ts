/**
 * SERVICE: Document Sanitization with Azure AI Document Intelligence + Language Service
 * Uses Document Intelligence for text extraction and Language Service for PII detection
 */

import { Document, Packer, Paragraph, TextRun } from "docx";
import { uploadToBlob, uploadBlobData } from "./blobStorageService";
import { recognizePII } from "./azureLanguageService";

const DOCUMENT_INTELLIGENCE_ENDPOINT = import.meta.env
  .VITE_AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;
const DOCUMENT_INTELLIGENCE_KEY = import.meta.env
  .VITE_AZURE_DOCUMENT_INTELLIGENCE_KEY;
const API_VERSION = "2024-11-30";

/**
 * Response from document sanitization
 */
export interface DocumentSanitizationResponse {
  success: boolean;
  blob?: Blob;
  inputBlobName?: string;
  outputBlobName?: string;
  entitiesFound?: number;
  error?: string;
}

/**
 * Response from Document Intelligence PII analysis
 */
interface DocumentIntelligenceResponse {
  status: string;
  analyzeResult?: {
    documents?: Array<{
      fields?: {
        [key: string]: any;
      };
    }>;
    content?: string;
    pages?: Array<any>;
    tables?: Array<any>;
    keyValuePairs?: Array<any>;
    entities?: Array<{
      category: string;
      subcategory?: string;
      content: string;
      confidence: number;
      boundingRegions?: Array<{
        pageNumber: number;
        polygon: number[];
      }>;
    }>;
  };
}

/**
 * Analyze document for PII using Azure AI Document Intelligence
 */
async function analyzeDocumentForPII(
  file: File,
): Promise<{ success: boolean; result?: any; error?: string }> {
  try {
    if (!DOCUMENT_INTELLIGENCE_ENDPOINT || !DOCUMENT_INTELLIGENCE_KEY) {
      return {
        success: false,
        error:
          "Azure Document Intelligence credentials not configured. Please add VITE_AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT and VITE_AZURE_DOCUMENT_INTELLIGENCE_KEY to .env file",
      };
    }

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        "",
      ),
    );

    // Start the analysis (no features parameter needed for basic PII detection)
    const analyzeUrl = `${DOCUMENT_INTELLIGENCE_ENDPOINT}/documentintelligence/documentModels/prebuilt-read:analyze?api-version=${API_VERSION}`;

    const analyzeResponse = await fetch(analyzeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Ocp-Apim-Subscription-Key": DOCUMENT_INTELLIGENCE_KEY,
      },
      body: JSON.stringify({
        base64Source: base64,
      }),
    });

    if (!analyzeResponse.ok) {
      const errorText = await analyzeResponse.text();
      return {
        success: false,
        error: `Document Intelligence API error: ${analyzeResponse.status} - ${errorText}`,
      };
    }

    // Get the operation location from response headers
    const operationLocation = analyzeResponse.headers.get("Operation-Location");
    if (!operationLocation) {
      return {
        success: false,
        error: "No operation location returned from Document Intelligence",
      };
    }

    // Poll for results
    let result: DocumentIntelligenceResponse | null = null;
    const maxAttempts = 60; // 60 attempts * 1 second = 1 minute max wait
    let attempts = 0;

    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second

      const resultResponse = await fetch(operationLocation, {
        headers: {
          "Ocp-Apim-Subscription-Key": DOCUMENT_INTELLIGENCE_KEY,
        },
      });

      if (!resultResponse.ok) {
        return {
          success: false,
          error: `Failed to get analysis results: ${resultResponse.status}`,
        };
      }

      result = await resultResponse.json();

      if (result?.status === "succeeded") {
        break;
      } else if (result?.status === "failed") {
        return {
          success: false,
          error: "Document analysis failed",
        };
      }

      attempts++;
    }

    if (!result || result.status !== "succeeded") {
      return {
        success: false,
        error: "Document analysis timed out",
      };
    }

    return {
      success: true,
      result: result.analyzeResult,
    };
  } catch (error) {
    console.error("Document Intelligence API error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Create a redacted document blob
 */
async function createRedactedDocumentBlob(
  redactedText: string,
  originalFileName: string,
): Promise<Blob> {
  const isPdf = originalFileName.toLowerCase().endsWith(".pdf");

  if (isPdf) {
    // For PDF, return as plain text with .txt extension
    return new Blob([redactedText], { type: "text/plain" });
  } else {
    // For DOCX, create a proper DOCX file using docx library
    const paragraphs = redactedText.split("\n").map(
      (line) =>
        new Paragraph({
          children: [
            new TextRun({
              text: line || " ", // Empty line if text is empty
              size: 24, // 12pt font (size is in half-points)
            }),
          ],
          spacing: {
            after: 200, // Add spacing after each paragraph
          },
        }),
    );

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: paragraphs,
        },
      ],
    });

    // Generate DOCX blob
    const blob = await Packer.toBlob(doc);
    return blob;
  }
}

/**
 * Sanitize document using Azure AI Document Intelligence
 * @param file - The DOCX or PDF file to sanitize
 * @returns Promise with the sanitized file blob and storage info
 */
export async function sanitizeDocumentWithDocumentIntelligence(
  file: File,
): Promise<DocumentSanitizationResponse> {
  try {
    // Validate file type
    const fileName = file.name.toLowerCase();
    const isDocx = fileName.endsWith(".docx");
    const isPdf = fileName.endsWith(".pdf");

    if (!isDocx && !isPdf) {
      return {
        success: false,
        error: "Only .docx and .pdf files are supported",
      };
    }

    // Validate file size (10MB limit)
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      return {
        success: false,
        error: "File size exceeds 10MB limit",
      };
    }

    // Step 1: Upload original file to input container
    const inputUploadResult = await uploadToBlob(file, "piiinput");
    if (!inputUploadResult.success) {
      return {
        success: false,
        error: `Failed to upload file to storage: ${inputUploadResult.error}`,
      };
    }

    // Step 2: Extract text using Document Intelligence (with OCR support)
    const analysisResult = await analyzeDocumentForPII(file);
    if (!analysisResult.success || !analysisResult.result) {
      return {
        success: false,
        error:
          analysisResult.error ||
          "Failed to extract text from document with Document Intelligence",
      };
    }

    // Extract text content from Document Intelligence response
    const content = analysisResult.result.content || "";

    if (!content.trim()) {
      return {
        success: false,
        error: "No text content found in document",
      };
    }

    // Step 3: Use Azure Language Service to detect PII in extracted text
    const piiResult = await recognizePII(content);
    if (!piiResult.success) {
      return {
        success: false,
        error: `PII detection failed: ${piiResult.error}`,
      };
    }

    const entities = piiResult.entities || [];
    if (entities.length === 0) {
      return {
        success: false,
        error: "No PII detected in the document",
      };
    }

    // Step 4: Redact PII from content
    const redactedText = piiResult.redactedText || content;

    // Step 5: Create redacted document blob
    const contentType = isPdf
      ? "text/plain"
      : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    const sanitizedBlob = await createRedactedDocumentBlob(
      redactedText,
      file.name,
    );

    // Step 6: Upload sanitized document to output container
    let outputFileName = `sanitized_${file.name}`;
    // For PDFs, change extension to .txt since we're outputting plain text
    if (isPdf) {
      outputFileName = outputFileName.replace(/\.pdf$/i, ".txt");
    }

    const outputUploadResult = await uploadBlobData(
      sanitizedBlob,
      outputFileName,
      "piioutput",
      contentType,
    );

    if (!outputUploadResult.success) {
      return {
        success: false,
        error: `Failed to upload sanitized file: ${outputUploadResult.error}`,
      };
    }

    return {
      success: true,
      blob: sanitizedBlob,
      inputBlobName: inputUploadResult.blobName,
      outputBlobName: outputUploadResult.blobName,
      entitiesFound: entities.length,
    };
  } catch (error) {
    console.error("Document sanitization error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Download a blob as a file
 * @param blob - The blob to download
 * @param filename - The filename to use
 */
export const downloadBlob = (blob: Blob, filename: string): void => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};
