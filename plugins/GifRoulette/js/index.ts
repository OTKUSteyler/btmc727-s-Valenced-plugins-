import { registerCommand } from "@vendetta/commands";
import { findByProps } from "@vendetta/metro";

const NO_GIFS =
    "❌ You don't have any favorite GIFs! Add some by favoriting GIFs in Discord first.";

const messageUtil = findByProps("sendMessage", "editMessage");
const UserSettingsActionCreators = findByProps(
    "FrecencyUserSettingsActionCreators",
);

function getMessage(): string {
    const frecencyStore =
        UserSettingsActionCreators?.FrecencyUserSettingsActionCreators?.getCurrentValue?.();

    const gifs = frecencyStore?.favoriteGifs?.gifs;
    if (!gifs) return NO_GIFS;

    const urls = Object.keys(gifs);
    if (urls.length === 0) return NO_GIFS;

    return urls[Math.floor(Math.random() * urls.length)];
}

let unregisterCommand: (() => void) | undefined;

export default {
    onLoad() {
        unregisterCommand = registerCommand({
            name: "gifroulette",
            displayName: "GIF Roulette",
            description: "Sends a random GIF from your favorites",
            displayDescription: "Sends a random GIF from your favorites",
            options: [],
            execute: async (_args, ctx) => {
                messageUtil.sendMessage(
                    ctx.channel.id,
                    { content: getMessage() },
                    void 0,
                    { nonce: Date.now().toString() },
                );
            },
            applicationId: "-1",
            inputType: 1,
            type: 1,
        });
    },

    onUnload() {
        unregisterCommand?.();
        unregisterCommand = undefined;
    },
};
