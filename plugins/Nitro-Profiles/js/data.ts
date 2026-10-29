import type { UserBGData, UserPFPData } from './types'

const BG_URL = 'https://usrbg.is-hardly.online/users'
const PFP_URL = 'https://raw.githubusercontent.com/UserPFP/UserPFP/main/source/data.json'

let bgData: UserBGData | null = null
let pfpData: UserPFPData | null = null
let lastError = ''

export function getBGData(): UserBGData | null {
	return bgData
}

export function clearData(): void {
	bgData = null
	pfpData = null
}

function urlExt(url: string): string {
	return url.split('.').pop()?.split('?')[0] ?? ''
}

/** UserPFP avatar URL for a user id, if the collection has one. */
export function getCustomAvatar(id: string, isStatic?: boolean): string | undefined {
	const avatar = pfpData?.avatars[id]
	if (!avatar) return undefined
	if (isStatic && urlExt(avatar) === 'gif') return avatar.replace(/\.gif(?=\?|$)/, '.png')
	return avatar
}

/** Reason the most recent reload failed (empty if it succeeded). */
export function getLastError(): string {
	return lastError
}

function describe(error: unknown): string {
	return error instanceof Error ? error.message : String(error)
}

export async function fetchBG(): Promise<boolean> {
	try {
		const response = await fetch(BG_URL, { cache: 'no-store' })
		if (!response.ok) throw new Error(`HTTP ${response.status}`)
		const data: unknown = await response.json()
		if (!data || typeof data !== 'object' || !('users' in data) || !data.users || typeof data.users !== 'object') {
			throw new Error('Unexpected database format: missing users map')
		}
		bgData = data as UserBGData
		lastError = ''
		return true
	} catch (error) {
		lastError = describe(error)
		console.error('[Nitro Profiles] UserBG database reload failed:', error)
		return false
	}
}

export async function fetchPFP(): Promise<boolean> {
	try {
		const response = await fetch(PFP_URL, { cache: 'no-store' })
		if (!response.ok) throw new Error(`HTTP ${response.status}`)
		const data: unknown = await response.json()
		if (!data || typeof data !== 'object' || !('avatars' in data) ||
			!data.avatars || typeof data.avatars !== 'object' || Array.isArray(data.avatars)) {
			throw new Error('Unexpected database format: missing avatars map')
		}
		pfpData = data as UserPFPData
		lastError = ''
		return true
	} catch (error) {
		lastError = describe(error)
		console.error('[Nitro Profiles] UserPFP database reload failed:', error)
		return false
	}
  }
