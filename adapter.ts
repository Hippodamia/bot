import {Bot} from "./bot";

/**
 * 用于收发消息的适配器
 *
 */
export interface Adapter {

    info: {
        version: string,
        name: string,
        desc: string
    }

    send(content: string | string[], target: { channel?: string, user?: string }): void

    init?(bot: Bot): void;
}
