// Looks up a user's USRBG banner and UserPFP avatar, the same databases Nitro-Profiles uses.
const BG_URL = 'https://usrbg.is-hardly.online/users'
const PFP_URL = 'https://raw.githubusercontent.com/UserPFP/UserPFP/main/source/data.json'

interface UserBGData {
	endpoint: string
	bucket: string
	prefix: string
	users: Record<string, string>
}

interface UserPFPData {
	avatars: Record<string, string>
}

async function getJSON<T>(url: string): Promise<T | null> {
	try {
		const response = await fetch(url)
		if (!response.ok) return null
		return (await response.json()) as T
	} catch {
		return null
	}
}

export async function fetchBanner(id: string): Promise<string | undefined> {
	if (!id) return undefined
	const data = await getJSON<UserBGData>(BG_URL)
	const entry = data?.users?.[id]
	if (!data || !entry) return undefined
	return `${data.endpoint}/${data.bucket}/${data.prefix}${id}?${entry}`
}

export async function fetchAvatar(id: string): Promise<string | undefined> {
	if (!id) return undefined
	const data = await getJSON<UserPFPData>(PFP_URL)
	const avatar = data?.avatars?.[id]
	if (!avatar) return undefined
	// React Native can't always animate GIFs; use the static version.
	return avatar.replace(/\.gif(?=\?|$)/, '.png')
}
