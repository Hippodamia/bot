import {Bot} from "./bot";
import {Adapter} from "./adapter";

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

    type = this.channel ? 'channel' : 'direct'

    rawContent: string
    bot: Bot

    adapter?: Adapter

    reply(...content: string[]) {
        let text = content.join(' ')
        this.adapter.send(text, {channel: this.channel.id, user: this.user.id})
    }
}
