import { Platform, Alert as RNAlert } from 'react-native';

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

/**
 * react-native-web's Alert.alert() is a complete no-op on web — it shows
 * nothing and never calls any button's onPress. That silently breaks every
 * confirm dialog (Approve, Delete, ...) and every "OK to continue" flow
 * (e.g. navigating back after a save) whenever the app runs in a browser,
 * with no error or warning to say so. This wraps Alert.alert so native
 * platforms keep the real dialog, while web falls back to window.alert /
 * window.confirm so the button actions this app depends on actually run.
 */
export function showAlert(title: string, message?: string, buttons?: AlertButton[]): void {
  if (Platform.OS !== 'web') {
    RNAlert.alert(title, message, buttons as any);
    return;
  }

  const list = buttons && buttons.length > 0 ? buttons : [{ text: 'OK' } as AlertButton];
  const text = [title, message].filter(Boolean).join('\n\n');

  if (list.length === 1) {
    window.alert(text);
    list[0].onPress?.();
    return;
  }

  const cancelBtn = list.find(b => b.style === 'cancel');
  const actionBtn = list.find(b => b.style !== 'cancel') ?? list[list.length - 1];

  if (window.confirm(text)) {
    actionBtn.onPress?.();
  } else {
    cancelBtn?.onPress?.();
  }
}
