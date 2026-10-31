import { useEffect, useState } from 'react'
import { Image, ImageBackground, Linking, Pressable, ScrollView, Text, View } from 'react-native'
import { AUTHOR, LIB_DESCRIPTION, LIB_NAME, PLUGINS_USING_LIB } from './config'
import { fetchAvatar, fetchBanner } from './userdata'

const colors = {
	card: '#33375a',
	row: '#2c2d33',
	text: '#ffffff',
	muted: '#b9bbc9',
	button: '#ffffff',
	buttonText: '#111111',
}

function LinkButton({ label, url }: { label: string; url: string }) {
	if (!url) return null
	return (
		<Pressable
			onPress={() => Linking.openURL(url)}
			style={{
				backgroundColor: colors.button,
				borderRadius: 12,
				paddingHorizontal: 16,
				paddingVertical: 10,
				marginRight: 8,
				marginTop: 8,
			}}
		>
			<Text style={{ color: colors.buttonText, fontWeight: '700' }}>{label}</Text>
		</Pressable>
	)
}

function Avatar({ uris }: { uris: string[] }) {
	const size = 64
	const [failed, setFailed] = useState(0)
	const uri = uris[failed]
	if (uri) {
		return (
			<Image
				source={{ uri }}
				onError={() => setFailed(n => n + 1)}
				style={{ width: size, height: size, borderRadius: size / 2 }}
			/>
		)
	}
	return (
		<View
			style={{
				width: size,
				height: size,
				borderRadius: size / 2,
				backgroundColor: '#5865f2',
				alignItems: 'center',
				justifyContent: 'center',
			}}
		>
			<Text style={{ color: colors.text, fontSize: 28, fontWeight: '700' }}>
				{AUTHOR.name.charAt(0).toUpperCase()}
			</Text>
		</View>
	)
}

export default function Settings() {
	const [dbBanner, setDbBanner] = useState<string>()
	const [dbAvatar, setDbAvatar] = useState<string>()
	const [bannerFailed, setBannerFailed] = useState(0)

	// Order: database image first, then the backup from config, then the plain card / initial.
	const banners = [dbBanner, AUTHOR.bannerUrl].filter((u): u is string => !!u)
	const avatars = [dbAvatar, AUTHOR.avatarUrl].filter((u): u is string => !!u)
	const banner = banners[bannerFailed]

	useEffect(() => {
		let cancelled = false
		fetchBanner(AUTHOR.discordId).then(url => !cancelled && setDbBanner(url))
		fetchAvatar(AUTHOR.discordId).then(url => !cancelled && setDbAvatar(url))
		return () => {
			cancelled = true
		}
	}, [])

	return (
		<ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
			<ImageBackground
				source={banner ? { uri: banner } : undefined}
				resizeMode="cover"
				onError={() => setBannerFailed(n => n + 1)}
				imageStyle={{ borderRadius: 20 }}
				style={{
					backgroundColor: colors.card,
					borderRadius: 20,
					overflow: 'hidden',
				}}
			>
			<View
				style={{
					// Darkens the banner so the text stays readable.
					backgroundColor: banner ? 'rgba(20, 22, 40, 0.55)' : 'transparent',
					padding: 16,
					flexDirection: 'row',
				}}
			>
				<View style={{ flex: 1, paddingRight: 12 }}>
					<Text style={{ color: colors.text, fontSize: 24, fontWeight: '800' }}>{LIB_NAME}</Text>
					<Text style={{ color: colors.text, fontSize: 15, marginTop: 6 }}>{LIB_DESCRIPTION}</Text>
					<View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
						<LinkButton label="Sponsor" url={AUTHOR.sponsorUrl} />
						<LinkButton label="GitHub" url={AUTHOR.githubUrl} />
						<LinkButton label="Website" url={AUTHOR.websiteUrl} />
					</View>
				</View>
				<Avatar key={avatars.join('|')} uris={avatars} />
			</View>
			</ImageBackground>

			<Text style={{ color: colors.text, fontSize: 16, marginTop: 24, marginBottom: 8 }}>
				Plugins using this library:
			</Text>

			{PLUGINS_USING_LIB.map(plugin => (
				<View
					key={plugin.name}
					style={{
						backgroundColor: colors.row,
						borderRadius: 16,
						padding: 16,
						marginBottom: 8,
					}}
				>
					<Text style={{ color: colors.text, fontSize: 17, fontWeight: '700' }}>{plugin.name}</Text>
					<Text style={{ color: colors.muted, fontSize: 14, marginTop: 2 }}>
						{plugin.description}
					</Text>
				</View>
			))}
		</ScrollView>
	)
      }
