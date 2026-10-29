import { getModules } from '@valenced/modules/finders'
import { withProps } from '@valenced/modules/finders/filters'
import { instead } from '@valenced/patcher'
import Settings from './Settings'
import { getSettingsStorage } from './storage'
import { DEFAULT_SETTINGS, type PluginSettings, type UserBGData, type UserPFPData } from './types'

let bgData: UserBGData | null = null
let pfpData: UserPFPData | null = null

const BG_URL = 'https://usrbg.is-hardly.online/users'
const PFP_URL = 'https://userpfp.github.io/UserPFP/source/data.json'

async function fetchBG(): Promise<UserBGData | null> {
	try {
		const response = await fetch(BG_URL, { cache: 'no-store' })
		if (!response.ok) throw new Error(`UserBG request failed: ${response.status}`)
		bgData = await response.json()
		return bgData
	} catch {
		return null
	}
}

async function fetchPFP(): Promise<UserPFPData | null> {
	try {
		const response = await fetch(PFP_URL, {
			headers: { 'cache-control': 'max-age=1800' },
		})
		if (!response.ok) throw new Error(`UserPFP request failed: ${response.status}`)
		pfpData = await response.json()
		return pfpData
	} catch {
		return null
	}
}

function urlExt(url: string): string {
	return url.split('.').pop()?.split('?')[0] ?? ''
}

function getCustomAvatar(id: string, isStatic?: boolean): string | undefined {
	const avatar = pfpData?.avatars[id]
	if (!avatar) return undefined
	if (isStatic && urlExt(avatar) === 'gif') return avatar.replace(/\.gif(?=\?|$)/, '.png')
	return avatar
}

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

		const reloadBG = async () => !!(await fetchBG())
		const reloadPFP = async () => !!(await fetchPFP())

		// Expose reload handlers to Settings. The Settings screen can call these.
		;(Settings as any).pluginProps = { onReloadBG: reloadBG, onReloadPFP: reloadPFP }

		await Promise.all([fetchBG(), fetchPFP()])

		cleanup(
			getModules(withProps<BannerModule>('getUserBannerURL'), mod => {
				const unpatch = instead(
					mod as any,
					'getUserBannerURL',
					(args: any[], original: (...args: any[]) => any) => {
						const user = args[0]
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
				bgData = null
				pfpData = null
			},
		)

		// Storage updates are wired by the Settings component. Keep runtime state
		// synchronized if your Valenced storage helper emits updates; otherwise
		// restart the plugin after changing a toggle.
	},
})
