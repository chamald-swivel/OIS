# Frontend Deployment Guide (Free Hosting)

## 🚀 Option 1: Azure Static Web Apps (Recommended)

### Prerequisites

- GitHub account
- Azure subscription (free tier available)

### Steps:

#### 1. Push Code to GitHub

```bash
cd /Users/swivel/Desktop/OIS
git init
git add .
git commit -m "Initial commit"

# Create a GitHub repo and push
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
git push -u origin main
```

#### 2. Create Static Web App in Azure Portal

1. Go to [Azure Portal](https://portal.azure.com)
2. Click **Create a resource**
3. Search for **Static Web App**
4. Click **Create**
5. Configure:
   - **Subscription**: Your subscription
   - **Resource Group**: Create new or use existing
   - **Name**: `ois-pii-sanitizer` (or your choice)
   - **Plan type**: **Free**
   - **Region**: Choose closest region
   - **Deployment source**: **GitHub**
6. Sign in to GitHub and authorize Azure
7. Select:
   - **Organization**: Your GitHub username
   - **Repository**: Your repo name
   - **Branch**: `main`
8. **Build Details**:
   - **Build Presets**: `React`
   - **App location**: `/app`
   - **Api location**: (leave empty)
   - **Output location**: `dist`
9. Click **Review + Create** → **Create**

#### 3. Configure Environment Variables (Secure)

1. Go to your Static Web App resource in Azure Portal
2. Click **Configuration** in left menu
3. Click **+ Add** to add each environment variable:

```env
VITE_MSAL_CLIENT_ID=your-azure-ad-client-id
VITE_MSAL_TENANT_ID=your-azure-ad-tenant-id
VITE_MSAL_REDIRECT_URI=https://YOUR-STATIC-WEB-APP.azurestaticapps.net
VITE_SANITIZE_API_URL=https://YOUR-FUNCTION-APP.azurewebsites.net
VITE_AZURE_LANGUAGE_ENDPOINT=https://your-language-service.cognitiveservices.azure.com/
VITE_AZURE_LANGUAGE_KEY=your-language-service-key-here
VITE_AZURE_STORAGE_ACCOUNT_NAME=piistorageac
VITE_AZURE_STORAGE_SAS_TOKEN=?sv=2024-11-04&ss=bfqt&srt=sco&sp=rwdlacupiytfx&se=2027-03-30...
VITE_AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=https://your-doc-intelligence.cognitiveservices.azure.com/
VITE_AZURE_DOCUMENT_INTELLIGENCE_KEY=your-document-intelligence-key-here
```

4. Click **Save**

#### 4. Update CORS & Redirect URIs

**Azure AD (MSAL)**:

1. Go to Azure Portal → Azure Active Directory → App registrations
2. Find your app (`d7c38197-653d-48fc-bfa7-a72dc10dbc9c`)
3. Go to **Authentication**
4. Add redirect URI: `https://YOUR-APP.azurestaticapps.net`
5. Save

**Azure Storage (CORS)**:

1. Go to your storage account → CORS
2. Add new rule with origin: `https://YOUR-APP.azurestaticapps.net`
3. Save

**Azure Function (CORS)**:

1. Go to your Function App → CORS
2. Add: `https://YOUR-APP.azurestaticapps.net`
3. Save

#### 5. Deploy

Azure Static Web Apps automatically deploys via GitHub Actions:

- Every push to `main` triggers a deployment
- Check **Actions** tab in GitHub to see build status
- Deployment typically takes 2-5 minutes

#### 6. Access Your App

Your app will be available at: `https://YOUR-APP-NAME.azurestaticapps.net`

---

## 🚀 Option 2: Vercel (Alternative - Very Easy)

### Steps:

#### 1. Install Vercel CLI

```bash
npm install -g vercel
```

#### 2. Login to Vercel

```bash
vercel login
```

#### 3. Deploy from app directory

```bash
cd /Users/swivel/Desktop/OIS/app
vercel
```

Follow prompts:

- Set up and deploy? **Y**
- Which scope? **Your account**
- Link to existing project? **N**
- Project name? **ois-pii-sanitizer**
- In which directory is your code located? **.**
- Want to override settings? **Y**
- Build command? **npm run build**
- Output directory? **dist**
- Development command? **npm run dev**

#### 4. Set Environment Variables

```bash
# Add each environment variable
vercel env add VITE_MSAL_CLIENT_ID
# Paste: d7c38197-653d-48fc-bfa7-a72dc10dbc9c
# Select: Production, Preview, Development

vercel env add VITE_MSAL_TENANT_ID
# Paste: 1c9c1873-35f4-41c9-a094-0279b9c8dd76

vercel env add VITE_MSAL_REDIRECT_URI
# Paste: https://YOUR-PROJECT.vercel.app

# Repeat for all other VITE_ variables...
```

Or use Vercel dashboard:

1. Go to [vercel.com](https://vercel.com)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add all variables

#### 5. Redeploy

```bash
vercel --prod
```

Your app will be at: `https://YOUR-PROJECT.vercel.app`

---

## 🚀 Option 3: Netlify (Alternative)

### Steps:

#### 1. Install Netlify CLI

```bash
npm install -g netlify-cli
```

#### 2. Login

```bash
netlify login
```

#### 3. Initialize and Deploy

```bash
cd /Users/swivel/Desktop/OIS/app
netlify init
```

Follow prompts:

- Create & configure a new site
- Team: Your team
- Site name: **ois-pii-sanitizer**
- Build command: **npm run build**
- Directory to deploy: **dist**

#### 4. Set Environment Variables

Via CLI:

```bash
netlify env:set VITE_MSAL_CLIENT_ID "d7c38197-653d-48fc-bfa7-a72dc10dbc9c"
netlify env:set VITE_MSAL_TENANT_ID "1c9c1873-35f4-41c9-a094-0279b9c8dd76"
# ... repeat for all variables
```

Or via Dashboard:

1. Go to [app.netlify.com](https://app.netlify.com)
2. Select your site
3. Go to **Site settings** → **Environment variables**
4. Add all variables

#### 5. Deploy

```bash
netlify deploy --prod
```

Your app will be at: `https://YOUR-SITE.netlify.app`

---

## 🔒 Security Best Practices

### ⚠️ Important: Client-Side Security Limitations

**Environment variables in Vite are bundled into the JavaScript** - anyone can inspect them in the browser. Here's how to mitigate risks:

### 1. Rotate SAS Tokens Regularly

```bash
# Generate new SAS token with short expiry (e.g., 30 days)
az storage account generate-sas \
  --account-name piistorageac \
  --services b \
  --resource-types sco \
  --permissions rwdlac \
  --expiry 2026-03-15 \
  --https-only
```

### 2. Restrict SAS Token Permissions

- Only grant necessary permissions: `rwdlac` (read, write, delete, list, add, create)
- Limit to specific containers if possible
- Set IP restrictions if you know your deployment IPs

### 3. Use Managed Identities (Production)

For production, replace API keys with Azure Managed Identity:

**Backend (Azure Function)**:

```python
# Use DefaultAzureCredential instead of API keys
from azure.identity import DefaultAzureCredential

credential = DefaultAzureCredential()
# No keys needed!
```

**Frontend**:

```typescript
// Call your backend API instead of Azure services directly
// Backend handles authentication with Managed Identity
const response = await fetch("/api/sanitize-document", {
  method: "POST",
  body: formData,
});
```

### 4. Set CORS Strictly

In production, **never use `*`** for CORS origins:

- Azure Storage CORS: Only your domain
- Azure Function CORS: Only your domain
- Azure AD Redirect URIs: Only your domain

### 5. Monitor API Usage

Set up Azure Monitor alerts for:

- Unusual API call volumes
- Failed authentication attempts
- Storage access patterns

---

## 📊 Comparison Table

| Feature               | Azure Static Web Apps | Vercel          | Netlify         |
| --------------------- | --------------------- | --------------- | --------------- |
| **Free Bandwidth**    | 100 GB/month          | 100 GB/month    | 100 GB/month    |
| **Build Minutes**     | 100 mins/month        | Unlimited       | 300 mins/month  |
| **Custom Domain**     | ✅ Free SSL           | ✅ Free SSL     | ✅ Free SSL     |
| **Env Variables**     | ✅ In Portal          | ✅ In Dashboard | ✅ In Dashboard |
| **Azure Integration** | ⭐ Native             | Basic           | Basic           |
| **Auto Deploy**       | ✅ GitHub Actions     | ✅ Git push     | ✅ Git push     |
| **Preview Deploys**   | ✅ Per PR             | ✅ Per PR       | ✅ Per PR       |
| **Best For**          | Azure projects        | Quick deploys   | Jamstack sites  |

---

## 🎯 Recommended Approach

**For Demo**: Use **Vercel** (fastest setup, 5 minutes)

**For Production**: Use **Azure Static Web Apps** + **Managed Identities**

---

## 🔧 Post-Deployment Checklist

- [ ] Update Azure AD redirect URI
- [ ] Update Azure Storage CORS
- [ ] Update Azure Function CORS
- [ ] Set all environment variables in hosting platform
- [ ] Test authentication flow
- [ ] Test file upload to blob storage
- [ ] Test PII detection (text and document)
- [ ] Monitor first few days for errors
- [ ] Set up expiry reminders for SAS tokens
- [ ] Consider adding application monitoring (Application Insights)

---

## 🆘 Troubleshooting

### "Failed to fetch" errors

- Check CORS settings in all Azure services
- Verify environment variables are set correctly
- Check browser console for specific errors

### "Authentication failed" errors

- Verify redirect URIs match exactly (no trailing slashes)
- Check MSAL client ID and tenant ID
- Ensure Azure AD app is configured correctly

### "Blob storage access denied"

- Verify SAS token hasn't expired
- Check CORS allows your domain
- Ensure SAS token has correct permissions

### Build fails

- Check `package.json` has all dependencies
- Verify build command is `npm run build`
- Check output directory is `dist`
- Review build logs for specific errors

---

## 📝 Sample GitHub Actions Workflow (If Manual Setup Needed)

Create `.github/workflows/azure-static-web-apps.yml`:

```yaml
name: Azure Static Web Apps CI/CD

on:
  push:
    branches:
      - main
  pull_request:
    types: [opened, synchronize, reopened, closed]
    branches:
      - main

jobs:
  build_and_deploy_job:
    if: github.event_name == 'push' || (github.event_name == 'pull_request' && github.event.action != 'closed')
    runs-on: ubuntu-latest
    name: Build and Deploy Job
    steps:
      - uses: actions/checkout@v3
        with:
          submodules: true
      - name: Build And Deploy
        id: builddeploy
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          repo_token: ${{ secrets.GITHUB_TOKEN }}
          action: "upload"
          app_location: "/app"
          output_location: "dist"
```

---

## 🎉 You're Done!

Your app is now deployed and accessible worldwide!

**Need help?** Check the troubleshooting section or Azure documentation.
