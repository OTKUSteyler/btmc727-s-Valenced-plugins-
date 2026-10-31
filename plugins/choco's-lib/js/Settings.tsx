import { getJsonStorage, pluginStoragePathFor } from '@valenced/json-storage'
import { useEffect, useMemo, useState } from 'react'
import {
	ActivityIndicator,
	Image,
	Linking,
	Pressable,
	ScrollView,
	Switch,
	Text,
	useColorScheme,
	View,
} from 'react-native'
import { AUTHOR, LIB_DESCRIPTION, LIB_NAME, PLUGINS_USING_LIB } from './config'

// ---------------------------------------------------------------------------------------------
// Settings storage
// ---------------------------------------------------------------------------------------------

interface LibSettings {
	bannerEnabled: boolean
	avatarEnabled: boolean
}

const DEFAULT_SETTINGS: LibSettings = { bannerEnabled: true, avatarEnabled: true }
const PLUGIN_ID = 'com.otkusteyler.lib'

let storage: ReturnType<typeof getJsonStorage<Partial<LibSettings>>> | undefined

/** Created lazily so the storage path is only resolved once the plugin runs. */
function getSettingsStorage() {
	return (storage ??= getJsonStorage<Partial<LibSettings>>(
		pluginStoragePathFor(PLUGIN_ID, 'settings.json'),
		{ default: {} },
	))
}

// ---------------------------------------------------------------------------------------------
// USRBG / UserPFP lookups (the same databases Nitro-Profiles uses)
// ---------------------------------------------------------------------------------------------

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
		const response = await fetch(url, { cache: 'no-store' })
		if (!response.ok) return null
		return (await response.json()) as T
	} catch {
		return null
	}
}

/** Returns [url, ok]. ok is false only when the database itself could not be reached. */
async function fetchBanner(id: string): Promise<[string | undefined, boolean]> {
	const data = await getJSON<UserBGData>(BG_URL)
	if (!data?.users) return [undefined, false]
	const entry = id ? data.users[id] : undefined
	if (!entry) return [undefined, true]
	return [`${data.endpoint}/${data.bucket}/${data.prefix}${id}?${entry}`, true]
}

async function fetchAvatar(id: string): Promise<[string | undefined, boolean]> {
	const data = await getJSON<UserPFPData>(PFP_URL)
	if (!data?.avatars) return [undefined, false]
	const avatar = id ? data.avatars[id] : undefined
	if (!avatar) return [undefined, true]
	// Use the static version of animated avatars.
	return [avatar.replace(/\.gif(?=\?|$)/, '.png'), true]
}

// ---------------------------------------------------------------------------------------------
// UI
// ---------------------------------------------------------------------------------------------

/** Shows the first image that loads from `uris`, moving to the next one on a load error. */
function FallbackImage({
	uris,
	style,
	fallback,
	resizeMode,
}: {
	uris: string[]
	style: object
	fallback: React.ReactNode
	resizeMode?: 'cover' | 'contain'
}) {
	const [failed, setFailed] = useState(0)
	const uri = uris[failed]
	if (!uri) return <>{fallback}</>
	return (
		<Image
			source={{ uri }}
			resizeMode={resizeMode}
			onError={() => setFailed(n => n + 1)}
			style={style}
		/>
	)
}

export default function Settings() {
	const scheme = useColorScheme()
	const dark = scheme !== 'light'
	const colors = useMemo(
		() => ({
			background: dark ? '#202127' : '#F2F3F5',
			surface: dark ? '#2B2D35' : '#FFFFFF',
			text: dark ? '#F2F3F5' : '#232428',
			muted: dark ? '#B5BAC1' : '#5C5E66',
			border: dark ? '#41434C' : '#D9DADD',
			button: dark ? '#454852' : '#E2E3E6',
			buttonText: dark ? '#FFFFFF' : '#232428',
		}),
		[dark],
	)

	const [settings, setSettings] = useState<LibSettings>(DEFAULT_SETTINGS)
	const [dbBanner, setDbBanner] = useState<string>()
	const [dbAvatar, setDbAvatar] = useState<string>()
	const [busy, setBusy] = useState<'bg' | 'pfp' | null>(null)
	const [status, setStatus] = useState('')
	// Bumped on every reload so the images are tried again from the top.
	const [bgVersion, setBgVersion] = useState(0)
	const [pfpVersion, setPfpVersion] = useState(0)

	useEffect(() => {
		let alive = true
		Promise.resolve(getSettingsStorage().get())
			.then(value => alive && setSettings({ ...DEFAULT_SETTINGS, ...value }))
			.catch(() => {})
		fetchBanner(AUTHOR.discordId).then(([url]) => alive && setDbBanner(url))
		fetchAvatar(AUTHOR.discordId).then(([url]) => alive && setDbAvatar(url))
		return () => {
			alive = false
		}
	}, [])

	async function update(patch: Partial<LibSettings>) {
		const next = { ...settings, ...patch }
		setSettings(next)
		try {
			await getSettingsStorage().set(next)
		} catch {
			setStatus('Could not save settings')
		}
	}

	async function reload(which: 'bg' | 'pfp') {
		setBusy(which)
		setStatus('')
		const label = which === 'bg' ? 'Banner collection' : 'Avatar collection'
		try {
			const [url, ok] =
				which === 'bg'
					? await fetchBanner(AUTHOR.discordId)
					: await fetchAvatar(AUTHOR.discordId)
			if (which === 'bg') {
				setDbBanner(url)
				setBgVersion(v => v + 1)
			} else {
				setDbAvatar(url)
				setPfpVersion(v => v + 1)
			}
			setStatus(
				ok
					? `${label}: reloaded`
					: `${label}: reload failed, using the backup image if you set one`,
			)
		} finally {
			setBusy(null)
		}
	}

	// Order: community image first (when enabled), then the backup from config.ts.
	const bannerUris = [settings.bannerEnabled ? dbBanner : undefined, AUTHOR.bannerUrl].filter(
		(u): u is string => !!u,
	)
	const avatarUris = [settings.avatarEnabled ? dbAvatar : undefined, AUTHOR.avatarUrl].filter(
		(u): u is string => !!u,
	)

	const sectionStyle = {
		backgroundColor: colors.surface,
		borderColor: colors.border,
		borderWidth: 1,
		borderRadius: 14,
		padding: 16,
		gap: 12,
	} as const
	const headingStyle = { color: colors.text, fontSize: 17, fontWeight: '700' as const }
	const bodyStyle = { color: colors.muted, fontSize: 14, lineHeight: 20 }
	const buttonStyle = {
		backgroundColor: colors.button,
		borderRadius: 10,
		paddingVertical: 13,
		paddingHorizontal: 14,
		alignItems: 'center' as const,
	}
	const linkStyle = { color: '#5B9BFF', fontSize: 14, fontWeight: '600' as const }
	const avatarBox = {
		width: 92,
		height: 92,
		borderRadius: 22,
		borderWidth: 2,
		borderColor: colors.border,
		backgroundColor: colors.border,
	} as const

	const links = [
		{ label: 'Sponsor', url: AUTHOR.sponsorUrl },
		{ label: 'GitHub', url: AUTHOR.githubUrl },
		{ label: 'Website', url: AUTHOR.websiteUrl },
	].filter(l => !!l.url)

	return (
		<ScrollView
			style={{ flex: 1, backgroundColor: colors.background }}
			contentContainerStyle={{ padding: 16, gap: 14 }}
		>
			<View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
				<FallbackImage
					key={`avatar-${pfpVersion}-${avatarUris.join('|')}`}
					uris={avatarUris}
					style={avatarBox}
					fallback={
						<View style={[avatarBox, { alignItems: 'center', justifyContent: 'center' }]}>
							<Text style={{ color: colors.text, fontSize: 32, fontWeight: '700' }}>
								{AUTHOR.name.charAt(0).toUpperCase()}
							</Text>
						</View>
					}
				/>
				<View style={{ flex: 1, gap: 6 }}>
					<Text style={{ color: colors.text, fontSize: 24, fontWeight: '800' }}>{LIB_NAME}</Text>
					<Text style={bodyStyle}>{LIB_DESCRIPTION}</Text>
				</View>
			</View>

			{links.length > 0 && (
				<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
					{links.map(link => (
						<Pressable
							key={link.label}
							onPress={() => void Linking.openURL(link.url)}
							style={({ pressed }) => [
								buttonStyle,
								{ opacity: pressed ? 0.75 : 1, paddingVertical: 10, paddingHorizontal: 18 },
							]}
						>
							<Text style={{ color: colors.buttonText, fontSize: 15, fontWeight: '600' }}>
								{link.label}
							</Text>
						</Pressable>
					))}
				</View>
			)}

			<View style={sectionStyle}>
				<Text style={headingStyle}>Banner</Text>
				<FallbackImage
					key={`banner-${bgVersion}-${bannerUris.join('|')}`}
					uris={bannerUris}
					resizeMode="cover"
					style={{ width: '100%', height: 120, borderRadius: 10, backgroundColor: colors.border }}
					fallback={
						<View
							style={{
								width: '100%',
								height: 120,
								borderRadius: 10,
								backgroundColor: colors.border,
								alignItems: 'center',
								justifyContent: 'center',
								paddingHorizontal: 12,
							}}
						>
							<Text style={{ color: colors.muted, fontSize: 14, textAlign: 'center' }}>
								{settings.bannerEnabled
									? AUTHOR.discordId
										? 'No USRBG banner found, and no backup banner set'
										: 'Set your Discord ID in config.ts to load your USRBG banner'
									: 'Community banners are turned off'}
							</Text>
						</View>
					}
				/>
				<View
					style={{
						flexDirection: 'row',
						alignItems: 'center',
						justifyContent: 'space-between',
						gap: 12,
					}}
				>
					<View style={{ flex: 1, gap: 3 }}>
						<Text style={{ color: colors.text, fontSize: 15 }}>Community profile banner</Text>
						<Text style={bodyStyle}>
							Use the USRBG banner. Falls back to the backup banner if it is down.
						</Text>
					</View>
					<Switch
						value={settings.bannerEnabled}
						onValueChange={value => void update({ bannerEnabled: value })}
					/>
				</View>
				<Pressable
					onPress={() => void Linking.openURL('https://discord.gg/ECg96KZ3Fh')}
					style={{ paddingVertical: 4 }}
				>
					<Text style={linkStyle}>Join the Nitro Banner community (USRBG)</Text>
				</Pressable>
				<Pressable
					onPress={() => void reload('bg')}
					disabled={busy !== null}
					style={({ pressed }) => [
						buttonStyle,
						{ opacity: busy !== null ? 0.55 : pressed ? 0.75 : 1 },
					]}
				>
					<Text style={{ color: colors.buttonText, fontSize: 15, fontWeight: '600' }}>
						{busy === 'bg' ? 'Reloading…' : 'Reload banner collection'}
					</Text>
				</Pressable>
			</View>

			<View style={sectionStyle}>
				<Text style={headingStyle}>Avatar</Text>
				<View
					style={{
						flexDirection: 'row',
						alignItems: 'center',
						justifyContent: 'space-between',
						gap: 12,
					}}
				>
					<View style={{ flex: 1, gap: 3 }}>
						<Text style={{ color: colors.text, fontSize: 15 }}>Community profile avatar</Text>
						<Text style={bodyStyle}>
							Use the UserPFP avatar. Falls back to the backup avatar if it is down.
						</Text>
					</View>
					<Switch
						value={settings.avatarEnabled}
						onValueChange={value => void update({ avatarEnabled: value })}
					/>
				</View>
				<Pressable
					onPress={() => void Linking.openURL('https://discord.gg/userpfp-1129784704267210844')}
					style={{ paddingVertical: 4 }}
				>
					<Text style={linkStyle}>Join the Nitro Avatar community (UserPFP)</Text>
				</Pressable>
				<Pressable
					onPress={() => void reload('pfp')}
					disabled={busy !== null}
					style={({ pressed }) => [
						buttonStyle,
						{ opacity: busy !== null ? 0.55 : pressed ? 0.75 : 1 },
					]}
				>
					<Text style={{ color: colors.buttonText, fontSize: 15, fontWeight: '600' }}>
						{busy === 'pfp' ? 'Reloading…' : 'Reload avatar collection'}
					</Text>
				</Pressable>
			</View>

			<View style={sectionStyle}>
				<Text style={headingStyle}>Plugins using this library</Text>
				{PLUGINS_USING_LIB.map(plugin => (
					<Pressable
						key={plugin.name}
						onPress={() => void Linking.openURL(plugin.url)}
						style={({ pressed }) => ({
							flexDirection: 'row',
							alignItems: 'center',
							gap: 12,
							opacity: pressed ? 0.7 : 1,
						})}
					>
						<View style={{ flex: 1, gap: 2 }}>
							<Text style={{ color: '#5B9BFF', fontSize: 15, fontWeight: '600' }}>{plugin.name}</Text>
							<Text style={bodyStyle}>{plugin.description}</Text>
						</View>
						<Text style={{ color: colors.muted, fontSize: 22 }}>›</Text>
					</Pressable>
				))}
			</View>

			{busy !== null && <ActivityIndicator color={colors.text} />}
			{!!status && (
				<Text accessibilityLiveRegion="polite" style={{ color: colors.muted, fontSize: 14 }}>
					{status}
				</Text>
			)}
		</ScrollView>
	)
												 }
