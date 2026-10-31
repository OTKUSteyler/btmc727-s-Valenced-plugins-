import { getJsonStorage, pluginStoragePathFor } from '@valenced/json-storage'
import type { PluginSettings } from './types'
import { DEFAULT_SETTINGS } from './types'

export const PLUGIN_ID = 'com.valenced.nitro-profiles'

let storage: ReturnType<typeof getJsonStorage<PluginSettings>> | undefined

/** Created lazily so the storage path is only resolved once the plugin runs. */
export function getSettingsStorage() {
	return (storage ??= getJsonStorage<PluginSettings>(
		pluginStoragePathFor(PLUGIN_ID, 'settings.json'),
		{ default: DEFAULT_SETTINGS },
	))
}

/**
 * In-memory copy of the settings that the patches read synchronously.
 * The settings screen and the plugin run in the same JS runtime, so updating
 * this from the settings screen makes toggles take effect immediately.
 */
let runtime: PluginSettings = { ...DEFAULT_SETTINGS }

export function getRuntimeSettings(): PluginSettings {
	return runtime
}

export function setRuntimeSettings(patch: Partial<PluginSettings>) {
	runtime = { ...runtime, ...patch }
}

/** Load saved settings from disk into the runtime copy (call from start()). */
export async function loadRuntimeSettings(): Promise<PluginSettings> {
	const saved = (await getSettingsStorage().get()) ?? {}
	runtime = { ...DEFAULT_SETTINGS, ...saved }
	return runtime
}
