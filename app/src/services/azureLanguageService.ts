/**
 * SERVICE: Azure Language Service
 * Handles API calls to Azure Cognitive Services for Language - PII Recognition
 */

// Get API credentials from environment variables
const AZURE_LANGUAGE_ENDPOINT =
  import.meta.env.VITE_AZURE_LANGUAGE_ENDPOINT || "";
const AZURE_LANGUAGE_KEY = import.meta.env.VITE_AZURE_LANGUAGE_KEY || "";

/**
 * PII Entity detected by Azure Language Service
 */
export interface PIIEntity {
  text: string;
  category: string;
  subcategory?: string;
  confidenceScore: number;
  offset: number;
  length: number;
}

/**
 * Response from PII recognition API
 */
export interface PIIRecognitionResponse {
  success: boolean;
  redactedText?: string;
  entities?: PIIEntity[];
  error?: string;
}

/**
 * Recognize and redact PII from text using Azure Language Service
 * @param text - The text to analyze
 * @returns Promise with redacted text and detected entities
 */
export const recognizePII = async (
  text: string,
): Promise<PIIRecognitionResponse> => {
  try {
    // Validate environment variables
    if (!AZURE_LANGUAGE_ENDPOINT || !AZURE_LANGUAGE_KEY) {
      return {
        success: false,
        error:
          "Azure Language Service credentials not configured. Please set VITE_AZURE_LANGUAGE_ENDPOINT and VITE_AZURE_LANGUAGE_KEY in your .env file.",
      };
    }

    // Validate input
    if (!text || text.trim().length === 0) {
      return {
        success: false,
        error: "Please enter some text to analyze",
      };
    }

    // Construct API endpoint
    const endpoint = `${AZURE_LANGUAGE_ENDPOINT}/language/:analyze-text?api-version=2023-04-01`;

    // Request body
    const requestBody = {
      kind: "PiiEntityRecognition",
      parameters: {
        modelVersion: "latest",
        domain: "none", // Use 'phi' for healthcare data
        piiCategories: [], // Empty array means detect all PII categories
      },
      analysisInput: {
        documents: [
          {
            id: "1",
            language: "en",
            text: text,
          },
        ],
      },
    };

    // Make API request
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Ocp-Apim-Subscription-Key": AZURE_LANGUAGE_KEY,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `Azure Language Service error (${response.status}): ${errorText}`,
      };
    }

    const data = await response.json();

    // Extract results
    const document = data.results?.documents?.[0];
    if (!document) {
      return {
        success: false,
        error: "No results returned from Azure Language Service",
      };
    }

    // Check for errors in the response
    if (document.error) {
      return {
        success: false,
        error: `API Error: ${document.error.message}`,
      };
    }

    // Extract entities
    const entities: PIIEntity[] = document.entities || [];

    // Create redacted text by replacing entities with [REDACTED: CATEGORY]
    let redactedText = text;
    const sortedEntities = [...entities].sort((a, b) => b.offset - a.offset);

    for (const entity of sortedEntities) {
      const before = redactedText.substring(0, entity.offset);
      const after = redactedText.substring(entity.offset + entity.length);
      const replacement = `[${entity.category}${entity.subcategory ? ":" + entity.subcategory : ""}]`;
      redactedText = before + replacement + after;
    }

    return {
      success: true,
      redactedText,
      entities,
    };
  } catch (err) {
    console.error("Azure Language Service error:", err);
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "An unexpected error occurred",
    };
  }
};
