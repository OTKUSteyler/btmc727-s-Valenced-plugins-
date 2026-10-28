import { getNativeModule } from '@valenced/modules/native'
import Settings from './Settings'
import { getSettingsStorage } from './storage'

interface SoundManager {
	prepare(
		url: string,
		category: string,
		id: number,
		callback: (error: unknown, sound?: { duration: number }) => void,
	): void
	play(id: number): Promise<unknown> | unknown
	stop(id: number): void
}

const DEFAULT_URL =
	'https://raw.githubusercontent.com/Rico040/meine-themen/master/sounds/discordo-discord.mp3'
const SOUND_ID = 6970

export default plugin({
	SettingsComponent: Settings,

	async start({ cleanup }) {
		const SoundManager = getNativeModule<SoundManager>('DCDSoundManager')
		if (!SoundManager) return

		let timeoutId: ReturnType<typeof setTimeout> | null = null
		let isPlaying = false

		function stopSound() {
			if (timeoutId != null) clearTimeout(timeoutId)
			timeoutId = null
			if (isPlaying) SoundManager!.stop(SOUND_ID)
			isPlaying = false
		}

		cleanup(stopSound)

		const settings = await getSettingsStorage().get()
		const soundUrl = settings.customUrl || DEFAULT_URL

		SoundManager.prepare(soundUrl, 'music', SOUND_ID, async (_error, sound) => {
			if (!sound) return

			stopSound()
			isPlaying = true
			await SoundManager.play(SOUND_ID)

			timeoutId = setTimeout(stopSound, sound.duration)
		})
	},
})
