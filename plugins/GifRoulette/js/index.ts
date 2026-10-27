const NO_GIFS =
    "❌ You don't have any favorite GIFs! Add some by favoriting GIFs in Discord first.";

type AnyRecord = Record<string, any>;

const runtime = (globalThis as AnyRecord) ?? {};

function findByProps(...props: string[]) {
    const seen = new Set<object>();
    const visit = (value: unknown): unknown => {
        if (!value || typeof value !== "object") return undefined;
        if (seen.has(value as object)) return undefined;
        seen.add(value as object);

        if (props.every((prop) => (value as AnyRecord)[prop] !== undefined)) {
            return value;
        }

        for (const child of Object.values(value as AnyRecord)) {
            const found = visit(child);
            if (found) return found;
        }

        return undefined;
    };

    return visit(runtime) ?? visit((runtime as AnyRecord).valenced) ?? visit((runtime as AnyRecord).Discord);
}

function registerCommand(command: AnyRecord) {
    const api =
        typeof (runtime as AnyRecord).registerCommand === "function"
            ? (runtime as AnyRecord).registerCommand
            : (runtime as AnyRecord).valenced?.registerCommand;

    if (typeof api === "function") return api(command);
    return () => undefined;
}

const messageUtil =
    findByProps("sendMessage", "editMessage") ?? {
        sendMessage: () => undefined,
    };

const UserSettingsActionCreators = findByProps("FrecencyUserSettingsActionCreators");

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
                if (!ctx?.channel?.id || typeof messageUtil.sendMessage !== "function") return;

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
