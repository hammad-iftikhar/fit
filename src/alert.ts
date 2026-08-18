import { Alert, Platform } from 'react-native'

type Button = { text: string; style?: 'default' | 'cancel' | 'destructive'; onPress?: () => void }

/** react-native-web's Alert.alert is an empty function, so every confirm dialog
 *  in the app would silently do nothing on web.
 *  ponytail: window.confirm carries exactly one action + cancel, which is all
 *  this app's dialogs use. A custom modal only if a third button ever shows up. */
export function alert(title: string, message?: string, buttons?: Button[]): void {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons)
    return
  }
  const body = message ? `${title}\n\n${message}` : title
  const action = buttons?.find((b) => b.style !== 'cancel')
  if (!buttons || buttons.length < 2) {
    window.alert(body)
    action?.onPress?.()
    return
  }
  if (window.confirm(body)) action?.onPress?.()
  else buttons.find((b) => b.style === 'cancel')?.onPress?.()
}
