import { getJsonStorage, pluginStoragePathFor } from '@valenced/json-storage'

export interface LoginSoundSettings {
	customUrl?: string
}

export const PLUGIN_ID = 'com.otkusteyler.loginsound'

let storage: ReturnType<typeof getJsonStorage<LoginSoundSettings>> | undefined

/** Created lazily so the storage path is only resolved once the plugin runs. */
export function getSettingsStorage() {
	return (storage ??= getJsonStorage<LoginSoundSettings>(
		pluginStoragePathFor(PLUGIN_ID, 'settings.json'),
		{ default: {} },
	))
}
