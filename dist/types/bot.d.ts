import { EventEmitter } from 'eventemitter3';
import { Command } from "./command";
import { Context } from "./context";
import { Adapter } from "./adapter";
export interface CommandConfig {
    strict?: boolean;
    command: string;
    showHelp?: boolean;
}
type BaseEventType = {
    user: {
        name?: string;
        id: string;
    };
    channel?: {
        id: string;
    };
    platform?: string;
};
type CommandEventType = {
    command: string;
} & BaseEventType;
type CommandExecEventType = {
    ctx: Context;
    args: string[];
};
type BotEventEmitterType = {
    'command': (args: CommandEventType) => void;
    'command_exec': (args: CommandExecEventType) => void;
};
type BotMiddleware = (ctx: Context) => void;
export declare class Bot extends EventEmitter<BotEventEmitterType> {
    constructor();
    adapters: Adapter[];
    commands: Command[];
    middlewares: BotMiddleware[];
    load(adapter: Adapter): void;
    cmd(config: CommandConfig, handler: Command['exec']): any;
    cmd(text: string, handler: Command['exec']): any;
    /**
     * 函数化操作文本解析后的Command链末尾的Command
     * @param cmd
     * @param set
     */
    config(cmd: string, set: (cmd: Command) => void): void;
    /**
     * 通过命令文本获取在bot.commands中的有效Command链的末尾Command
     * @param cmd
     */
    getEndCommandWithString(cmd: string): Command | undefined;
    /**
     * 通过命令文本获取在bot.commands中的有效Command链
     * @param cmd
     */
    getCommandChainWithString(cmd: string): Command;
    use(middleware: BotMiddleware): void;
    private mergeCommands;
}
export declare function findMatchingSub(cmd: Command, text: string | string[]): {
    command: Command;
    args: string[];
    commandTree: Command;
};
export {};
