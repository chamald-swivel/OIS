# Quick Start Guide 🚀

## Step 1: Azure AD Setup (5 minutes)

1. Visit [Azure Portal](https://portal.azure.com)
2. Go to **Azure Active Directory** → **App registrations** → **New registration**
3. Enter:
   - **Name**: My React App (or any name)
   - **Account type**: Single tenant
   - **Redirect URI**:
     - Platform: **Single-page application (SPA)**
     - URL: `http://localhost:5173`
4. Click **Register**
5. Copy **Application (client) ID** and **Directory (tenant) ID**

## Step 2: Configure Environment (1 minute)

Edit `.env` file:

```env
VITE_MSAL_CLIENT_ID=your-application-client-id-here
VITE_MSAL_TENANT_ID=your-directory-tenant-id-here
VITE_MSAL_REDIRECT_URI=http://localhost:5173
```

## Step 3: Run the App (30 seconds)

```bash
npm run dev
```

Open: http://localhost:5173

## That's it! 🎉

Click "Sign in with Microsoft" to test authentication!

## Available Routes

- **/** - Home (redirects to dashboard or login)
- **/login** - Login page
- **/dashboard** - Main dashboard (protected)
- **/profile** - User profile (protected)

## Troubleshooting

**Issue**: Login redirect not working
**Solution**: Make sure redirect URI in Azure AD matches exactly `http://localhost:5173`

**Issue**: "Application not found" error
**Solution**: Double-check Client ID and Tenant ID in `.env` file

**Issue**: TypeScript errors
**Solution**: Run `npm install` to ensure all dependencies are installed
