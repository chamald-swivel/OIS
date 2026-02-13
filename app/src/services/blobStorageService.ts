/**
 * SERVICE: Azure Blob Storage
 * Handles file uploads and downloads to Azure Blob Storage
 */

import { BlobServiceClient, ContainerClient } from "@azure/storage-blob";

// Get Azure Storage credentials from environment variables
const AZURE_STORAGE_ACCOUNT_NAME =
  import.meta.env.VITE_AZURE_STORAGE_ACCOUNT_NAME || "";
const AZURE_STORAGE_SAS_TOKEN =
  import.meta.env.VITE_AZURE_STORAGE_SAS_TOKEN || "";

/**
 * Upload result
 */
export interface UploadResult {
  success: boolean;
  blobName?: string;
  url?: string;
  error?: string;
}

/**
 * Get Blob Service Client
 */
function getBlobServiceClient(): BlobServiceClient {
  if (!AZURE_STORAGE_ACCOUNT_NAME || !AZURE_STORAGE_SAS_TOKEN) {
    throw new Error(
      "Azure Storage credentials not configured. Please set VITE_AZURE_STORAGE_ACCOUNT_NAME and VITE_AZURE_STORAGE_SAS_TOKEN.",
    );
  }

  const blobServiceUri = `https://${AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net`;
  return new BlobServiceClient(`${blobServiceUri}?${AZURE_STORAGE_SAS_TOKEN}`);
}

/**
 * Get Container Client
 */
function getContainerClient(containerName: string): ContainerClient {
  const blobServiceClient = getBlobServiceClient();
  return blobServiceClient.getContainerClient(containerName);
}

/**
 * Upload file to Azure Blob Storage
 * @param file - File to upload
 * @param containerName - Container name (e.g., 'piiinput')
 * @returns Upload result with blob name and URL
 */
export async function uploadToBlob(
  file: File,
  containerName: string,
): Promise<UploadResult> {
  try {
    const containerClient = getContainerClient(containerName);

    // Generate unique blob name with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const blobName = `${timestamp}_${file.name}`;

    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // Upload file
    await blockBlobClient.uploadData(file, {
      blobHTTPHeaders: {
        blobContentType: file.type,
      },
    });

    return {
      success: true,
      blobName,
      url: blockBlobClient.url,
    };
  } catch (error) {
    console.error("Blob upload error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to upload file",
    };
  }
}

/**
 * Download blob from Azure Blob Storage
 * @param blobName - Name of the blob
 * @param containerName - Container name (e.g., 'piioutput')
 * @returns Blob data
 */
export async function downloadFromBlob(
  blobName: string,
  containerName: string,
): Promise<Blob | null> {
  try {
    const containerClient = getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    const downloadResponse = await blockBlobClient.download();
    const blob = await downloadResponse.blobBody;

    return blob || null;
  } catch (error) {
    console.error("Blob download error:", error);
    return null;
  }
}

/**
 * Upload blob data directly (not from File object)
 * @param data - Blob or ArrayBuffer data
 * @param filename - Filename for the blob
 * @param containerName - Container name
 * @param contentType - MIME type
 * @returns Upload result
 */
export async function uploadBlobData(
  data: Blob | ArrayBuffer,
  filename: string,
  containerName: string,
  contentType: string,
): Promise<UploadResult> {
  try {
    const containerClient = getContainerClient(containerName);

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const blobName = `${timestamp}_${filename}`;

    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.uploadData(data, {
      blobHTTPHeaders: {
        blobContentType: contentType,
      },
    });

    return {
      success: true,
      blobName,
      url: blockBlobClient.url,
    };
  } catch (error) {
    console.error("Blob data upload error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to upload data",
    };
  }
}
