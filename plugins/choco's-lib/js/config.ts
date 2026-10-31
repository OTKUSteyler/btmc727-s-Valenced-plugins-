// Edit these to change what the lib's page shows. An empty string hides / skips an item.
export const AUTHOR = {
	// Shown under the description.
	handle: '@btmc727',
	// Your Discord user ID. Used to look up your USRBG banner and UserPFP avatar.
	discordId: '554071670143451176',
	// Backups, used when USRBG / UserPFP are down, have nothing for you, or the image fails to load.
	// Order: USRBG / UserPFP, then these, then the built-in images from assets.ts.
	bannerUrl: '',
	avatarUrl: '',
	sponsorUrl: '',
	githubUrl: '',
	websiteUrl: '',
}

export const LIB_NAME = 'Choco’sLib'
export const LIB_DESCRIPTION =
	'A cozy home for my Valenced plugins, with links and a quick list of projects.'

// Repository the plugins live in. Each plugin below links to its folder here.
const REPO = 'https://github.com/OTKUSteyler/btmc727-s-Valenced-plugins-/tree/main/plugins'

// Plugins in this repository that depend on the lib, shown on the lib's page.
// Update `version` by hand when you release a new version of a plugin.
export const PLUGINS_USING_LIB = [
	{
		name: 'Nitro Profiles',
		description: 'Shows community UserBG banners and UserPFP avatars.',
		version: '1.1.5',
		url: `${REPO}/Nitro-Profiles`,
	},
	{
		name: 'NoTypingAnimation',
		description: 'Disables the CPU-intensive typing dots animation.',
		version: '1.0.1',
		url: `${REPO}/NoTypingAnimation`,
	},
	{
		name: 'GIF Roulette',
		description: 'Sends a random GIF from your favorites.',
		version: '1.0.6',
		url: `${REPO}/GifRoulette`,
	},
	{
		name: 'LoginSound',
		description: 'Plays a custom sound when you log in to Discord.',
		version: '1.0.1',
		url: `${REPO}/login-sound`,
	},
]
