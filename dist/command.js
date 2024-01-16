"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseCommand = exports.Command = void 0;
class Command {
    constructor(name, args = {}) {
        this.subCommands = [];
        this.exec = (context, args) => {
            function getHelpList(command) {
                const result = [];
                for (const subCommand of command.subCommands) {
                    result.push(`${command.name} ${subCommand.name}`);
                    result.push(...getHelpList(subCommand));
                }
                return result;
            }
            if (this.showHelp) {
                context.reply(getHelpList(this).join('\n'));
            }
        };
        this.name = name;
        if (this.name[0] == '/') {
            this.name = this.name.substring(1);
        }
        this.args = args;
        this.subCommands = [];
    }
    //insert and merge sub commands
    pushSubCommand(command) {
        const findCommand = (name) => {
            return this.subCommands.find(c => c.name === name);
        };
        let exist = findCommand(command.name);
        if (exist) {
            if (command.subCommands.length != 0) {
                for (let sub of command.subCommands) {
                    exist.pushSubCommand(sub);
                }
            }
            exist.args = Object.assign(Object.assign({}, exist.args), command.args);
        }
        else {
            this.subCommands.push(command);
        }
    }
}
exports.Command = Command;
// 必须以 /
function parseCommand(text) {
    const parts = text.split(" ");
    const name = parts.shift(); // 取出指令名
    const cmd = new Command(name);
    let lastSub = cmd;
    for (let i = 0; i < parts.length; i++) {
        let part = parts[i];
        if (part[0] == '<') {
            cmd.args[part.match('<(.*)>')[1]] = '';
            lastSub = cmd;
        }
        else if (part[0] == '[') {
            cmd.args[part.match(/\[(.*)]/)[1]] = '';
            lastSub = cmd;
        }
        else {
            // 子指令
            const { command: subCmd, lastSub: last } = parseCommand([...parts.slice(i)].join(' '));
            cmd.subCommands.push(subCmd);
            lastSub = last;
            break;
        }
    }
    return { command: cmd, lastSub };
}
exports.parseCommand = parseCommand;
