import { useEffect, useState } from 'react'
import { Image, Linking, Pressable, ScrollView, Text, View } from 'react-native'
import { FALLBACK_AVATAR, FALLBACK_BANNER } from './assets'
import { AUTHOR, LIB_DESCRIPTION, LIB_NAME, PLUGINS_USING_LIB } from './config'

// ---------------------------------------------------------------------------------------------
// USRBG / UserPFP lookups (the same databases Nitro-Profiles uses)
// ---------------------------------------------------------------------------------------------

const BG_URL = 'https://usrbg.is-hardly.online/users'
const PFP_URL = 'https://raw.githubusercontent.com/UserPFP/UserPFP/main/source/data.json'
const TIMEOUT_MS = 6000

interface UserBGData {
	endpoint: string
	bucket: string
	prefix: string
	users: Record<string, string>
}

interface UserPFPData {
	avatars: Record<string, string>
}

/** Fetches JSON, giving up after a few seconds so a dead database never blocks the page. */
async function getJSON<T>(url: string): Promise<T | null> {
	try {
		const response = await Promise.race([
			fetch(url),
			new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS)),
		])
		if (!response.ok) return null
		return (await response.json()) as T
	} catch {
		return null
	}
}

async function fetchBanner(id: string): Promise<string | undefined> {
	if (!id) return undefined
	const data = await getJSON<UserBGData>(BG_URL)
	const entry = data?.users?.[id]
	if (!data || !entry) return undefined
	return `${data.endpoint}/${data.bucket}/${data.prefix}${id}?${entry}`
}

async function fetchAvatar(id: string): Promise<string | undefined> {
	if (!id) return undefined
	const data = await getJSON<UserPFPData>(PFP_URL)
	const avatar = data?.avatars?.[id]
	if (!avatar) return undefined
	// Use the static version of animated avatars.
	return avatar.replace(/\.gif(?=\?|$)/, '.png')
}

// ---------------------------------------------------------------------------------------------
// UI
// ---------------------------------------------------------------------------------------------

const colors = {
	card: '#33375a',
	row: '#2c2d33',
	text: '#ffffff',
	muted: '#b9bbc9',
	accent: '#9b87f5',
	button: '#ffffff',
	buttonText: '#111111',
}

/** Shows the first image in `uris` that loads, moving to the next one on a load error. */
function FallbackImage({ uris, style }: { uris: string[]; style: object }) {
	const [failed, setFailed] = useState(0)
	const uri = uris[Math.min(failed, uris.length - 1)]
	return (
		<Image
			source={{ uri }}
			resizeMode="cover"
			onError={() => setFailed(n => n + 1)}
			style={style}
		/>
	)
}

export default function Settings() {
	const [dbBanner, setDbBanner] = useState<string>()
	const [dbAvatar, setDbAvatar] = useState<string>()

	useEffect(() => {
		let alive = true
		fetchBanner(AUTHOR.discordId).then(url => alive && setDbBanner(url))
		fetchAvatar(AUTHOR.discordId).then(url => alive && setDbAvatar(url))
		return () => {
			alive = false
		}
	}, [])

	// Order: community image, then your backup from config.ts, then the built-in image.
	const bannerUris = [dbBanner, AUTHOR.bannerUrl, FALLBACK_BANNER].filter((u): u is string => !!u)
	const avatarUris = [dbAvatar, AUTHOR.avatarUrl, FALLBACK_AVATAR].filter((u): u is string => !!u)

	const links = [
		{ label: 'Sponsor', url: AUTHOR.sponsorUrl },
		{ label: 'GitHub', url: AUTHOR.githubUrl },
		{ label: 'Website', url: AUTHOR.websiteUrl },
	].filter(l => !!l.url)

	return (
		<ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
			<View style={{ backgroundColor: colors.card, borderRadius: 24, padding: 16 }}>
				<FallbackImage
					key={`banner-${bannerUris.join('|')}`}
					uris={bannerUris}
					style={{ width: '100%', height: 122, borderRadius: 12, backgroundColor: colors.row }}
				/>

				<View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16 }}>
					<View style={{ flex: 1, paddingRight: 12 }}>
						<Text style={{ color: colors.text, fontSize: 28, fontWeight: '800' }}>{LIB_NAME}</Text>
						<Text style={{ color: colors.text, fontSize: 17, marginTop: 6 }}>{LIB_DESCRIPTION}</Text>
						{!!AUTHOR.handle && (
							<Text style={{ color: colors.muted, fontSize: 15, marginTop: 8 }}>{AUTHOR.handle}</Text>
						)}
					</View>
					<FallbackImage
						key={`avatar-${avatarUris.join('|')}`}
						uris={avatarUris}
						style={{ width: 70, height: 70, borderRadius: 35, backgroundColor: colors.row }}
					/>
				</View>

				{links.length > 0 && (
					<View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
						{links.map(link => (
							<Pressable
								key={link.label}
								onPress={() => void Linking.openURL(link.url)}
								style={({ pressed }) => ({
									backgroundColor: colors.button,
									borderRadius: 14,
									paddingHorizontal: 18,
									paddingVertical: 12,
									marginRight: 8,
									marginTop: 8,
									opacity: pressed ? 0.75 : 1,
								})}
							>
								<Text style={{ color: colors.buttonText, fontSize: 16, fontWeight: '700' }}>
									{link.label}
								</Text>
							</Pressable>
						))}
					</View>
				)}
			</View>

			<Text style={{ color: colors.text, fontSize: 19, fontWeight: '700', marginTop: 24, marginBottom: 10 }}>
				Plugins using this library:
			</Text>

			{PLUGINS_USING_LIB.map(plugin => (
				<View
					key={plugin.name}
					style={{ backgroundColor: colors.row, borderRadius: 20, padding: 16, marginBottom: 10 }}
				>
					<View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
						<Text style={{ color: colors.text, fontSize: 20, fontWeight: '700', flexShrink: 1 }}>
							{plugin.name}
						</Text>
						{!!plugin.version && (
							<Text style={{ color: colors.accent, fontSize: 15, fontWeight: '700' }}>
								v{plugin.version}
							</Text>
						)}
					</View>
					<Text style={{ color: colors.muted, fontSize: 16, marginTop: 4 }}>{plugin.description}</Text>
					<Pressable
						onPress={() => void Linking.openURL(plugin.url)}
						style={({ pressed }) => ({ marginTop: 12, opacity: pressed ? 0.7 : 1 })}
					>
						<Text style={{ color: colors.accent, fontSize: 16, fontWeight: '700' }}>View plugin ↗</Text>
					</Pressable>
				</View>
			))}
		</ScrollView>
	)
}
