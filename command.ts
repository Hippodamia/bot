import {Context} from "./context";

export interface CommandArgs {
    [key: string]: string;
}

class CommandBase {
    name?: string;
    exec!: (context: Context, args: string[]) => void;

}

export class RegexCommand extends CommandBase {
    regex: RegExp;

    constructor(regex: RegExp) {
        super();
        this.regex = regex;
    }

}

export class Command {

    name: string;
    aliases?: string[]
    args: CommandArgs; //通常情况下，只有终结点命令才会有参数
    subCommands: Command[] = []
    showHelp?: boolean = false

    constructor(name: string, args: CommandArgs = {}) {
        this.name = name[0] == '/' ? name.substring(1) : name;
        this.args = args;
        this.subCommands = [];
    }

    exec: (context: Context, args: string[]) => void = (context, args) => {
        function getHelpList(command: Command): string[] {
            const result = [];
            for (const subCommand of command.subCommands) {
                result.push(`${command.name} ${subCommand.name}`);
                result.push(...getHelpList(subCommand));
            }
            return result;
        }

        if (this.showHelp) {
            context.reply(getHelpList(this).join('\n'))
        }
    };

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


/**
 * 将文本解析为命令对象
 * @param text
 */
export function parseCommand(text: string): { command: Command, lastSub: Command } {
    const parts = text.split(' ');
    const name = parts.shift()!; // 取出指令名

    let cmd:Command;
    //这个地方会检测这个分隔的文本是不是含有|
    //如果含有|，则会创建多个命令，并将第一个命令的别名设置为后面的命令名
    if(name.includes('|')){
        const [root,...aliases] = name.split('|')
        cmd = new Command(root);
        cmd.aliases = aliases;
    }else{
        cmd = new Command(name);
    }

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
