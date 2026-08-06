import { Alert, ScrollView, Text } from 'react-native'
import { Stack, useRouter } from 'expo-router'
import { File, Paths } from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import * as DocumentPicker from 'expo-document-picker'
import { clearAll, exportAll, importAll } from '../src/db'
import { BigButton, Card, Label, Muted } from '../src/ui'
import { theme } from '../src/theme'

export default function Settings() {
  const router = useRouter()

  const doExport = async () => {
    try {
      const file = new File(Paths.cache, 'fit-backup.json')
      file.create({ overwrite: true })
      file.write(exportAll())
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Sharing unavailable', `Backup written to ${file.uri}`)
        return
      }
      await Sharing.shareAsync(file.uri, { mimeType: 'application/json' })
    } catch (e) {
      Alert.alert('Export failed', String(e))
    }
  }

  const doImport = async () => {
    const picked = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true })
    if (picked.canceled) return
    Alert.alert('Replace all data?', 'Importing wipes everything currently stored on this device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Replace',
        style: 'destructive',
        onPress: async () => {
          try {
            importAll(await new File(picked.assets[0].uri).text())
            Alert.alert('Imported', 'Data restored.', [{ text: 'OK', onPress: () => router.replace('/') }])
          } catch (e) {
            // The transaction rolls back, so a bad file leaves existing data intact.
            Alert.alert('Import failed', String(e))
          }
        },
      },
    ])
  }

  const doClear = () => {
    Alert.alert('Delete everything?', 'All sessions, sets, and weights. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { clearAll(); router.replace('/') } },
    ])
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.bg }}
      contentContainerStyle={{ padding: theme.space, gap: theme.space }}
    >
      <Stack.Screen options={{ title: 'Settings' }} />
      <Card>
        <Label>Backup</Label>
        <Muted>All data lives on this phone only. Export before changing devices.</Muted>
      </Card>
      <BigButton label="Export JSON" onPress={doExport} />
      <BigButton label="Import JSON" variant="ghost" onPress={doImport} />
      <BigButton label="Delete All Data" variant="ghost" onPress={doClear} />
      <Text style={{ color: theme.textMuted, fontSize: theme.font.tiny, textAlign: 'center' }}>
        Weights in kg. Program is fixed in src/program.ts.
      </Text>
    </ScrollView>
  )
}
