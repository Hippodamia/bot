import { EventEmitter } from 'eventemitter3'
import { Command, parseCommand, RegexCommand } from "./command";
import { Context } from "./context";
import { Adapter } from "./adapter";
import pino, { Logger,LoggerOptions } from 'pino'
import { colorizerFactory } from 'pino-pretty'
export interface CommandConfig {
    strict?: boolean,
    command: string,
    showHelp?: boolean
}

type BaseEventType = {
    user: {
        name?: string,
        id: string
    },
    channel?: {
        id: string
        name?: string
    },
    platform?: string
}
type CommandEventType = { command: string } & BaseEventType
type CommandExecEventType = { ctx: Context, args: string[] }

type BotEventEmitterType = {
    /**
     * 用于触发某个指令，指令必须为纯文本，由bot自行解析
     * @param args
     */
    'command': (args: CommandEventType) => void,
    /**
     * 用于让外部监听某个command被执行
     * @param args
     */
    'command_exec': (args: CommandExecEventType) => void
}

type BotMiddleware = (ctx: Context) => Promise<boolean | void>

export class Bot extends EventEmitter<BotEventEmitterType> {
    constructor(options:{loggerLevel:LoggerOptions['level']}={loggerLevel:'info'}) {
        super();

        //初始bot的logger
        this.logger = pino({
            level: options.loggerLevel,
            transport: {
                target: 'pino-pretty',
                options: {
                    colorize: true
                }
            },
        })

        this.on("command", ({ platform, command, user, channel }) => {
            const ctx = new Context()

            //初始化ctx三要素
            ctx.rawContent = command
            ctx.user = user;
            ctx.channel = channel;

            //初始化logger
            ctx.logger = this.logger

            let name = command.split(' ')[0];
            if (name[0] == '/') {
                name = name.substring(1);
            }

            this.regexCommands.forEach(x => { x.regex.lastIndex = 0 })
            let regex_cmd_list = this.regexCommands.filter(x => x.regex.test(command))
            for (let cmd of regex_cmd_list) {
                cmd.regex.lastIndex = 0;
                let result = cmd.regex.exec(command)
                ctx.args = result.groups;
                cmd.exec(ctx, result.slice(1));
                this.emit('command_exec', { ctx, args: result.slice(1) })
            }

            let cmd = this.commands.find(x => x.name == name)
            if (cmd) {
                const { command: find, args, commandTree } = findMatchingSub(cmd, command.split(' ').slice(1));
                if (find) {
                    let copy = args.slice(0);
                    let _args: { [key: string]: string } = {};
                    for (let key of Object.keys(find.args)) {
                        _args[key] = args.shift()
                    }
                    ctx.args = _args


                    ctx.command = commandTree;
                    //select platform adapters
                    if (platform)
                        ctx.adapter = this.adapters.find(x => x.info.name == platform)

                    find.exec(ctx, copy);
                    this.emit('command_exec', { ctx, args: copy })
                }
            }
        })
    }

    adapters: Adapter[] = []
    commands: Command[] = []
    regexCommands: RegexCommand[] = []
    middlewares: BotMiddleware[] = []

    logger: Logger;

    load(adapter: Adapter) {
        if (!this.adapters.find(x => x.info.name == adapter.info.name)) {
            this.adapters.push(adapter)
            adapter.init?.(this);
        }
    }

    cmd(config: CommandConfig, handler: Command['exec']);
    cmd(text: string, handler: Command['exec']);
    cmd(config: string | CommandConfig, handler: Command['exec']) {
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
        function getLastCommand(command) {
            if (!command)
                return undefined
            // 检查是否存在子命令
            if (command.subCommands.length === 0) {
                return command;
            } else {
                // 递归迭代子命令
                return getLastCommand(command.subCommands[0]);
            }
        }

        return getLastCommand(this.getCommandChainWithString(cmd))
    }

    /**
     * 通过命令文本获取在bot.commands中的有效Command链
     * @param cmd
     * @returns 只有当bot已注注册命令链才会有正确的返回值。
     */
    public getCommandChainWithString(cmd: string) {
        let chain: Command | undefined = undefined
        let { command } = parseCommand(cmd);
        let search_list = this.commands;
        let find = {} as Command
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


}

export function findMatchingSub(cmd: Command, text: string | string[]): { command: Command, args: string[], commandTree: Command } {
    let parts = Array.isArray(text) ? text : text.split(' ')
    let sub = cmd.subCommands.find(x => x.name == parts[0]);
    if (!sub) {
        // is arg
        return { command: cmd, args: parts, commandTree: cmd }
    } else {
        const { command, args, commandTree } = findMatchingSub(sub, parts.slice(1));
        return { command, args, commandTree: cmd }
    }
}
