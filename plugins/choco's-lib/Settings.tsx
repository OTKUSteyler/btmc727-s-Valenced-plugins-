import React, { useEffect, useState } from 'react'
import { Image, Linking, Pressable, ScrollView, Text, View } from 'react-native'
import { AUTHOR, LIB_DESCRIPTION, LIB_NAME, PLUGINS_USING_LIB } from './config'
import { fetchAvatar, fetchBanner } from './Userdata'

const colors = {
  card: '#33375a', row: '#2c2d33', text: '#ffffff', muted: '#b9bbc9',
  button: '#ffffff', buttonText: '#111111', accent: '#a78bfa',
}

function resolveCurrentUser(): any {
  try {
    const { finders } = (globalThis as any).valenced.modules
    const mod = finders.lookupModule(finders.filters.withProps('getCurrentUser'))
    return mod?.getCurrentUser?.() ||
      Object.values(mod || {}).find((store: any) => typeof store?.getCurrentUser === 'function')?.getCurrentUser()
  } catch { return undefined }
}

function LinkButton({ label, url }: { label: string; url: string }) {
  if (!url) return null
  return (
    <Pressable onPress={() => void Linking.openURL(url).catch(() => {})}
      style={({ pressed }) => ({
        backgroundColor: colors.button, borderRadius: 12, paddingHorizontal: 16,
        paddingVertical: 10, marginRight: 8, marginTop: 8, opacity: pressed ? 0.72 : 1,
      })}>
      <Text style={{ color: colors.buttonText, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  )
}

export default function Settings() {
  const [user, setUser] = useState<any>()
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(AUTHOR.avatarUrl || undefined)
  const [bannerUrl, setBannerUrl] = useState<string | undefined>()

  useEffect(() => {
    let active = true
    const current = resolveCurrentUser()
    setUser(current)
    const id = current?.id
    if (id) {
      Promise.all([fetchAvatar(String(id)), fetchBanner(String(id))]).then(([avatar, banner]) => {
        if (!active) return
        setAvatarUrl(avatar || AUTHOR.avatarUrl || undefined)
        setBannerUrl(banner)
      })
    }
    return () => { active = false }
  }, [])

  const size = 64
  const avatar = avatarUrl ? (
    <Image source={{ uri: avatarUrl }} style={{ width: size, height: size, borderRadius: size / 2 }} />
  ) : (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#5865f2', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.text, fontSize: 28, fontWeight: '700' }}>{(user?.username || AUTHOR.name).charAt(0).toUpperCase()}</Text>
    </View>
  )

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 28 }}>
      <View style={{ backgroundColor: colors.card, borderRadius: 20, padding: 16, overflow: 'hidden' }}>
        {bannerUrl ? <Image source={{ uri: bannerUrl }} resizeMode="cover" style={{ height: 112, width: '100%', borderRadius: 12, marginBottom: 12 }} /> : null}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={{ color: colors.text, fontSize: 24, fontWeight: '800' }}>{LIB_NAME}</Text>
            <Text style={{ color: colors.text, fontSize: 15, marginTop: 6 }}>{LIB_DESCRIPTION}</Text>
            {user?.username ? <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>@{user.username}</Text> : null}
          </View>
          {avatar}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
          <LinkButton label="Sponsor" url={AUTHOR.sponsorUrl} />
          <LinkButton label="GitHub" url={AUTHOR.githubUrl} />
          <LinkButton label="Website" url={AUTHOR.websiteUrl} />
        </View>
      </View>

      <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', marginTop: 24, marginBottom: 8 }}>
        Plugins using this library:
      </Text>

      {PLUGINS_USING_LIB.map(plugin => (
        <Pressable key={plugin.name}
          onPress={() => plugin.url ? void Linking.openURL(plugin.url).catch(() => {}) : undefined}
          style={({ pressed }) => ({ backgroundColor: colors.row, borderRadius: 16, padding: 16, marginBottom: 8, opacity: plugin.url && pressed ? 0.75 : 1 })}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700', flex: 1 }}>{plugin.name}</Text>
            {plugin.version ? <Text style={{ color: colors.accent, fontSize: 12, fontWeight: '700' }}>v{plugin.version}</Text> : null}
          </View>
          <Text style={{ color: colors.muted, fontSize: 14, marginTop: 2 }}>{plugin.description}</Text>
          {plugin.url ? <Text style={{ color: colors.accent, fontSize: 12, fontWeight: '700', marginTop: 8 }}>View plugin ↗</Text> : null}
        </Pressable>
      ))}
    </ScrollView>
  )
}
