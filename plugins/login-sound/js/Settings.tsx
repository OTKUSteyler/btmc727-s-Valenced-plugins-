import { Design } from '@valenced/discord/design'
import { ScrollView } from 'react-native'
import { getSettingsStorage } from './storage'

export default function Settings() {
	const storage = getSettingsStorage()
	const settings = storage.use()

	return (
		<ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
			<Design.TextInput
				label="Sound URL"
				description="Leave empty to use the default sound. Applies after a restart."
				placeholder="https://link.to/sound.mp3"
				value={settings?.customUrl ?? ''}
				onChange={(value: string) => {
					storage.set({ customUrl: value })
				}}
			/>
		</ScrollView>
	)
}
