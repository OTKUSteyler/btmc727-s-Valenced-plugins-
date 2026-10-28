import { getModules } from '@valenced/modules/finders'
import { withProps } from '@valenced/modules/finders/filters'
import { instead } from '@valenced/patcher'

export default plugin({
	start({ cleanup }) {
		cleanup(
			getModules(withProps('getTypingUsers'), TypingStore => {
				cleanup(
					instead(TypingStore as any, 'getTypingUsers', () => ({})),
				)
			}),
		)
	},
})
