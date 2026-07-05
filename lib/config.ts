// Base URL for the API — does NOT include /api because the generated hooks
// already include /api in their paths (e.g. /api/auth/login).
export function getApiUrl(): string {
  if (process.env.EXPO_PUBLIC_DOMAIN) {
    return `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
  }
  return process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8080";
}
