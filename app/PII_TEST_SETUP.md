# PII Test Feature - Setup Guide

## Overview

The PII Test feature allows you to test Azure Cognitive Services for Language - PII Recognition directly from the application. You can input text and see detected PII entities and redacted output.

## Azure Language Service Setup

### 1. Create Azure Language Service Resource

1. Go to [Azure Portal](https://portal.azure.com)
2. Click "Create a resource"
3. Search for "Language service" or "Cognitive Services"
4. Click "Create" under "Language service"
5. Fill in the details:
   - **Subscription**: Your Azure subscription
   - **Resource group**: Create new or use existing
   - **Region**: Choose closest to you
   - **Name**: Your service name (e.g., `my-language-service`)
   - **Pricing tier**: Free (F0) for testing, or Standard (S)
6. Click "Review + create" → "Create"

### 2. Get Your Credentials

1. After deployment, go to your Language service resource
2. Click "Keys and Endpoint" in the left menu
3. Copy the following:
   - **Endpoint**: `https://YOUR-RESOURCE-NAME.cognitiveservices.azure.com`
   - **Key 1** or **Key 2**: Your API key

### 3. Configure Environment Variables

1. Navigate to `/Users/swivel/Desktop/OIS/app/`
2. Copy `.env.example` to `.env` if you haven't already:
   ```bash
   cp .env.example .env
   ```
3. Edit `.env` and add your credentials:
   ```env
   VITE_AZURE_LANGUAGE_ENDPOINT=https://your-language-service.cognitiveservices.azure.com
   VITE_AZURE_LANGUAGE_KEY=your-actual-api-key-here
   ```

### 4. Restart the Development Server

```bash
cd /Users/swivel/Desktop/OIS/app
npm run dev
```

## Usage

### Access the PII Test Page

1. Log in to the application
2. From the Dashboard, click the "🧪 PII Test" button
3. Or navigate directly to: `http://localhost:5173/pii-test`

### Test PII Recognition

1. **Enter text** containing PII in the input box
2. Or click **"load an example"** to use pre-filled sample text
3. Click **"🔍 Recognize PII"**
4. View the results:
   - **Redacted Text**: Original text with PII replaced by category labels
   - **Statistics**: Total entities, unique categories, average confidence
   - **Detected Entities**: List of all PII found with confidence scores

### Example Input

```
My name is Sarah Johnson and I work at Microsoft Corporation.
You can reach me at sarah.johnson@microsoft.com or call me at +1 (425) 555-0123.
My employee ID is EMP-98765 and I live at 123 Main Street, Seattle, WA 98101.
```

### Example Output (Redacted)

```
My name is [Person] and I work at [Organization].
You can reach me at [Email] or call me at [PhoneNumber].
My employee ID is [PersonType:EmployeeID] and I live at [Address].
```

## Features

### Service Layer (`azureLanguageService.ts`)

- Environment variable validation
- Error handling with user-friendly messages
- Type-safe response interfaces
- Automatic text redaction with category labels

### UI Components

- Two-column layout (input/output)
- Real-time entity statistics
- Detailed entity list with confidence scores
- Example text loader
- Responsive design for mobile

## Architecture

```
app/src/
├── pages/
│   ├── PIITest.tsx          # Main page component
│   └── PIITest.css          # Page-specific styles
├── services/
│   └── azureLanguageService.ts  # Azure Language API integration
└── App.tsx                  # Route configuration
```

## API Details

### Endpoint Used

```
POST {ENDPOINT}/language/:analyze-text?api-version=2023-04-01
```

### Request Body

```json
{
  "kind": "PiiEntityRecognition",
  "parameters": {
    "modelVersion": "latest",
    "domain": "none"
  },
  "analysisInput": {
    "documents": [
      {
        "id": "1",
        "language": "en",
        "text": "Your text here"
      }
    ]
  }
}
```

### Detected PII Categories

- **Person**: Names
- **Organization**: Companies, institutions
- **Email**: Email addresses
- **PhoneNumber**: Phone numbers
- **Address**: Physical addresses
- **SSN**: Social Security Numbers
- **CreditCardNumber**: Credit card numbers
- **PersonType**: Job titles, employee IDs
- **DateTime**: Dates
- **URL**: Website addresses
- And many more...

## Troubleshooting

### "Azure Language Service credentials not configured"

- Make sure you've created the `.env` file from `.env.example`
- Verify that `VITE_AZURE_LANGUAGE_ENDPOINT` and `VITE_AZURE_LANGUAGE_KEY` are set
- Restart the development server after adding environment variables

### "Azure Language Service error (401)"

- Check that your API key is correct
- Verify the key hasn't expired
- Try using Key 2 if Key 1 doesn't work

### "Azure Language Service error (404)"

- Verify your endpoint URL is correct
- Make sure it ends with `.cognitiveservices.azure.com`
- Check that the resource is deployed and active

### No entities detected

- The Azure service is working correctly - the text simply doesn't contain PII
- Try the example text to verify the service is working
- Some text patterns may not be recognized depending on language/format

## Cost Considerations

### Free Tier (F0)

- 5,000 text records per month
- Suitable for testing and small projects

### Standard Tier (S)

- Pay-per-use pricing
- See [Azure Pricing](https://azure.microsoft.com/pricing/details/cognitive-services/language-service/) for details

## Security Best Practices

1. **Never commit `.env` file** - It's already in `.gitignore`
2. **Rotate keys regularly** - Use Key 1/Key 2 rotation
3. **Use Managed Identity** in production instead of API keys
4. **Monitor usage** via Azure Portal to detect anomalies
5. **Set up cost alerts** to avoid unexpected charges

## Next Steps

- Deploy to production with environment-specific endpoints
- Add support for different languages (currently English only)
- Implement domain-specific PII detection (healthcare PHI, etc.)
- Add bulk text processing capabilities
- Export results to JSON/CSV
