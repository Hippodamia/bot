import {Context} from "./context";

export interface CommandArgs {
    [key: string]: string;
}


export class Command {

    name: string;
    args: CommandArgs;
    subCommands: Command[] = []

    exec: (context: Context, args: string[]) => void = (context, args) => {
        throw new Error('undefined')
    };

    constructor(name: string, args: CommandArgs = {}) {
        this.name = name;
        if (this.name[0] == '/') {
            this.name = this.name.substring(1)
        }
        this.args = args;
        this.subCommands = [];
    }

    //insert and merge sub commands
    pushSubCommand(command: Command) {
        const findCommand = (name: string) => {
            return this.subCommands.find(c => c.name === name);
        }
        let exist = findCommand(command.name);
        if (exist) {
            if (command.subCommands.length != 0) {
                for (let sub of command.subCommands) {
                    exist.pushSubCommand(sub)
                }
            }
            exist.args = {...exist.args, ...command.args}
        } else {
            this.subCommands.push(command)
        }
    }
}

// 必须以 /
export function parseCommand(text: string): { command: Command, lastSub: Command } {
    const parts = text.split(" ");
    const name = parts.shift()!; // 取出指令名
    const cmd = new Command(name);

    let lastSub = cmd;

    for (let i = 0; i < parts.length; i++) {
        let part = parts[i];
        if (part[0] == '<') {
            cmd.args[part.match('<(.*)>')![1]] = ''
            lastSub = cmd
        } else if (part[0] == '[') {
            cmd.args[part.match(/\[(.*)]/)![1]] = ''
            lastSub = cmd
        } else {
            // 子指令
            const {command: subCmd, lastSub: last} = parseCommand([...parts.slice(i)].join(' '));
            cmd.subCommands.push(subCmd);
            lastSub = last;
            break;
        }
    }

    return {command: cmd, lastSub};
}
