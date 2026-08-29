import colors from '@/constants/colors';

/**
 * Always returns the dark palette regardless of each device's OS theme setting.
 * The app previously followed each device's system dark/light preference via
 * useColorScheme(), which made the background (and everything else) look
 * different across a phone and a laptop whenever their OS themes differed.
 * Forcing one palette keeps the app visually identical on every device.
 */
export function useColors() {
  return { ...colors.dark, radius: colors.radius };
}
