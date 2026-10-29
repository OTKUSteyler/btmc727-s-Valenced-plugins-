import React, { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Switch,
  Text,
  View,
  Pressable,
  Linking,
  useColorScheme,
} from 'react-native'
import { fetchBG, fetchPFP, getCustomAvatar, getCustomBanner, getLastError } from './data'
import { getSettingsStorage } from './storage'
import type { PluginSettings } from './types'
import { DEFAULT_SETTINGS } from './types'

function resolveCurrentUser(): any {
  try {
    const { finders } = (globalThis as any).valenced.modules
    const userModule = finders.lookupModule(finders.filters.withProps("getCurrentUser"))

    return userModule?.getCurrentUser?.() || Object.values(userModule || {}).find((store: any) => typeof store?.getCurrentUser === "function")?.getCurrentUser()
  } catch {
    return undefined
  }
}

function discordAvatarUrl(currentUser: any): string {
  return currentUser?.avatar ? `https://cdn.discordapp.com/avatars/${currentUser.id}/${currentUser.avatar}.png?size=128` : `https://cdn.discordapp.com/embed/avatars/${Number((BigInt(currentUser?.id || "0") >> 22n) % 5n)}.png`
}

export default function Settings() {
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
  const [currentUser, setCurrentUser] = useState<any>()
  const [pfpVersion, setPfpVersion] = useState(0)
  const [bgVersion, setBgVersion] = useState(0)

  useEffect(() => {
    let alive = true
    getSettingsStorage().get().then(value => {
      if (alive) setSettings({ ...DEFAULT_SETTINGS, ...value })
    }).catch(() => {})
    setCurrentUser(resolveCurrentUser())
    return () => { alive = false }
  }, [])

  // Prefer the UserPFP avatar when it's enabled and the user has one; otherwise use the Discord avatar.
  const avatarUrl = useMemo(() => {
    if (!currentUser) return undefined
    const custom = settings.userpfpEnabled && currentUser.id ? getCustomAvatar(currentUser.id, true) : undefined
    return custom ?? discordAvatarUrl(currentUser)
  }, [currentUser, settings.userpfpEnabled, pfpVersion])

  // USRBG banner for the current user, shown as a preview in the Nitro Banner section.
  const bannerUrl = useMemo(() => {
    if (!settings.userbgEnabled || !currentUser?.id) return undefined
    return getCustomBanner(currentUser.id)
  }, [currentUser, settings.userbgEnabled, bgVersion])

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
    const label = which === 'bg' ? 'Banner collection' : 'Avatar collection'
    try {
      const ok = which === 'bg' ? await fetchBG() : await fetchPFP()
      if (which === 'pfp') setPfpVersion(v => v + 1)
      else setBgVersion(v => v + 1)
      setStatus(ok ? `${label}: reloaded` : `${label}: reload failed (${getLastError() || 'unknown error'})`)
    } catch (error) {
      setStatus(`${label}: reload failed (${error instanceof Error ? error.message : String(error)})`)
    } finally {
      setBusy(null)
    }
  }

  const sectionStyle = { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 16, gap: 12 } as const
  const headingStyle = { color: colors.text, fontSize: 17, fontWeight: '700' as const }
  const bodyStyle = { color: colors.muted, fontSize: 14, lineHeight: 20 }
  const buttonStyle = { backgroundColor: colors.button, borderRadius: 10, paddingVertical: 13, paddingHorizontal: 14, alignItems: 'center' as const }
  const linkStyle = { color: '#5B9BFF', fontSize: 14, fontWeight: '600' as const }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        {avatarUrl
          ? <Image source={{ uri: avatarUrl }} style={{ width: 92, height: 92, borderRadius: 22, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.border }} />
          : <View style={{ width: 92, height: 92, borderRadius: 22, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.text, fontSize: 28 }}>?</Text></View>}
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={{ color: colors.text, fontSize: 24, fontWeight: '800' }}>Nitro Profiles</Text>
          <Text style={bodyStyle}>Personalize profiles with community banner and avatar collections.</Text>
        </View>
      </View>

      <View style={sectionStyle}>
        <Text style={headingStyle}>Nitro Banner</Text>
        {bannerUrl
          ? <Image source={{ uri: bannerUrl }} resizeMode="cover" style={{ width: '100%', height: 120, borderRadius: 10, backgroundColor: colors.border }} />
          : <View style={{ width: '100%', height: 120, borderRadius: 10, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 }}>
              <Text style={{ color: colors.muted, fontSize: 14, textAlign: 'center' }}>{settings.userbgEnabled ? 'No USRBG banner found for your account' : 'Custom banners are turned off'}</Text>
            </View>}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={{ color: colors.text, fontSize: 15 }}>Community profile banners</Text>
            <Text style={bodyStyle}>Enable custom banners from the community collection.</Text>
          </View>
          <Switch value={settings.userbgEnabled} onValueChange={value => void update({ userbgEnabled: value })} />
        </View>
        <Pressable onPress={() => void Linking.openURL('https://discord.gg/ECg96KZ3Fh')} style={{ paddingVertical: 4 }}><Text style={linkStyle}>Join the Nitro Banner community (USRBG)</Text></Pressable>
        <Pressable onPress={() => void reload('bg')} disabled={busy !== null} style={({ pressed }) => [buttonStyle, { opacity: busy !== null ? 0.55 : pressed ? 0.75 : 1 }]}>
          <Text style={{ color: colors.buttonText, fontSize: 15, fontWeight: '600' }}>{busy === 'bg' ? 'Reloading…' : 'Reload banner collection'}</Text>
        </Pressable>
      </View>

      <View style={sectionStyle}>
        <Text style={headingStyle}>Nitro Avatar</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={{ color: colors.text, fontSize: 15 }}>Community profile avatars</Text>
            <Text style={bodyStyle}>Enable custom avatars from the community collection. Restart Discord if changes don't appear.</Text>
          </View>
          <Switch value={settings.userpfpEnabled} onValueChange={value => void update({ userpfpEnabled: value })} />
        </View>
        <Pressable onPress={() => void Linking.openURL('https://discord.gg/userpfp-1129784704267210844')} style={{ paddingVertical: 4 }}><Text style={linkStyle}>Join the Nitro Avatar community (UserPFP)</Text></Pressable>
        <Pressable onPress={() => void reload('pfp')} disabled={busy !== null} style={({ pressed }) => [buttonStyle, { opacity: busy !== null ? 0.55 : pressed ? 0.75 : 1 }]}>
          <Text style={{ color: colors.buttonText, fontSize: 15, fontWeight: '600' }}>{busy === 'pfp' ? 'Reloading…' : 'Reload avatar collection'}</Text>
        </Pressable>
      </View>

      {busy !== null && <ActivityIndicator color={colors.text} />}
      {!!status && <Text accessibilityLiveRegion="polite" style={{ color: colors.muted, fontSize: 14 }}>{status}</Text>}
    </ScrollView>
  )
                            }
