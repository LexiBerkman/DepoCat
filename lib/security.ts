import "server-only";

export const securityChecklist = [
  "HTTPS-only deployment with secure session cookies",
  "All sensitive actions stay server-side",
  "No database secrets exposed in the browser",
  "Spreadsheet parsing stays on the server",
  "Protected pages require a validated session",
  "Ready for audit logs and two-user roles next",
];
