export interface UserBGData {
	endpoint: string
	bucket: string
	prefix: string
	users: Record<string, string>
}

export interface UserPFPData {
	avatars: Record<string, string>
}

export interface PluginSettings {
	userbgEnabled: boolean
	userpfpEnabled: boolean
}

export const DEFAULT_SETTINGS: PluginSettings = {
	userbgEnabled: true,
	userpfpEnabled: true,
}
