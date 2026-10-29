// FavouriteAnything - by @TheUnrealZaka
// Ported from the Equicord desktop plugin (nin0dev & davri)
// Patches GIFFavButton so the star shows on all media, not just GIFs.
// Valenced port by OTKUSteyler aka btmc727.

/*!
 * Copyright (c) 2026 Zakaria Hamdaoui
 * Licensed under the MIT License. See the LICENSE file in the project root.
 * SPDX-License-Identifier: MIT
 */

import { getModules } from '@valenced/modules/finders'
import { createFilterGenerator, withProps } from '@valenced/modules/finders/filters'
import { after, before } from '@valenced/patcher'
import { useEffect, useMemo, useReducer } from 'react'
import Settings from './Settings'

const TAG = '[FavouriteAnything]'

const SIGNED_RE =
	/^https:\/\/(?:cdn\.discordapp\.com|media\.discordapp\.net|images-ext-[12]\.discordapp\.net)\/(?:attachments|ephemeral-attachments|external)\//
const ATTACHMENT_RE =
	/^https:\/\/(?:cdn\.discordapp\.com|media\.discordapp\.net)\/(?:attachments|ephemeral-attachments)\//
const VIDEO_RE = /\.(?:mp4|webm|mov|m4v|avi|mkv|flv|wmv|gifv)$/i
const THUMB_RE = /[?&]format=(?:png|jpe?g|webp)(?:&|$)/i
const SIGNATURE_RE = /^(?:ex|is|hm)=/
const PARAM_RE = /^[A-Za-z_]\w*=/
const CDN = 'cdn.discordapp.com'
const MEDIA = 'media.discordapp.net'

const EXPIRY_MARGIN_MS = 3600000
const BATCH_SIZE = 50
const FLUSH_DELAY_MS = 50
const COOLDOWN_MS = 300000
const MAX_QUEUED = 500
const REFRESH_ENDPOINT = '/attachments/refresh-urls'

const FORMAT_NONE = 0
const FORMAT_IMAGE = 1
const FORMAT_VIDEO = 2

interface RestApi {
	getAPIBaseURL(...args: unknown[]): string
	post(options: {
		url: string
		body: unknown
		retries?: number
	}): Promise<{ body?: { refreshed_urls?: { original?: string; refreshed?: string }[] } }>
}

interface FavoriteItem {
	url?: string
	src?: string
	format?: number
	[key: string]: unknown
}

interface ButtonSource {
	isGIFV?: boolean
	embedURI?: string
	sourceURI?: string
	uri?: string
	videoURI?: string
	embedProviderName?: string
	[key: string]: unknown
}

const stats = {
	buttonRenders: 0,
	buttonRewritten: 0,
	renewed: 0,
	renewFailed: 0,
	requests: 0,
	savesFixed: 0,
	itemsFixed: 0,
}
const patchState: Record<string, string> = {
	button: 'pending',
	save: 'pending',
	picker: 'pending',
}

const listeners = new Set<() => void>()
const renewed = new Map<string, string>()
const cooldown = new Map<string, number>()
const queue = new Set<string>()
let queuedTotal = 0
let flushTimer: ReturnType<typeof setTimeout> | null = null
let flushing = false
let version = 0
let stopped = false
let restApi: RestApi | undefined
let mapped = new WeakMap<object, { version: number; out: unknown }>()

function split(url: string): [string, string, string] {
	const h = url.indexOf('#')
	const hash = h < 0 ? '' : url.slice(h)
	const rest = h < 0 ? url : url.slice(0, h)
	const q = rest.indexOf('?')
	return q < 0 ? [rest, '', hash] : [rest.slice(0, q), rest.slice(q + 1), hash]
}

const baseOf = (u: string) => split(u)[0]
const paramsOf = (u: string) => split(u)[1].split('&').filter(Boolean)
const extrasOf = (u: string) =>
	paramsOf(u).filter(p => PARAM_RE.test(p) && !SIGNATURE_RE.test(p))
const signatureOf = (u: string) => paramsOf(u).filter(p => SIGNATURE_RE.test(p))
const keyOf = (p: string) => p.slice(0, p.indexOf('='))

function build(base: string, params: string[], hash?: string): string {
	const seen = new Set<string>()
	const unique = params.filter(p => {
		const k = keyOf(p)
		if (seen.has(k)) return false
		seen.add(k)
		return true
	})
	return base + (unique.length ? `?${unique.join('&')}` : '') + (hash || '')
}

const isSigned = (u: unknown): u is string =>
	typeof u === 'string' && SIGNED_RE.test(u)
const isAttachment = (u: unknown): u is string =>
	typeof u === 'string' && ATTACHMENT_RE.test(u)
const isVideoFile = (u: unknown): u is string =>
	typeof u === 'string' && VIDEO_RE.test(baseOf(u))
const isVideoSrc = (u: unknown): u is string =>
	isVideoFile(u) && !THUMB_RE.test(u)

function expiryOf(u: string): number {
	const m = /[?&]ex=([0-9a-f]+)/i.exec(u)
	return m ? parseInt(m[1]!, 16) * 1000 : 0
}

const isStale = (u: string) => expiryOf(u) - EXPIRY_MARGIN_MS < Date.now()

function notify() {
	version++
	for (const f of listeners) {
		try {
			f()
		} catch {
			listeners.delete(f)
		}
	}
}

function enqueue(key: string) {
	if (queue.has(key) || queuedTotal >= MAX_QUEUED) return
	if ((cooldown.get(key) ?? 0) > Date.now()) return
	queue.add(key)
	queuedTotal++
	if (!flushTimer && !flushing) flushTimer = setTimeout(flush, FLUSH_DELAY_MS)
}

function failBatch(chunk: string[]) {
	stats.renewFailed += chunk.length
	for (const k of chunk) cooldown.set(k, Date.now() + COOLDOWN_MS)
}

async function flush() {
	flushTimer = null
	if (flushing || stopped) return
	flushing = true
	try {
		const api = restApi
		while (queue.size && !stopped) {
			const chunk = Array.from(queue).slice(0, BATCH_SIZE)
			for (const k of chunk) queue.delete(k)
			if (!api) {
				failBatch(chunk)
				continue
			}
			try {
				stats.requests++
				const res = await api.post({
					url: REFRESH_ENDPOINT,
					body: { attachment_urls: chunk },
					retries: 3,
				})
				for (const r of res?.body?.refreshed_urls ?? []) {
					if (r?.original && r?.refreshed) renewed.set(r.original, r.refreshed)
				}
				const missed: string[] = []
				for (const k of chunk) {
					const got = renewed.get(k)
					if (got && !isStale(got)) stats.renewed++
					else missed.push(k)
				}
				if (missed.length) failBatch(missed)
			} catch (e) {
				failBatch(chunk)
				console.warn(TAG, 'refresh-urls failed', e)
			}
		}
	} finally {
		flushing = false
		if (!stopped) notify()
	}
}

function resolveUrl(url: string | undefined): string | undefined {
	if (!isSigned(url) || !isStale(url)) return url
	const key = baseOf(url)
	const hit = renewed.get(key)
	if (hit && !isStale(hit)) {
		const [base, query] = split(hit)
		const fresh = query.split('&').filter(Boolean)
		return build(base, [...fresh, ...extrasOf(url)], split(url)[2])
	}
	enqueue(key)
	return url
}

function fixFormat(src: unknown, format: number | undefined): number | undefined {
	if (isVideoSrc(src)) return FORMAT_VIDEO
	if (format === FORMAT_VIDEO && isSigned(src)) return FORMAT_IMAGE
	return format
}

function videoThumbnail(src: string): string {
	const [base, , hash] = split(src)
	return build(
		base.replace(CDN, MEDIA),
		[...signatureOf(src), ...extrasOf(src), 'format=png'],
		hash,
	)
}

function fixItem(item: FavoriteItem): FavoriteItem {
	if (!item || typeof item !== 'object') return item
	const url = resolveUrl(item.url)
	let src = resolveUrl(item.src)
	if (isAttachment(src) && isVideoSrc(src)) src = videoThumbnail(src)
	const format =
		item.format === FORMAT_NONE ? FORMAT_NONE : fixFormat(src, item.format)
	if (url === item.url && src === item.src && format === item.format) return item
	stats.itemsFixed++
	return { ...item, url, src, format }
}

function mapFavorites(favs: FavoriteItem[]): FavoriteItem[] {
	const hit = mapped.get(favs)
	if (hit && hit.version === version) return hit.out as FavoriteItem[]
	let changed = false
	const out = favs.map(i => {
		const n = fixItem(i)
		if (n !== i) changed = true
		return n
	})
	const result = changed ? out : favs
	mapped.set(favs, { version, out: result })
	return result
}

function normalizeSave(data: FavoriteItem): FavoriteItem {
	const { url, src, format } = data
	if (format === FORMAT_NONE) return data
	if (isAttachment(url) && isVideoSrc(url) && !isVideoSrc(src)) {
		const [base, , hash] = split(url)
		const next = build(base, signatureOf(url), hash)
		return { ...data, src: next, format: FORMAT_VIDEO }
	}
	const fixed = fixFormat(src, format)
	return fixed === format ? data : { ...data, format: fixed }
}

const nameOf = (fn: any): string | undefined => fn?.displayName ?? fn?.name

/** Finds the object + key holding the GIFFavButton component inside a module's exports. */
function locateButton(mod: any): [any, string] | null {
	try {
		for (const holder of [mod?.default, mod]) {
			if (
				holder &&
				typeof holder.type === 'function' &&
				nameOf(holder.type) === 'GIFFavButton'
			) {
				return [holder, 'type']
			}
		}
		if (typeof mod?.default === 'function' && nameOf(mod.default) === 'GIFFavButton') {
			return [mod, 'default']
		}
	} catch {
		return null
	}
	return null
}

const withGIFFavButton = createFilterGenerator<[]>(
	// exports can be a Proxy, nullish or a primitive; locateButton guards all of that.
	(_args, _id, exports) => !!locateButton(exports),
	() => 'favouriteanything.GIFFavButton',
)

function rewriteButtonArgs(args: any[]): any[] {
	stats.buttonRenders++
	const props = args[0]
	const s: ButtonSource | undefined = props?.source
	if (!s || typeof s !== 'object' || s.isGIFV) return args
	stats.buttonRewritten++
	return [
		{
			...props,
			source: {
				...s,
				isGIFV: true,
				embedURI: s.embedURI || s.sourceURI || s.uri,
				videoURI: s.videoURI || s.uri,
				embedProviderName: s.embedProviderName || '',
			},
		},
		...args.slice(1),
	]
}

function useRerender() {
	const [, force] = useReducer((x: number) => x + 1, 0)
	useEffect(() => {
		listeners.add(force as () => void)
		return () => {
			listeners.delete(force as () => void)
		}
	}, [])
}

export default plugin({
	SettingsComponent: Settings,

	start({ cleanup }) {
		stopped = false

		cleanup(
			// REST module, used to renew expired attachment URLs
			getModules(withProps<RestApi>('getAPIBaseURL', 'post'), mod => {
				restApi = mod
			}),

			// Star button: let it render for every kind of media, not only GIFs
			getModules(withGIFFavButton(), mod => {
				const target = locateButton(mod)
				if (!target) {
					patchState.button = 'missing'
					return
				}
				try {
					cleanup(before(target[0], target[1], rewriteButtonArgs as any))
					patchState.button = 'applied'
				} catch (e) {
					patchState.button = `error: ${String((e as Error)?.message ?? e)}`
					console.warn(TAG, 'button patch failed', e)
				}
			}),

			// Saving: make sure videos and images are stored with the right format
			getModules(withProps<any>('addFavoriteGIF'), mod => {
				if (typeof mod?.addFavoriteGIF !== 'function') {
					patchState.save = 'missing'
					return
				}
				try {
					cleanup(
						before(mod, 'addFavoriteGIF', (args: any[]) => {
							const data = args[0]
							if (!data || typeof data !== 'object') return args
							const next = normalizeSave(data)
							if (next === data) return args
							stats.savesFixed++
							return [next, ...args.slice(1)]
						}),
					)
					patchState.save = 'applied'
				} catch (e) {
					patchState.save = `error: ${String((e as Error)?.message ?? e)}`
					console.warn(TAG, 'save patch failed', e)
				}
			}),

			// Picker: show saved videos/images correctly and renew expired URLs
			getModules(withProps<any>('useFavoriteGIFsMobile'), mod => {
				if (typeof mod?.useFavoriteGIFsMobile !== 'function') {
					patchState.picker = 'missing'
					return
				}
				try {
					cleanup(
						after(mod, 'useFavoriteGIFsMobile', (res: any) => {
							useRerender()
							const favs = res?.favorites
							const out = Array.isArray(favs) ? mapFavorites(favs) : favs
							return useMemo(
								() => (out === favs ? res : { ...res, favorites: out }),
								[res, out],
							)
						}),
					)
					patchState.picker = 'applied'
				} catch (e) {
					patchState.picker = `error: ${String((e as Error)?.message ?? e)}`
					console.warn(TAG, 'picker patch failed', e)
				}
			}),

			() => {
				stopped = true
				if (flushTimer) clearTimeout(flushTimer)
				flushTimer = null
				listeners.clear()
				renewed.clear()
				cooldown.clear()
				queue.clear()
				queuedTotal = 0
				version = 0
				restApi = undefined
				mapped = new WeakMap()
				for (const k of Object.keys(patchState)) patchState[k] = 'pending'
				for (const k of Object.keys(stats) as (keyof typeof stats)[]) stats[k] = 0
				delete (globalThis as any).__FavouriteAnything
			},
		)

		// Debug helper: __FavouriteAnything.status() in the console
		;(globalThis as any).__FavouriteAnything = {
			status: () =>
				JSON.stringify({
					patches: patchState,
					stats,
					cached: renewed.size,
					queued: queue.size,
					coolingDown: cooldown.size,
				}),
		}
	},
})
