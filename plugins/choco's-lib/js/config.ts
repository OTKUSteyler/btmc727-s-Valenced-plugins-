export const LIB_NAME = "Choco’sLib"
export const LIB_DESCRIPTION =
  'A cozy home for my Valenced plugins, with links and a quick list of projects.'

export const AUTHOR = {
  name: 'choccychan aka btmc727',
  // Set a direct image URL here only if the automatic Discord profile lookup fails.
  avatarUrl: '',
  githubUrl: 'https://github.com/OTKUSteyler/btmc727-s-Valenced-plugins-',
  sponsorUrl: 'https://github.com/sponsors/OTKUSteyler',
  websiteUrl: 'https://otkusteyler.com',
} as const

export const PLUGINS_USING_LIB: Array<{ name: string; description: string; version?: string; url?: string }> = [
  { name: 'Nitro Profiles', description: 'Shows community UserBG banners and UserPFP avatars.', version: '1.1.3', url: 'https://github.com/OTKUSteyler/btmc727-s-Valenced-plugins-/tree/main/plugins/Nitro-Profiles' },
  { name: 'NoTypingAnimation', description: 'Disables the CPU-intensive typing dots animation.', version: '1.0.6', url: 'https://github.com/OTKUSteyler/btmc727-s-Valenced-plugins-/tree/main/plugins/NoTypingAnimation' },
  { name: 'GIF Roulette', description: 'Sends a random GIF from your favorites.', version: '1.0.5', url: 'https://github.com/OTKUSteyler/btmc727-s-Valenced-plugins-/tree/main/plugins/GifRoulette' },
  { name: 'LoginSound', description: 'Plays a custom sound when you log in to Discord.', version: '1.0.1', url: 'https://github.com/OTKUSteyler/btmc727-s-Valenced-plugins-/tree/main/plugins/login-sound' },
]
