import { LogLevel, PublicClientApplication } from "@azure/msal-browser";

/**
 * MSAL Configuration
 * This configuration is used to initialize the MSAL instance for Azure AD authentication
 */
export const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_MSAL_CLIENT_ID || "",
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_MSAL_TENANT_ID || "common"}`,
    redirectUri:
      import.meta.env.VITE_MSAL_REDIRECT_URI || "http://localhost:5173",
  },
  cache: {
    cacheLocation: "localStorage" as const,
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      loggerCallback: (
        level: LogLevel,
        message: string,
        containsPii: boolean,
      ) => {
        if (containsPii) {
          return;
        }
        switch (level) {
          case LogLevel.Error:
            console.error(message);
            return;
          case LogLevel.Info:
            console.info(message);
            return;
          case LogLevel.Verbose:
            console.debug(message);
            return;
          case LogLevel.Warning:
            console.warn(message);
            return;
        }
      },
      logLevel: LogLevel.Warning,
    },
  },
};

/**
 * Scopes for user authentication
 */
export const loginRequest = {
  scopes: ["user.read"],
};

/**
 * MSAL instance - PublicClientApplication
 * This instance is used throughout the app for authentication operations
 */
export const msalInstance = new PublicClientApplication(msalConfig);
