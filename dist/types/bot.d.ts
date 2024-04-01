import { EventEmitter } from 'eventemitter3';
import { Command, RegexCommand } from "./command";
import { Context } from "./context";
import { Adapter } from "./adapter";
import { Logger, LoggerOptions } from 'pino';
export interface CommandConfig {
    strict?: boolean;
    command: string;
    showHelp?: boolean;
}
type BaseEventType = Pick<Context, 'user' | 'channel'> & {
    platform?: string;
};
type CommandEventType = {
    command_text: string;
} & BaseEventType;
type CommandExecEventType = {
    ctx: Context;
    args: string[];
};
type BotEventEmitterType = {
    /**
     * 用于触发某个指令，指令必须为纯文本，由bot自行解析
     * @param event
     */
    'command': (event: CommandEventType) => void;
    /**
     * 用于让外部监听某个command被执行
     * @param args
     */
    'command_exec': (event: CommandExecEventType) => void;
};
type BotMiddleware = (ctx: Context) => Promise<boolean | void>;
export declare class Bot extends EventEmitter<BotEventEmitterType> {
    adapters: Adapter[];
    commands: Command[];
    regexCommands: RegexCommand[];
    middlewares: BotMiddleware[];
    logger: Logger;
    constructor(options?: {
        loggerLevel: LoggerOptions['level'];
    });
    /**
     * 让bot读取一个适配器
     * 注意，适配器的名称就是后续使用的平台
     * @param adapter
     */
    load(adapter: Adapter): void;
    cmd(config: CommandConfig, handler: Command['exec']): void;
    cmd(text: string, handler: Command['exec']): void;
    /**
     * Adds a regular expression command to the list of regex commands.
     * 添加一个正则匹配的指令处理
     *
     * @param {RegExp} regex - The regular expression to match.
     * @param {RegexCommand['exec']} handler - The handler function to execute when the regex matches.
     */
    regex(regex: RegExp, handler: RegexCommand['exec']): void;
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
     * @returns 只有当bot已注注册命令链才会有正确的返回值。
     */
    getCommandChainWithString(cmd: string): Command | undefined;
    use(middleware: BotMiddleware): void;
    /**
     * Merges the given command with the existing commands.
     *
     * @param {Command} cmd - The command to be merged.
     */
    private mergeCommands;
}
export declare function findMatchingSub(cmd: Command, text: string | string[]): {
    command: Command;
    args: string[];
    commandTree: Command;
};
export {};
