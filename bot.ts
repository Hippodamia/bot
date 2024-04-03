import {EventEmitter} from 'eventemitter3'
import {Command, parseCommand, RegexCommand} from "./command";
import {Context} from "./context";
import {Adapter} from "./adapter";
import pino, {Logger, LoggerOptions} from 'pino'

export interface CommandConfig {
    strict?: boolean,
    command: string,
    showHelp?: boolean
}

type BaseEventType = Pick<Context,'user'|'channel'>&{
    platform?: string
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

type BotMiddleware = (ctx: Context) => Promise<boolean | void>

export class Bot extends EventEmitter<BotEventEmitterType> {
    adapters: Adapter[] = []
    commands: Command[] = []
    regexCommands: RegexCommand[] = []
    middlewares: BotMiddleware[] = []
    logger: Logger;

    constructor(options: { loggerLevel: LoggerOptions['level'] } = {loggerLevel: 'info'}) {
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

        this.on("command", (event:CommandEventType) => {
            const ctx = new Context(event.user, this, event.command_text, this.logger)

            ctx.channel = event.channel;

            let name = event.command_text.split(' ')[0]; // 获取command chain的header
            if (name[0] == '/')
                name = name.substring(1);

            //正则模式解析

            this.regexCommands.forEach(x => {
                //重置所有正则游标
                x.regex.lastIndex = 0
            })

            let regex_cmd_list = this.regexCommands.filter(x => x.regex.test(event.command_text)) //匹配满足正则条件的所有正则命令事件
            for (let cmd of regex_cmd_list) {
                cmd.regex.lastIndex = 0;
                let result = cmd.regex.exec(event.command_text) //执行命令事件
                if (!result)
                    continue // 跳过无结果匹配
                ctx.args = result.groups;
                cmd.exec(ctx, result.slice(1));
                this.emit('command_exec', {ctx, args: result.slice(1)})
            }

            // 常规的命令链 解析
            let cmd = this.commands.find(x => x.name == name || x.aliases?.includes(name))
            if (cmd) {
                const {command: find, args, commandTree} = findMatchingSub(cmd, event.command_text.split(' ').slice(1)); //使用空格分隔解析命令树和参数
                if (!find) return;
                let copy = args.slice(0);
                let _args: { [key: string]: string } = {};
                for (let key of Object.keys(find.args)) {
                    _args[key] = args.shift() ?? ''
                }
                ctx.args = _args
                ctx.command = commandTree;
                if (event.platform)
                    ctx.adapter = this.adapters.find(x => x.info.name == event.platform)
                find.exec(ctx, copy);
                this.emit('command_exec', {ctx, args: copy})
            }
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
        let {command, lastSub} = parseCommand(text);

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
        function getLastCommand(command?: Command) {
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
        let {command} = parseCommand(cmd);
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


}

export function findMatchingSub(cmd: Command, text: string | string[]): {
    command: Command,
    args: string[],
    commandTree: Command
} {
    let parts = Array.isArray(text) ? text : text.split(' ')
    let sub = cmd.subCommands.find(x => x.name == parts[0] || x.aliases?.includes(parts[0]));
    if (!sub) {
        // is arg
        return {command: cmd, args: parts, commandTree: cmd}
    } else {
        const {command, args, commandTree} = findMatchingSub(sub, parts.slice(1));
        return {command, args, commandTree: cmd}
    }
}
