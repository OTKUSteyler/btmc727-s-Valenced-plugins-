import React, { useMemo } from 'react'
import { ScrollView, Text, View, useColorScheme } from 'react-native'

export default function Settings() {
  const scheme = useColorScheme()
  const dark = scheme !== 'light'
  const colors = useMemo(() => ({
    background: dark ? '#202127' : '#F2F3F5',
    surface: dark ? '#2B2D35' : '#FFFFFF',
    text: dark ? '#F2F3F5' : '#232428',
    muted: dark ? '#B5BAC1' : '#5C5E66',
    border: dark ? '#41434C' : '#D9DADD',
  }), [dark])

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, gap: 14 }}>
      <View style={{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 16, gap: 8 }}>
        <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700' }}>FavouriteAnything</Text>
        <Text style={{ color: colors.text, fontSize: 15, lineHeight: 21 }}>
          Adds the favourite button to ALL media in the image viewer, not just GIFs!
        </Text>
        <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 20, marginTop: 8 }}>
          Images and videos can now be saved to your GIF favourites picker. Works by patching Discord's GIFFavButton to accept all media types.
        </Text>
      </View>
    </ScrollView>
  )
}
