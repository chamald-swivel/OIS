# Document Sanitization Setup (Azure AI Document Intelligence)

This document explains how to set up and use the document sanitization feature using **Azure AI Document Intelligence** and Azure Blob Storage.

## Overview

The document sanitization feature allows users to upload PDF or DOCX files and have personally identifiable information (PII) automatically detected and redacted using **Azure AI Document Intelligence** (formerly Form Recognizer). This service is specifically designed for document processing and can handle files directly without manual text extraction.

## Why Azure AI Document Intelligence?

Unlike Azure Language Service (which only accepts text), **Document Intelligence**:

- ✅ Accepts PDF, DOCX, and image files directly
- ✅ Performs PII detection on documents
- ✅ Preserves layout and formatting (when using advanced models)
- ✅ Built-in OCR for scanned documents
- ✅ Can extract structured data (tables, forms, key-value pairs)
- ✅ No manual text extraction needed

## Architecture

```
┌─────────────────┐
│  React Frontend │
│   (Browser)     │
└────────┬────────┘
         │
         ├───────────────────────────────────┐
         │                                   │
         v                                   v
┌──────────────────────┐          ┌────────────────────┐
│ Azure AI Document    │          │ Azure Blob Storage │
│ Intelligence API     │          │                    │
│ (PII Detection)      │          │ - piiinput         │
└──────────────────────┘          │ - piioutput        │
                                  └────────────────────┘
```

### Workflow

1. **File Upload**: User selects a PDF or DOCX file
2. **Upload to Blob**: Original file uploaded to `piiinput` container
3. **Document Analysis**: File sent to Document Intelligence API (base64 encoded)
4. **PII Detection**: API analyzes document and returns detected PII entities with content
5. **Text Redaction**: Replace detected PII with placeholders like `[Person_1]`, `[Email_2]`
6. **Storage**: Redacted document uploaded to `piioutput` container
7. **Download**: User downloads the sanitized file

## Prerequisites

### 1. Azure AI Document Intelligence

You need to create an Azure AI Document Intelligence resource:

#### Create Document Intelligence Resource

Via Azure Portal:

1. Go to Azure Portal
2. Click **Create a resource**
3. Search for **Document Intelligence** (or **Form Recognizer**)
4. Click **Create**
5. Configure:
   - **Subscription**: Your Azure subscription
   - **Resource group**: Create new or use existing
   - **Region**: Choose closest region
   - **Name**: Give it a unique name (e.g., `my-doc-intelligence`)
   - **Pricing tier**: Free (F0) or Standard (S0)
6. Click **Review + Create**, then **Create**

Via Azure CLI:

```bash
az cognitiveservices account create \
  --name my-doc-intelligence \
  --resource-group <your-resource-group> \
  --kind FormRecognizer \
  --sku F0 \
  --location <your-location> \
  --yes
```

#### Get Credentials

1. Go to your Document Intelligence resource in Azure Portal
2. Navigate to **Keys and Endpoint**
3. Copy the **Endpoint** (e.g., `https://my-doc-intelligence.cognitiveservices.azure.com/`)
4. Copy **Key 1**

### 2. Azure Storage Account

You need to create an Azure Storage Account with the following setup:

#### Create Storage Account

```bash
# Via Azure Portal or Azure CLI
az storage account create \
  --name <your-storage-account-name> \
  --resource-group <your-resource-group> \
  --location <your-location> \
  --sku Standard_LRS
```

#### Create Blob Containers

Create two containers in your storage account:

1. **piiinput**: Stores original uploaded files
2. **piioutput**: Stores sanitized files

```bash
# Create containers
az storage container create \
  --name piiinput \
  --account-name <your-storage-account-name>

az storage container create \
  --name piioutput \
  --account-name <your-storage-account-name>
```

#### Generate SAS Token

For client-side access, generate a Shared Access Signature (SAS) token:

1. Go to Azure Portal → Your Storage Account
2. Navigate to **Security + networking** → **Shared access signature**
3. Configure the SAS token:
   - **Allowed services**: ✅ Blob
   - **Allowed resource types**: ✅ Service, ✅ Container, ✅ Object
   - **Allowed permissions**: ✅ Read, ✅ Write, ✅ Delete, ✅ List, ✅ Add, ✅ Create
   - **Start time**: Current date/time
   - **Expiry time**: Set to your preference (e.g., 1 year from now)
   - **Allowed protocols**: HTTPS only
   - **Signing key**: key1
4. Click **Generate SAS and connection string**
5. Copy the **SAS token** (starts with `?sv=...`)

#### Configure CORS (Important!)

Enable CORS on your storage account to allow browser access:

1. Go to Azure Portal → Your Storage Account
2. Navigate to **Settings** → **Resource sharing (CORS)**
3. Click on **Blob service** tab
4. Add a new CORS rule:
   - **Allowed origins**: `http://localhost:5173` (for development) or your production URL
   - **Allowed methods**: GET, PUT, POST, DELETE, HEAD, OPTIONS
   - **Allowed headers**: `*`
   - **Exposed headers**: `*`
   - **Max age**: `3600`
5. Click **Save**

### 3. Update Environment Variables

Edit the `/app/.env` file and add your Azure credentials:

```env
# Azure Blob Storage Configuration
VITE_AZURE_STORAGE_ACCOUNT_NAME=your-storage-account-name
VITE_AZURE_STORAGE_SAS_TOKEN=?sv=2021-06-08&ss=b&srt=sco&sp=rwdlac&se=2025-12-31T00:00:00Z&sig=your-actual-sas-token

# Azure AI Document Intelligence Configuration
VITE_AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=https://your-doc-intelligence.cognitiveservices.azure.com/
VITE_AZURE_DOCUMENT_INTELLIGENCE_KEY=your-document-intelligence-key
```

**Important**:

- Replace `your-storage-account-name` with your actual storage account name
- Replace the SAS token with the one you generated
- Replace `your-doc-intelligence` with your Document Intelligence resource name
- Replace `your-document-intelligence-key` with your actual key
- The SAS token should start with `?sv=`
- Keep the `.env` file secure and never commit it to version control

## Usage

### Start the Application

```bash
# Navigate to app directory
cd /Users/swivel/Desktop/OIS/app

# Install dependencies (if not already done)
npm install

# Start development server
npm run dev
```

### Test the Feature

1. Open browser and navigate to `http://localhost:5173`
2. Log in with your Azure AD credentials
3. Go to Dashboard and click **PII Test** button
4. Switch to the **📄 Document Sanitization** tab
5. Click **Choose File** and select a PDF or DOCX file
6. Click **🔒 Sanitize Document**
7. Wait for processing (progress indicator will show)
8. The sanitized file will automatically download
9. Check Azure Blob Storage containers to verify uploads

### Supported File Formats

- **PDF** (`.pdf`): Full support with OCR for scanned documents
- **DOCX** (`.docx`): Full support for Microsoft Word documents
- **Images**: Supported formats include PNG, JPEG, TIFF (with OCR)

### File Size Limits

- Maximum file size: **10 MB**
- Files exceeding this limit will be rejected

## Technical Details

### Libraries Used

- **@azure/storage-blob**: Client-side Azure Blob Storage operations
- **No PDF/DOCX parsing libraries needed**: Document Intelligence handles files directly!

### Service Layer

#### `documentSanitizationService.ts`

Orchestrates the document sanitization workflow using Document Intelligence.

```typescript
// Sanitize document (end-to-end)
const result = await sanitizeDocumentWithDocumentIntelligence(file);
// Returns: { success, blob, inputBlobName, outputBlobName, entitiesFound, error }
```

Key functions:

- `analyzeDocumentForPII(file)`: Sends file to Document Intelligence API
- `redactPIIFromText(content, entities)`: Replaces PII with placeholders
- `createRedactedDocumentBlob(text, filename)`: Creates sanitized file

#### `blobStorageService.ts`

Handles Azure Blob Storage operations.

```typescript
// Upload file to blob container
const result = await uploadToBlob(file, "piiinput");

// Upload blob data
const result = await uploadBlobData(blob, fileName, "piioutput", contentType);
```

### API Details

The service uses the Document Intelligence **prebuilt-read** model with the following configuration:

- **API Version**: `2024-11-30`
- **Model**: `prebuilt-read` (general document reading)
- **Features**: Extracts content, entities, layout
- **Authentication**: Subscription key (Ocp-Apim-Subscription-Key header)
- **Method**: Async operation (POST to analyze, GET to retrieve results)

### Security Considerations

#### SAS Token Security

- ✅ Use **time-limited** SAS tokens (set expiry date)
- ✅ Grant **minimum required permissions** (read, write, create, delete for blob only)
- ✅ Use **HTTPS only** protocol
- ✅ **Never commit** SAS tokens to version control
- ✅ **Rotate tokens** regularly (before expiry)

#### Client-Side Limitations

- ⚠️ All processing happens in the browser - files are not sent to your backend
- ⚠️ Large files may cause performance issues
- ⚠️ PDF formatting is not preserved (text-only output)
- ⚠️ Browser memory limits may affect very large documents

## Limitations & Known Issues

### Current Implementation

**Note**: The current implementation uses the **prebuilt-read** model which:

- ✅ Extracts text content from documents
- ✅ Detects entities (including PII)
- ✅ Preserves text order and structure
- ⚠️ Output is text-based (formatting simplified)

### Future Enhancements

For full formatting preservation, consider:

1. Using **custom models** trained on your document types
2. Implementing **PDF redaction** using backend libraries (PyMuPDF)
3. Using **layout analysis** features for better structure preservation

### Alternative: Backend Processing

For formatted output with preserved layout, fonts, and images:

- Use the existing Azure Function endpoint (`/api/sanitize-docx`)
- This uses PyMuPDF for in-place PDF redaction
- Preserves all formatting, fonts, tables, and images

## Troubleshooting

### Error: "Failed to upload file to storage"

**Cause**: Missing or invalid SAS token, CORS not configured

**Solution**:

1. Verify `VITE_AZURE_STORAGE_ACCOUNT_NAME` and `VITE_AZURE_STORAGE_SAS_TOKEN` in `.env`
2. Check SAS token hasn't expired
3. Verify CORS is configured on the storage account
4. Restart the development server after updating `.env`

### Error: "Document Intelligence credentials not configured"

**Cause**: Missing environment variables

**Solution**:

1. Verify `VITE_AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT` and `VITE_AZURE_DOCUMENT_INTELLIGENCE_KEY` in `.env`
2. Ensure endpoint format is correct: `https://YOUR-RESOURCE.cognitiveservices.azure.com/`
3. Ensure endpoint ends with `/` (trailing slash)
4. Restart the development server after updating `.env`

### Error: "Document Intelligence API error: 401"

**Cause**: Invalid or expired API key

**Solution**:

1. Go to Azure Portal → Your Document Intelligence resource
2. Navigate to **Keys and Endpoint**
3. Copy a fresh key (Key 1 or Key 2)
4. Update `VITE_AZURE_DOCUMENT_INTELLIGENCE_KEY` in `.env`
5. Restart development server

### Error: "Document Intelligence API error: 403"

**Cause**: Resource endpoint mismatch or quota exceeded

**Solution**:

1. Verify the endpoint URL matches your resource name
2. Check if you've exceeded your pricing tier quota (Free tier: 500 calls/month)
3. Upgrade to Standard tier if needed

### Error: "Document analysis timed out"

**Cause**: Large file or slow processing

**Solution**:

1. Check file size (should be under 10MB)
2. Try with a smaller document first
3. Check network connectivity
4. Verify the Document Intelligence service is running (check Azure Portal → Resource health)

### Error: "No text content found in document"

**Cause**: PDF is image-based (scanned) or DOCX is empty

**Solution**:

1. Verify the file contains actual text (not just images)
2. For scanned PDFs, use OCR first
3. Check the file is not corrupted

### Error: "Failed to fetch"

**Cause**: CORS issues or network problems

**Solution**:

1. Open browser DevTools → Network tab
2. Check the failed request
3. Verify CORS is configured correctly on Azure Storage
4. Ensure SAS token has required permissions

## Production Deployment

### Environment Variables

Create a production `.env.production` file:

```env
# Production Azure AD
VITE_MSAL_CLIENT_ID=production-client-id
VITE_MSAL_TENANT_ID=production-tenant-id
VITE_MSAL_REDIRECT_URI=https://your-production-domain.com

# Production API
VITE_SANITIZE_API_URL=https://your-function-app.azurewebsites.net

# Production Language Service (for text-based PII recognition)
VITE_AZURE_LANGUAGE_ENDPOINT=https://your-language-service.cognitiveservices.azure.com/
VITE_AZURE_LANGUAGE_KEY=production-language-key

# Production Blob Storage
VITE_AZURE_STORAGE_ACCOUNT_NAME=production-storage-account
VITE_AZURE_STORAGE_SAS_TOKEN=production-sas-token

# Production Document Intelligence
VITE_AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=https://production-doc-intel.cognitiveservices.azure.com/
VITE_AZURE_DOCUMENT_INTELLIGENCE_KEY=production-doc-intel-key
```

### Update CORS for Production

Add your production domain to Azure Storage CORS settings:

- **Allowed origins**: `https://your-production-domain.com`

### Build for Production

```bash
npm run build
```

Deploy the `dist/` folder to your hosting service (Azure Static Web Apps, Vercel, Netlify, etc.).

## Related Documentation

- [Azure AI Document Intelligence Overview](https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/overview)
- [Document Intelligence Prebuilt Models](https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/concept-model-overview)
- [Azure Blob Storage REST API](https://learn.microsoft.com/en-us/rest/api/storageservices/blob-service-rest-api)
- [Document Intelligence PII Detection](https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/concept-custom-neural)

## Comparison: Document Intelligence vs Language Service

| Feature             | Language Service            | Document Intelligence   |
| ------------------- | --------------------------- | ----------------------- |
| Input               | Text only                   | PDF, DOCX, images       |
| PII Detection       | ✅ Yes                      | ✅ Yes                  |
| File Processing     | ❌ Manual extraction needed | ✅ Direct file upload   |
| OCR Support         | ❌ No                       | ✅ Yes                  |
| Layout Preservation | ❌ No                       | ✅ Partial (text order) |
| Tables/Forms        | ❌ No                       | ✅ Yes                  |
| Best For            | Text analysis               | Document processing     |

## Support

For issues or questions:

1. Check browser console for error messages
2. Verify all environment variables are set correctly
3. Review Azure Portal logs for Language Service and Storage Account
4. Check CORS configuration
