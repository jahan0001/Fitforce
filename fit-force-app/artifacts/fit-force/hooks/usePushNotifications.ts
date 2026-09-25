import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { updateUser } from '@/lib/storage';

/**
 * Requests notification permission, sets up the Android channel that makes
 * a background push actually play sound/vibrate/show a heads-up banner, and
 * saves this device's Expo push token onto the user's row so the server can
 * target it. Best-effort: any failure (permission denied, simulator, no
 * physical device) is swallowed since push is a bonus, not a requirement
 * for using the app.
 */
export async function registerForPushNotifications(userId: string): Promise<void> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        sound: 'default',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) return;

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    if (token) await updateUser(userId, { pushToken: token });
  } catch (_) {
    // Push is best-effort; the rest of the app must keep working without it.
  }
}
