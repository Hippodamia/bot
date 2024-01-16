import { Bot } from "./bot";
import { Adapter } from "./adapter";
import { Command } from "./command";
export declare class Context {
    args?: {
        [key: string]: string;
    };
    user: {
        name?: string;
        id: string;
    };
    channel?: {
        id: string;
    };
    type: string;
    rawContent: string;
    bot: Bot;
    adapter?: Adapter;
    command: Command;
    reply(...content: string[]): void;
}
