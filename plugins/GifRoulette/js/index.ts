import { lookupModule } from '@valenced/modules/finders'
import { withProps } from '@valenced/modules/finders/filters'
import { after } from '@valenced/patcher'

const NO_GIFS =
    "❌ You don't have any favorite GIFs! Add some by favoriting GIFs in Discord first."

function find<T>(...props: string[]): T | undefined {
    const [exports, id] = lookupModule(withProps<T>(...props))
    return id !== undefined ? exports : undefined
}

function getMessage(): string {
    const settings = find<any>('FrecencyUserSettingsActionCreators')
    const frecencyStore =
        settings?.FrecencyUserSettingsActionCreators?.getCurrentValue?.()

    const gifs = frecencyStore?.favoriteGifs?.gifs
    if (!gifs) return NO_GIFS

    const urls = Object.keys(gifs)
    if (urls.length === 0) return NO_GIFS

    return urls[Math.floor(Math.random() * urls.length)]
}

export default plugin({
    start({ cleanup, logger }) {
        const messageUtil = find<any>('sendMessage', 'editMessage')
        const commandsModule = find<any>('getBuiltInCommands')

        if (!messageUtil || !commandsModule) {
            logger.error('GIF Roulette: could not find Discord message/command modules')
            return
        }

        const command = {
            id: 'gifroulette',
            name: 'gifroulette',
            displayName: 'GIF Roulette',
            description: 'Sends a random GIF from your favorites',
            displayDescription: 'Sends a random GIF from your favorites',
            untranslatedName: 'gifroulette',
            untranslatedDescription: 'Sends a random GIF from your favorites',
            options: [],
            execute: async (_args: unknown, ctx: { channel: { id: string } }) => {
                messageUtil.sendMessage(
                    ctx.channel.id,
                    { content: getMessage() },
                    void 0,
                    { nonce: Date.now().toString() },
                )
            },
            applicationId: '-1',
            inputType: 1,
            type: 1,
        }


        // built-in command list instead. The patch is removed when the plugin stops.
        cleanup(
            after(commandsModule, 'getBuiltInCommands', (_args, ret) =>
                Array.isArray(ret) ? [...ret, command] : ret,
            ),
        )
    },
})
