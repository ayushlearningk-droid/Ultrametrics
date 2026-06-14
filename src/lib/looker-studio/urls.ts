export function getSpreadsheetUrl(spreadsheetId: string): string {
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
}

export function getLookerStudioCreateUrl(): string {
  return "https://lookerstudio.google.com/reporting/create";
}
