import {Bot} from "./bot";
import {Logger} from "winston";

export interface Adapter {

    info: {
        version: string,
        name: string,
        desc: string
    }

    send(content: string | string[], target: { channel?: string, user?: string })

    init?(bot:Bot);
}
