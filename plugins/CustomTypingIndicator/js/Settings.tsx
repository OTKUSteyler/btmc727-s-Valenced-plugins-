import { useState } from 'react'
import { Image, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native'
import { ANIMATIONS, MAX_EMOJIS, MAX_TEXT, exportConfig, sanitize, surprise } from './data'
import TypingStrip from './components/TypingStrip'
import { hasRealNitroTyping, runtime } from './state'
import type { TypingEntry } from './data'
import type { ApiOptions } from './state'
import type { PluginSettingsComponent } from '@valenced/plugins/types'
import type { ComponentProps } from 'react'

// ⚠️ ASSUMPTION: I'm guessing how your settings component receives the plugin api.
// Match this to your Fake Nitro settings.tsx (props shape + UI kit) and I'll adapt it.
export type TypingSettingsProps = ComponentProps<PluginSettingsComponent<ApiOptions>>

const DEFAULT_MINE: TypingEntry = { emojis: [], animation: 'wave', text: 'is typing...' }

// TODO: swap for the clipboard helper your other plugins use.
async function copy(text: string) {
	await (globalThis as any).navigator?.clipboard?.writeText?.(text)
}

export function SettingsComponent(props: TypingSettingsProps) {
	const api = (props as any).api ?? runtime.api
	const storage = api.jsonStorage
	const cfg: ApiOptions['jsonStorage'] = storage.cache
	const [, force] = useState(0)

	const save = async (patch: Partial<ApiOptions['jsonStorage']>) => {
		await storage.set({ ...storage.cache, ...patch })
		force(n => n + 1)
	}
	const setMine = (mine: TypingEntry) => save({ mine: sanitize(mine) ?? { ...DEFAULT_MINE, text: '' } })

	const nitro = hasRealNitroTyping()
	const mine = cfg.mine

	return (
		<ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
			<View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
				<Text style={{ color: 'white', fontSize: 16 }}>Enable custom typing indicators</Text>
				<Switch value={cfg.enabled} onValueChange={enabled => save({ enabled })} />
			</View>

			{nitro && (
				<Text style={{ color: '#b9bbbe' }}>
					You have Nitro, so Discord's own typing indicator setting is used for you. This
					plugin only shows other plugin users' indicators.
				</Text>
			)}

			{/* Preview, same layout as the native screen */}
			<View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
				<TypingStrip entry={mine} />
				<Text style={{ color: '#b9bbbe' }}>{mine.text || 'is typing...'}</Text>
			</View>

			<Text style={{ color: 'white', fontSize: 18 }}>Emojis</Text>
			<View style={{ flexDirection: 'row', gap: 8 }}>
				{Array.from({ length: MAX_EMOJIS }, (_, i) => (
					<View
						key={i}
						style={{ flex: 1, borderWidth: 1, borderColor: '#3a3a4a', padding: 8, gap: 6 }}
					>
						{mine.emojis[i] ? (
							<Image source={{ uri: mine.emojis[i] }} style={{ width: 36, height: 36, alignSelf: 'center' }} />
						) : null}
						<TextInput
							placeholder="https://…"
							placeholderTextColor="#777"
							autoCapitalize="none"
							defaultValue={mine.emojis[i] ?? ''}
							style={{ color: 'white', fontSize: 11 }}
							onEndEditing={e => {
								const next = [...mine.emojis]
								const url = e.nativeEvent.text.trim()
								if (url) next[i] = url
								else next.splice(i, 1)
								setMine({ ...mine, emojis: next.filter(Boolean) })
							}}
						/>
					</View>
				))}
			</View>

			<Text style={{ color: 'white', fontSize: 18 }}>Animation</Text>
			<View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
				{ANIMATIONS.map(a => (
					<Pressable
						key={a}
						onPress={() => setMine({ ...mine, animation: a })}
						style={{
							padding: 10,
							borderWidth: 1,
							borderColor: mine.animation === a ? '#9b7bd8' : '#3a3a4a',
						}}
					>
						<Text style={{ color: 'white', textTransform: 'capitalize' }}>{a}</Text>
					</Pressable>
				))}
			</View>

			<Text style={{ color: 'white', fontSize: 18 }}>Text</Text>
			<TextInput
				maxLength={MAX_TEXT}
				defaultValue={mine.text}
				placeholder="is typing..."
				placeholderTextColor="#777"
				style={{ color: 'white', borderWidth: 1, borderColor: '#3a3a4a', padding: 10 }}
				onEndEditing={e => setMine({ ...mine, text: e.nativeEvent.text })}
			/>

			<Pressable
				onPress={() => setMine(surprise(cfg.emojiPool.length ? cfg.emojiPool : mine.emojis))}
				style={{ padding: 14, borderWidth: 1, borderColor: '#3a3a4a', alignItems: 'center' }}
			>
				<Text style={{ color: 'white' }}>🎲 Surprise Me</Text>
			</Pressable>

			<Pressable
				onPress={() => setMine({ ...DEFAULT_MINE })}
				style={{ padding: 14, borderWidth: 1, borderColor: '#3a3a4a', alignItems: 'center' }}
			>
				<Text style={{ color: 'white' }}>⃠ Reset</Text>
			</Pressable>

			<Pressable
				onPress={() =>
					runtime.currentUserId && copy(exportConfig(runtime.currentUserId, mine))
				}
				style={{ padding: 14, borderWidth: 1, borderColor: '#9b7bd8', alignItems: 'center' }}
			>
				<Text style={{ color: 'white' }}>Copy my config (to share with plugin users)</Text>
			</Pressable>
			<Text style={{ color: '#b9bbbe', fontSize: 12 }}>
				Other plugin users only see your indicator once your config is added to the registry.
			</Text>
		</ScrollView>
	)
}
