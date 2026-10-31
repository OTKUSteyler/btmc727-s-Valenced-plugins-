// Fill these in to show the matching button / avatar on the lib's page.
// An empty string hides it.
export const AUTHOR = {
	name: 'choccychan',
	// Your Discord user ID. Used to look up your USRBG banner and UserPFP avatar.
	discordId: '',
	// Backups, used when UserPFP / USRBG are down, or have nothing for you, or the image fails
	// to load. Leave empty to fall back to your initial / the plain purple card.
	avatarUrl: '',
	bannerUrl: '',
	sponsorUrl: '',
	githubUrl: '',
	websiteUrl: '',
}

export const LIB_NAME = "choco's lib"
export const LIB_DESCRIPTION =
	'A shared library for Valenced plugins. Provides useful utilities, components and more.'

// Plugins in this repository that depend on the lib. Shown on the lib's page.
export const PLUGINS_USING_LIB = [
	{ name: 'GIF Roulette', description: 'Sends a random GIF from your favorites.' },
	{
		name: 'Nitro-Profiles',
		description: 'Displays custom Discord profile banners from UserBG and custom avatars from UserPFP.',
	},
	{
		name: 'NoTypingAnimation',
		description: 'Disables the CPU-intensive typing dots animation.',
	},
	{ name: 'LoginSound', description: 'Plays a custom sound when you log in to Discord.' },
]
