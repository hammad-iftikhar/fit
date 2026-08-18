import { Platform, ScrollView, Text } from 'react-native'
import { Stack, useRouter } from 'expo-router'
import { File, Paths } from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import * as DocumentPicker from 'expo-document-picker'
import { clearAll, exportAll, importAll } from '../src/db'
import { BigButton, Card, Label, Muted } from '../src/ui'
import { theme } from '../src/theme'
import { alert } from '../src/alert'

export default function Settings() {
  const router = useRouter()

  const doExport = async () => {
    try {
      if (Platform.OS === 'web') {
        // Browsers have no share sheet for a file — a download is the export.
        const url = URL.createObjectURL(new Blob([exportAll()], { type: 'application/json' }))
        const a = document.createElement('a')
        a.href = url
        a.download = 'fit-backup.json'
        a.click()
        URL.revokeObjectURL(url)
        return
      }
      const file = new File(Paths.cache, 'fit-backup.json')
      file.create({ overwrite: true })
      file.write(exportAll())
      if (!(await Sharing.isAvailableAsync())) {
        alert('Sharing unavailable', `Backup written to ${file.uri}`)
        return
      }
      await Sharing.shareAsync(file.uri, { mimeType: 'application/json' })
    } catch (e) {
      alert('Export failed', String(e))
    }
  }

  const doImport = async () => {
    const picked = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true })
    if (picked.canceled) return
    alert('Replace all data?', 'Importing wipes everything currently stored on this device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Replace',
        style: 'destructive',
        onPress: async () => {
          try {
            const uri = picked.assets[0].uri
            // On web the picker hands back an object URL; expo-file-system is a no-op there.
            importAll(Platform.OS === 'web' ? await (await fetch(uri)).text() : await new File(uri).text())
            alert('Imported', 'Data restored.', [{ text: 'OK', onPress: () => router.replace('/') }])
          } catch (e) {
            // The transaction rolls back, so a bad file leaves existing data intact.
            alert('Import failed', String(e))
          }
        },
      },
    ])
  }

  const doClear = () => {
    alert('Delete everything?', 'All sessions, sets, and weights. This cannot be undone.', [
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
        Weights in kg.
      </Text>
    </ScrollView>
  )
}
