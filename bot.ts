import {EventEmitter} from 'eventemitter3'
import {Command, parseCommand} from "./command";
import {Context} from "./context";
import {Adapter} from "./adapter";

export interface CommandHandlerConfig {
    strict?: boolean
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

    load(adapter: Adapter) {
        if (!this.adapters.find(x => x.info.name == adapter.info.name)) {
            this.adapters.push(adapter)
            adapter.init?.(this);
        }
    }

    cmd(text: string, handler: Command['exec']) {
        let {command, lastSub} = parseCommand(text);
        lastSub.exec = handler;
        this.mergeCommands(command);
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
