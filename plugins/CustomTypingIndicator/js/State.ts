import { getRegistryEntry, type TypingEntry } from './data'
import type { PluginApi } from '@valenced/plugins/types'

export interface ApiOptions {
	jsonStorage: {
		enabled: boolean
		/** The local user's own indicator, used only when they don't have Nitro. */
		mine: TypingEntry
		/** Emoji pool for "Surprise Me". */
		emojiPool: string[]
	}
}

export type TypingPluginApi = PluginApi<ApiOptions>

export interface ProductCatalog {
	canUserUse(this: ProductCatalog, product: any): boolean
	[key: string]: any
}

// Filled in by index.ts once the modules are found.
export const runtime = {
	api: null as TypingPluginApi | null,
	catalog: null as ProductCatalog | null,
	/** The untouched Discord check (bound before patching), so we always know real Nitro status. */
	canActuallyUse: null as null | ((product: any) => boolean),
	/** Feature constants on the catalog whose name mentions typing. */
	typingFeatures: [] as any[],
	currentUserId: null as string | null,
}

export function hasRealNitroTyping(): boolean {
	const { canActuallyUse, typingFeatures } = runtime
	if (!canActuallyUse || !typingFeatures.length) return false
	return typingFeatures.some(f => canActuallyUse(f))
}

/**
 * Which indicator should be shown for this user, or undefined to leave Discord's default.
 * Nitro is never overridden: if you have it, your own native indicator is the source of truth.
 */
export function resolveEntry(userId: string | undefined): TypingEntry | undefined {
	const settings = runtime.api?.jsonStorage.cache
	if (!userId || !settings?.enabled) return undefined

	if (userId === runtime.currentUserId) {
		if (hasRealNitroTyping()) return undefined
		const mine = settings.mine
		return mine.emojis.length || mine.text ? mine : undefined
	}
	return getRegistryEntry(userId)
}
