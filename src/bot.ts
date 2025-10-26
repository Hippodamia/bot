import { EventEmitter } from 'eventemitter3'
import { Command, parseCommand, RegexCommand } from "./command";
import { Context } from "./context";
import { Adapter } from "./adapter";
import { BaseLogger } from './types';

export interface CommandConfig {
    /** 是否严格匹配指令 */
    strict?: boolean,
    /** 指令语句 */
    command: string,
    /** 命令 */
    showHelp?: boolean,
    /** 别名 */
    alias?: string[],
    /** 最后的命令和参数之间允许忽略空格 */
    ignoreSpace?: boolean,
}

type BaseEventType = Pick<Context, 'user' | 'channel'> & {
    platform?: string
    msg_id?:string
}


type CommandEventType = { command_text: string } & BaseEventType
type CommandExecEventType = { ctx: Context, args: string[] }

type BotEventEmitterType = {
    /**
     * 用于触发某个指令，指令必须为纯文本，由bot自行解析
     * @param event
     */
    'command': (event: CommandEventType) => void,

    /**
     * 用于让外部监听某个command被执行
     * @param args
     */
    'command_exec': (event: CommandExecEventType) => void
}

/** TODO 还没做完*/
type BotMiddleware = (ctx: Context) => Promise<boolean | void>

export class Bot extends EventEmitter<BotEventEmitterType> {
    adapters: Adapter[] = []
    commands: Command[] = []
    regexCommands: RegexCommand[] = []
    middlewares: BotMiddleware[] = []
    logger: BaseLogger;

    constructor(options: { logger: BaseLogger }) {
        super();

        //初始bot的logger
        this.logger = options.logger;

        this.on("command", (event: CommandEventType) => {
            const ctx = this.createContext(event);
            const normalizedText = this.normalizeCommandText(event.command_text);

            this.processRegexCommands(ctx, event.command_text, normalizedText);
            this.executeCommandChain(ctx, normalizedText);
        })
    }

    /**
     * 让bot读取一个适配器
     * 注意，适配器的名称就是后续使用的平台
     * @param adapter
     */
    load(adapter: Adapter) {
        if (!this.adapters.find(x => x.info.name == adapter.info.name)) {
            this.adapters.push(adapter)
            adapter.init?.(this);
        }
    }


    cmd(config: CommandConfig, handler: Command['exec']): void;
    cmd(text: string, handler: Command['exec']): void;
    cmd(config: string | CommandConfig, handler: Command['exec']): void {
        let text: string;
        if (typeof config == 'string') {
            text = config
        } else {
            text = config.command
        }
        let { command, lastSub } = parseCommand(text);

        lastSub.exec = handler;
        if (typeof config != 'string') {
            lastSub.showHelp = config.showHelp ?? false;
            lastSub.aliases = config.alias ?? [];
            lastSub.ignoreSpace = config.ignoreSpace ?? false;
        }
        this.mergeCommands(command);
    }

    /**
     * Adds a regular expression command to the list of regex commands.
     * 添加一个正则匹配的指令处理
     *
     * @param {RegExp} regex - The regular expression to match.
     * @param {RegexCommand['exec']} handler - The handler function to execute when the regex matches.
     */
    regex(regex: RegExp, handler: RegexCommand['exec']) {
        let command = new RegexCommand(regex)
        command.exec = handler
        this.regexCommands.push(command)
    }

    /**
     * 函数化操作文本解析后的Command链末尾的Command
     * @param cmd
     * @param set
     */
    public config(cmd: string, set: (cmd: Command) => void): void {
        const command = this.getEndCommandWithString(cmd)
        if (command) {
            set(command)
        }
    }

    /**
     * 通过命令文本获取在bot.commands中的有效Command链的末尾Command
     * @param cmd
     */
    public getEndCommandWithString(cmd: string): Command | undefined {
        return this.getLastSubCommand(this.getCommandChainWithString(cmd));
    }

    /**
     * 通过命令文本获取在bot.commands中的有效Command链
     * @param cmd
     * @returns 只有当bot已注注册命令链才会有正确的返回值。
     */
    public getCommandChainWithString(cmd: string) {
        let chain: Command | undefined = undefined //这就是最后需要返回的Chain
        let { command } = parseCommand(cmd);
        let search_list = this.commands;
        let find = {} as Command | undefined
        let last_find = {} as Command
        while (true) {
            //寻找
            find = search_list.find(x => x.name == command.name);
            if (find) {
                if (!chain) {
                    chain = find
                } else {
                    last_find.subCommands = []
                    last_find.pushSubCommand(find)
                }
                if (command.subCommands.length > 0) {
                    //为下一次做准备
                    command = command.subCommands[0]
                    search_list = find.subCommands;
                    last_find = find;
                } else {
                    return chain
                }
            } else {
                break;
            }
        }
        return undefined
    }

    use(middleware: BotMiddleware) {
        this.middlewares.push(middleware)
    }

    /**
     * Merges the given command with the existing commands.
     *
     * @param {Command} cmd - The command to be merged.
     */
    private mergeCommands(cmd: Command) {
        const find = this.commands.find(c => c.name == cmd.name)
        if (find) {
            for (let sub of cmd.subCommands)
                find.pushSubCommand(sub)
        } else {
            this.commands.push(cmd)
        }
    }

    private createContext(event: CommandEventType): Context {
        const ctx = new Context(event.user, this, event.command_text, this.logger);
        ctx.msg_id = event.msg_id;
        ctx.channel = event.channel;
        ctx.adapter = this.findAdapter(event.platform);
        return ctx;
    }

    private normalizeCommandText(text: string): string {
        let commandText = text.trim();
        if (commandText.startsWith('/')) {
            commandText = commandText.slice(1);
        }
        return commandText;
    }

    private processRegexCommands(ctx: Context, originalText: string, normalizedText: string): void {
        for (const command of this.regexCommands) {
            const match = this.tryMatchRegexCommand(command, originalText, normalizedText);
            if (!match) continue;

            ctx.args = match.groups ?? undefined;
            command.exec(ctx, match.slice(1));
            this.emit('command_exec', { ctx, args: match.slice(1) });
        }
    }

    private tryMatchRegexCommand(command: RegexCommand, originalText: string, normalizedText: string): RegExpExecArray | undefined {
        command.regex.lastIndex = 0;
        if (!command.regex.test(normalizedText)) {
            return undefined;
        }
        command.regex.lastIndex = 0;
        return command.regex.exec(originalText) ?? undefined;
    }

    private executeCommandChain(ctx: Context, commandText: string): void {
        const { command: matchedCommand, args, commandChain } = findMatchingSub(undefined, this.commands, commandText);
        if (!matchedCommand) return;

        const { namedArgs, remainingArgs } = this.splitArgs(matchedCommand, args);
        ctx.args = namedArgs;
        ctx.command = commandChain;

        matchedCommand.exec(ctx, remainingArgs);
        this.emit('command_exec', { ctx, args: remainingArgs });
    }

    private splitArgs(command: Command, args: string[]): { namedArgs: { [key: string]: string }, remainingArgs: string[] } {
        const remainingArgs = args.slice(0);
        const namedArgs: { [key: string]: string } = {};
        for (const key of Object.keys(command.args)) {
            namedArgs[key] = remainingArgs.shift() ?? '';
        }
        return { namedArgs, remainingArgs };
    }

    private getLastSubCommand(command?: Command): Command | undefined {
        let current = command;
        while (current && current.subCommands.length > 0) {
            current = current.subCommands[0];
        }
        return current;
    }

    private findAdapter(platform?: string): Adapter | undefined {
        if (!platform) return undefined;
        return this.adapters.find(x => x.info.name == platform);
    }
}

/**
 * 从给定的`Command`列表中寻找匹配的子命令，并返回整个命令链(的Header)
 * 如果`Command`的`IgnoreSpace`为`true`，则在子命令匹配参数时允许忽略空格
 * 
 * @param header Command Chain的Header，Chain应该是只有单一sub的命令，所以会寻找最后的子命令进行处理操作
 * @param cmds 
 * @param text 
 * @returns 如果找不到则为`undefined`
 */
export function findMatchingSub(header: Command | undefined, cmds: Command[], text: string | string[]): {
    command: Command | undefined,
    args: string[],
    commandChain: Command | undefined
} {
    //console.log('findMatchingSub', header, text)
    let parts = Array.isArray(text) ? text : text.split(' ') ?? [text]
    let matchText = parts[0]

    let sub: Command | undefined = undefined


    for (const command of cmds) {
        if (matchText == command.name || command.aliases?.includes(matchText)) {
            sub = command
            parts = parts.slice(1)
            break;
        }
    }

    if (!sub) {
        // 使用ignoreSpace来继续判断
        for (const command of cmds) {
            if (matchText.includes(command.name)) {
                sub = command
                parts[0] = parts[0].replace(command.name, '')
                break
            }
            const aliasFind = command.aliases?.find(x => matchText.includes(x))
            if (aliasFind) {
                sub = command
                parts[0] = parts[0].replace(aliasFind, '')
                break
            }
        }
    }



    if (!sub) {
        if (header) {
            let lastSub = header
            while (lastSub.subCommands.length > 0) {
                lastSub = lastSub.subCommands[0]
            }
            return { command: lastSub, args: parts, commandChain: header }
        }
        return { command: undefined, args: parts, commandChain: header }
    }
    else {
        const sub_commands = sub.subCommands
        if (!header) {
            header = sub
            header.subCommands = []
        }
        else {
            // get last sub command
            let lastSub = header
            while (lastSub.subCommands.length > 0) {
                lastSub = lastSub.subCommands[0]
            }
            sub.subCommands = []
            lastSub.subCommands = [sub]
        }
        const { command, args, commandChain } = findMatchingSub(header, sub_commands, parts);
        return { command, args, commandChain: commandChain }
    }
}