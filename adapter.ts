import {Bot} from "./bot";

export interface Adapter {

    info: {
        version: string,
        name: string,
        desc: string
    }

    send(content: string | string[], target: { channel?: string, user?: string })

    init?(bot:Bot);
}
