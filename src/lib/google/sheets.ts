import { google } from "googleapis";
import { getGoogleOAuthConfig, getGoogleOAuthRedirectUri } from "@/lib/google/config";

export type GoogleSpreadsheetSummary = {
  id: string;
  name: string;
};

export type GoogleSheetsTokenSource = {
  accessToken?: string;
  refreshToken?: string;
};

export async function getGoogleSheetsClient(
  tokens: GoogleSheetsTokenSource
): Promise<ReturnType<typeof google.drive> | null> {
  const config = getGoogleOAuthConfig();

  if (!config) {
    return null;
  }

  const oauth2Client = new google.auth.OAuth2(
    config.clientId,
    config.clientSecret,
    getGoogleOAuthRedirectUri()
  );

  oauth2Client.setCredentials({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
  });

  return google.drive({ version: "v3", auth: oauth2Client });
}

export async function listSpreadsheets(
  tokens: GoogleSheetsTokenSource
): Promise<GoogleSpreadsheetSummary[]> {
  const drive = await getGoogleSheetsClient(tokens);

  if (!drive) {
    return [];
  }

  const { data } = await drive.files.list({
    q: "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
    fields: "files(id,name)",
    orderBy: "modifiedTime desc",
    pageSize: 100,
  });

  return (data.files ?? [])
    .filter((file) => Boolean(file.id))
    .map((file) => ({
      id: file.id ?? "",
      name: file.name ?? "Untitled Spreadsheet",
    }));
}
