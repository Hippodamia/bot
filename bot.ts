import {EventEmitter} from 'eventemitter3'
import {Command, parseCommand} from "./command";
import {Context} from "./context";
import {Adapter} from "./adapter";
import * as child_process from "child_process";

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
    },
    platform?: string
}
type CommandEventType = { command: string } & BaseEventType
type CommandExecEventType = { ctx: Context, args: string[] }

type BotEventEmitterType = {
    'command': (args: CommandEventType) => void,
    'command_exec': (args: CommandExecEventType) => void
}
type BotMiddleware = (ctx: Context) => void

export class Bot extends EventEmitter<BotEventEmitterType> {
    constructor() {
        super();
        this.on("command", ({platform, command, user, channel}) => {
            const ctx = new Context()
            ctx.rawContent = command
            let name = command.split(' ')[0];
            if (name[0] == '/') {
                name = name.substring(1);
            }
            let cmd = this.commands.find(x => x.name == name)
            if (cmd) {
                const {command: find, args} = findMatchingSub(cmd, command.split(' ').slice(1));
                if (find) {
                    let copy = args.slice(0);
                    let _args: { [key: string]: string } = {};
                    for (let key of Object.keys(find.args)) {
                        _args[key] = args.shift()
                    }
                    ctx.args = _args
                    ctx.user = user;
                    ctx.channel = channel;

                    //select platform adapter
                    if (platform)
                        ctx.adapter = this.adapters.find(x => x.info.name == platform)

                    find.exec(ctx, copy);
                    this.emit('command_exec', {ctx, args: copy})
                }
            }
        })
    }

    adapters: Adapter[] = []

    commands: Command[] = []

    middlewares: BotMiddleware[] = []

    load(adapter: Adapter) {
        if (!this.adapters.find(x => x.info.name == adapter.info.name)) {
            this.adapters.push(adapter)
            adapter.init?.(this);
        }
    }

    cmd(config: CommandConfig, hander: Command['exec']);
    cmd(text: string, handler: Command['exec']) ;
    cmd(config: string | CommandConfig, handler: Command['exec']) {
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
     * 函数化操作文本解析后的Command链末尾的Command
     * @param cmd
     * @param set
     */
    config(cmd: string, set: (cmd: Command) => void): void {
        const command = this.getEndCommandWithString(cmd)
        if (command) {
            set(command)
        }
    }

    /**
     * 通过命令文本获取在bot.commands中的有效Command链的末尾Command
     * @param cmd
     */
    getEndCommandWithString(cmd: string): Command | undefined {
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
     */
    getCommandChainWithString(cmd: string) {
        let chain: Command | undefined = undefined
        let {command} = parseCommand(cmd);
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

export function findMatchingSub(cmd: Command, text: string | string[]): { command: Command, args: string[] } {
    let parts = Array.isArray(text) ? text : text.split(' ')
    let sub = cmd.subCommands.find(x => x.name == parts[0]);
    if (!sub) {
        //is arg
        return {command: cmd, args: parts}
    } else {
        return findMatchingSub(sub, parts.slice(1))
    }
}
