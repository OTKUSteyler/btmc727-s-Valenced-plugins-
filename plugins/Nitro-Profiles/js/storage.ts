import type { PluginSettings } from './types'
import { DEFAULT_SETTINGS } from './types'

/**
 * Small storage adapter used by the plugin.
 *
 * This assumes Valenced's getSettingsStorage() helper exposes get() and set().
 * If your local helper has a different API, adjust only this adapter.
 */
export function getSettingsStorage() {
	// Replace this import/implementation with the storage helper from your
	// Valenced plugin template if it is not already available in this project.
	const storage = (globalThis as any).__valencedSettingsStorage

	return {
		async get(): Promise<PluginSettings> {
			const saved = (await storage?.get?.()) ?? {}
			return { ...DEFAULT_SETTINGS, ...saved }
		},
		async set(patch: Partial<PluginSettings>): Promise<void> {
			const current = (await storage?.get?.()) ?? {}
			await storage?.set?.({ ...DEFAULT_SETTINGS, ...current, ...patch })
		},
	}
}
