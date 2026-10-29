import React, { useEffect, useState } from 'react'
import { ScrollView, View, Text, Switch, Pressable, ActivityIndicator } from 'react-native'
import { getSettingsStorage } from './storage'
import type { PluginSettings } from './types'
import { DEFAULT_SETTINGS } from './types'

interface Props {
	onReloadBG: () => Promise<boolean>
	onReloadPFP: () => Promise<boolean>
}

export default function Settings({ onReloadBG, onReloadPFP }: Props) {
	const [settings, setSettings] = useState<PluginSettings>(DEFAULT_SETTINGS)
	const [busy, setBusy] = useState<'bg' | 'pfp' | null>(null)
	const [status, setStatus] = useState('')

	useEffect(() => {
		let alive = true
		getSettingsStorage().get().then(value => {
			if (alive) setSettings({ ...DEFAULT_SETTINGS, ...value })
		})
		return () => { alive = false }
	}, [])

	async function update(patch: Partial<PluginSettings>) {
		const next = { ...settings, ...patch }
		setSettings(next)
		await getSettingsStorage().set(patch)
	}

	async function reload(which: 'bg' | 'pfp') {
		setBusy(which)
		setStatus('')
		try {
			const ok = which === 'bg' ? await onReloadBG() : await onReloadPFP()
			setStatus(`${which === 'bg' ? 'UserBG' : 'UserPFP'}: ${ok ? 'database reloaded' : 'reload failed'}`)
		} catch {
			setStatus(`${which === 'bg' ? 'UserBG' : 'UserPFP'}: reload failed`)
		} finally {
			setBusy(null)
		}
	}

	return (
		<ScrollView contentContainerStyle={{ padding: 16, gap: 18 }}>
			<Text style={{ fontSize: 20, fontWeight: '700' }}>UserBG + UserPFP</Text>
			<Text style={{ opacity: 0.75 }}>
				Custom banners from USRBG and custom avatars from UserPFP. UserPFP changes may require a Discord reload.
			</Text>

			<View style={{ gap: 8 }}>
				<Text style={{ fontSize: 16, fontWeight: '600' }}>UserBG</Text>
				<Switch
					value={settings.userbgEnabled}
					onValueChange={value => void update({ userbgEnabled: value })}
				/>
				<Text>Enable custom profile banners</Text>
				<Pressable onPress={() => void reload('bg')} disabled={busy !== null}
					style={{ padding: 12, borderRadius: 8, backgroundColor: '#555' }}>
					<Text style={{ color: 'white' }}>{busy === 'bg' ? 'Reloading…' : 'Reload UserBG database'}</Text>
				</Pressable>
			</View>

			<View style={{ gap: 8 }}>
				<Text style={{ fontSize: 16, fontWeight: '600' }}>UserPFP</Text>
				<Switch
					value={settings.userpfpEnabled}
					onValueChange={value => void update({ userpfpEnabled: value })}
				/>
				<Text>Enable custom profile avatars</Text>
				<Pressable onPress={() => void reload('pfp')} disabled={busy !== null}
					style={{ padding: 12, borderRadius: 8, backgroundColor: '#555' }}>
					<Text style={{ color: 'white' }}>{busy === 'pfp' ? 'Reloading…' : 'Reload UserPFP database'}</Text>
				</Pressable>
			</View>

			{busy !== null && <ActivityIndicator />}
			{status !== '' && <Text>{status}</Text>}
		</ScrollView>
	)
}
