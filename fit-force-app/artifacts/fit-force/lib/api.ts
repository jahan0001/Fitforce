import { Platform } from 'react-native';
import Constants from 'expo-constants';

const DEV_API_PORT = 4000;

// The backend now runs on Railway (server/api-server.js deployed there),
// reachable at this permanent HTTPS address regardless of what network the
// phone is on — this is what makes a standalone build work anywhere, not
// just on the same LAN as a laptop running the server locally.
const PRODUCTION_API_BASE = 'https://backend-production-9469.up.railway.app';

/**
 * Figures out where the data server is. On web, the browser's own address
 * bar already has the right LAN IP (or "localhost") for local dev — reuse
 * it. On native running through the Expo dev server (Expo Go / dev
 * client), Constants exposes the host:port the JS bundle was loaded from,
 * which lives on the same machine as a locally-running dev server; swap
 * its port for the data server's. A standalone build (installed APK) has
 * no dev server connection, so hostUri is unavailable there — it always
 * uses the permanent production backend instead.
 */
function resolveApiBase(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname) {
    return `http://${window.location.hostname}:${DEV_API_PORT}`;
  }
  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants as any).expoGoConfig?.hostUri ??
    (Constants as any).manifest2?.extra?.expoClient?.hostUri;
  if (hostUri) {
    return `http://${String(hostUri).split(':')[0]}:${DEV_API_PORT}`;
  }
  return PRODUCTION_API_BASE;
}

export const API_BASE = resolveApiBase();
