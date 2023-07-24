import {Bot} from "./bot";

export class Context {

    args?: {
        [key: string]: string
    }

    user: {
        name?: string,
        id: string
    }

    channel?: {
        id: string
    }

    rawContent: string

    bot: Bot
}
