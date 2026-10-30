// Library plugin. It holds no features of its own: the other plugins in this repository declare
// it as a required dependency, so installing any of them installs this one too, and it always
// loads and starts before them. Put shared helpers here as the repository grows.
export default plugin({
	start() {},
})
