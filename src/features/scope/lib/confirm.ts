import { Alert } from 'react-native';

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
}

/** Two-button confirm for destructive actions (delete, deactivate, reject). */
export function confirmAction({
  title,
  message,
  confirmLabel,
  cancelLabel,
  destructive = true,
  onConfirm,
}: ConfirmOptions): void {
  Alert.alert(title, message, [
    { text: cancelLabel, style: 'cancel' },
    { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: onConfirm },
  ]);
}
