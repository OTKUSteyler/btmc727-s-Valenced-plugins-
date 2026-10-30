import Settings from './Settings'

// The lib has no features of its own. The other plugins in this repository declare it as a
// required dependency, so installing any of them installs this one too, and it always loads
// and starts before them. Its settings screen lists the plugins that use it.
export default plugin({
	SettingsComponent: Settings,
	start() {},
})
