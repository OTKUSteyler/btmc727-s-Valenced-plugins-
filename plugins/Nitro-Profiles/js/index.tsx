import { getModules } from '@valenced/modules/finders'
import { withProps } from '@valenced/modules/finders/filters'
import { instead } from '@valenced/patcher'
import { clearData, fetchBG, fetchPFP, getBGData, getCustomAvatar } from './data'
import Settings from './Settings'
import { getSettingsStorage } from './storage'
import { DEFAULT_SETTINGS, type PluginSettings } from './types'

interface BannerModule {
	getUserBannerURL(user: any): any
}

interface AvatarModule {
	getUserAvatarURL(user: any, animate?: boolean): any
	getUserAvatarSource(user: any, animate?: boolean): any
}

export default plugin({
	SettingsComponent: Settings,

	async start({ cleanup }) {
		const storage = getSettingsStorage()
		let settings: PluginSettings = { ...DEFAULT_SETTINGS, ...(await storage.get()) }

		// Keep this state fresh when settings are changed from the settings screen.
		const isBGEnabled = () => settings.userbgEnabled
		const isPFPEnabled = () => settings.userpfpEnabled

		await Promise.all([fetchBG(), fetchPFP()])

		cleanup(
			getModules(withProps<BannerModule>('getUserBannerURL'), mod => {
				const unpatch = instead(
					mod as any,
					'getUserBannerURL',
					(args: any[], original: (...args: any[]) => any) => {
						const user = args[0]
						const bgData = getBGData()
						if (isBGEnabled() && bgData && user?.banner === undefined && user?.id) {
							const entry = bgData.users[user.id]
							if (entry) {
								return `${bgData.endpoint}/${bgData.bucket}/${bgData.prefix}${user.id}?${entry}`
							}
						}
						return original.apply(mod, args)
					},
				)
				cleanup(unpatch)
			}),
			getModules(withProps<AvatarModule>('getUserAvatarURL', 'getUserAvatarSource'), mod => {
				const unpatchURL = instead(
					mod as any,
					'getUserAvatarURL',
					(args: any[], original: (...args: any[]) => any) => {
						const [user, animate] = args
						if (isPFPEnabled() && user?.id) {
							const custom = getCustomAvatar(user.id, !animate)
							if (custom) return custom
						}
						return original.apply(mod, args)
					},
				)

				const unpatchSource = instead(
					mod as any,
					'getUserAvatarSource',
					(args: any[], original: (...args: any[]) => any) => {
						const [user, animate] = args
						const result = original.apply(mod, args)
						if (!isPFPEnabled() || !user?.id) return result

						const custom = getCustomAvatar(user.id, !animate)
						if (!custom) return result
						if (result && typeof result === 'object' && typeof result.uri === 'string') {
							return { ...result, uri: custom }
						}
						if (typeof result === 'number') return { uri: custom }
						return result
					},
				)

				cleanup(unpatchURL, unpatchSource)
			}),
			() => {
				clearData()
			},
		)

		// Storage updates are wired by the Settings component. Keep runtime state
		// synchronized if your Valenced storage helper emits updates; otherwise
		// restart the plugin after changing a toggle.
	},
})
