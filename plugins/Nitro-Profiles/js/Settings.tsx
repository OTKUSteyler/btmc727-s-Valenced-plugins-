import React, { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Switch,
  Text,
  View,
  Pressable,
  useColorScheme,
} from 'react-native'
import { getSettingsStorage } from './storage'
import type { PluginSettings } from './types'
import { DEFAULT_SETTINGS } from './types'

interface Props {
  onReloadBG: () => Promise<boolean>
  onReloadPFP: () => Promise<boolean>
}

function resolveCurrentAvatar(): string | undefined {
  try {
    const { finders } = (globalThis as any).revenge.modules
    const userModule = finders.lookupModule(finders.filters.withProps('getCurrentUser'))
    const currentUser =
      userModule?.getCurrentUser?.() ??
      Object.values(userModule ?? {}).find(
        (store: any) => typeof store?.getCurrentUser === 'function',
      )?.getCurrentUser()

    if (!currentUser?.id) return undefined
    return currentUser.avatar
      ? `https://cdn.discordapp.com/avatars/${currentUser.id}/${currentUser.avatar}.${currentUser.avatar.startsWith('a_') ? 'gif' : 'png'}?size=128`
      : `https://cdn.discordapp.com/embed/avatars/${Number((BigInt(currentUser.id) >> 22n) % 6n)}.png`
  } catch {
    return undefined
  }
}

export default function Settings({ onReloadBG, onReloadPFP }: Props) {
  const scheme = useColorScheme()
  const dark = scheme !== 'light'
  const colors = useMemo(() => ({
    background: dark ? '#202127' : '#F2F3F5',
    surface: dark ? '#2B2D35' : '#FFFFFF',
    text: dark ? '#F2F3F5' : '#232428',
    muted: dark ? '#B5BAC1' : '#5C5E66',
    border: dark ? '#41434C' : '#D9DADD',
    button: dark ? '#454852' : '#E2E3E6',
    buttonText: dark ? '#FFFFFF' : '#232428',
  }), [dark])

  const [settings, setSettings] = useState<PluginSettings>(DEFAULT_SETTINGS)
  const [busy, setBusy] = useState<'bg' | 'pfp' | null>(null)
  const [status, setStatus] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string>()

  useEffect(() => {
    let alive = true
    getSettingsStorage().get().then(value => {
      if (alive) setSettings({ ...DEFAULT_SETTINGS, ...value })
    }).catch(() => {})
    setAvatarUrl(resolveCurrentAvatar())
    return () => { alive = false }
  }, [])

  async function update(patch: Partial<PluginSettings>) {
    const next = { ...settings, ...patch }
    setSettings(next)
    try {
      await getSettingsStorage().set(patch)
    } catch {
      setStatus('Could not save settings')
    }
  }

  async function reload(which: 'bg' | 'pfp') {
    setBusy(which)
    setStatus('')
    try {
      const ok = which === 'bg' ? await onReloadBG() : await onReloadPFP()
      setStatus(`${which === 'bg' ? 'Banner collection' : 'Avatar collection'}: ${ok ? 'reloaded' : 'reload failed'}`)
    } catch {
      setStatus(`${which === 'bg' ? 'Banner collection' : 'Avatar collection'}: reload failed`)
    } finally {
      setBusy(null)
    }
  }

  const sectionStyle = { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 16, gap: 12 } as const
  const headingStyle = { color: colors.text, fontSize: 17, fontWeight: '700' as const }
  const bodyStyle = { color: colors.muted, fontSize: 14, lineHeight: 20 }
  const buttonStyle = { backgroundColor: colors.button, borderRadius: 10, paddingVertical: 13, paddingHorizontal: 14, alignItems: 'center' as const }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, gap: 14 }}>
      <View style={{ gap: 6 }}>
        <Text style={{ color: colors.text, fontSize: 24, fontWeight: '800' }}>Nitro Profiles</Text>
        <Text style={bodyStyle}>Personalize profiles with community banner and avatar collections.</Text>
      </View>

      <View style={sectionStyle}>
        <Text style={headingStyle}>Nitro Banner</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={{ color: colors.text, fontSize: 15 }}>Community profile banners</Text>
            <Text style={bodyStyle}>Enable custom banners from the community collection.</Text>
          </View>
          <Switch value={settings.userbgEnabled} onValueChange={value => void update({ userbgEnabled: value })} />
        </View>
        <Pressable onPress={() => void reload('bg')} disabled={busy !== null} style={({ pressed }) => [buttonStyle, { opacity: busy !== null ? 0.55 : pressed ? 0.75 : 1 }]}>
          <Text style={{ color: colors.buttonText, fontSize: 15, fontWeight: '600' }}>{busy === 'bg' ? 'Reloading…' : 'Reload banner collection'}</Text>
        </Pressable>
      </View>

      <View style={sectionStyle}>
        <Text style={headingStyle}>Nitro Avatar</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {avatarUrl ? <Image source={{ uri: avatarUrl }} style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.border }} /> : <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.text, fontSize: 18 }}>?</Text></View>}
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>Your current Discord avatar</Text>
            <Text style={bodyStyle}>Preview of the avatar used by your account.</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={{ color: colors.text, fontSize: 15 }}>Community profile avatars</Text>
            <Text style={bodyStyle}>Enable custom avatars from the community collection. Restart Discord if changes don't appear.</Text>
          </View>
          <Switch value={settings.userpfpEnabled} onValueChange={value => void update({ userpfpEnabled: value })} />
        </View>
        <Pressable onPress={() => void reload('pfp')} disabled={busy !== null} style={({ pressed }) => [buttonStyle, { opacity: busy !== null ? 0.55 : pressed ? 0.75 : 1 }]}>
          <Text style={{ color: colors.buttonText, fontSize: 15, fontWeight: '600' }}>{busy === 'pfp' ? 'Reloading…' : 'Reload avatar collection'}</Text>
        </Pressable>
      </View>

      {busy !== null && <ActivityIndicator color={colors.text} />}
      {!!status && <Text accessibilityLiveRegion="polite" style={{ color: colors.muted, fontSize: 14 }}>{status}</Text>}
    </ScrollView>
  )
      }
