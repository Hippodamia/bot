"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findMatchingSub = exports.Bot = void 0;
const eventemitter3_1 = require("eventemitter3");
const command_1 = require("./command");
const context_1 = require("./context");
class Bot extends eventemitter3_1.EventEmitter {
    constructor() {
        super();
        this.adapters = [];
        this.commands = [];
        this.middlewares = [];
        this.on("command", ({ platform, command, user, channel }) => {
            const ctx = new context_1.Context();
            ctx.rawContent = command;
            let name = command.split(' ')[0];
            if (name[0] == '/') {
                name = name.substring(1);
            }
            let cmd = this.commands.find(x => x.name == name);
            if (cmd) {
                const { command: find, args, commandTree } = findMatchingSub(cmd, command.split(' ').slice(1));
                if (find) {
                    let copy = args.slice(0);
                    let _args = {};
                    for (let key of Object.keys(find.args)) {
                        _args[key] = args.shift();
                    }
                    ctx.args = _args;
                    ctx.user = user;
                    ctx.channel = channel;
                    ctx.command = commandTree;
                    //select platform adapter
                    if (platform)
                        ctx.adapter = this.adapters.find(x => x.info.name == platform);
                    find.exec(ctx, copy);
                    this.emit('command_exec', { ctx, args: copy });
                }
            }
        });
    }
    load(adapter) {
        var _a;
        if (!this.adapters.find(x => x.info.name == adapter.info.name)) {
            this.adapters.push(adapter);
            (_a = adapter.init) === null || _a === void 0 ? void 0 : _a.call(adapter, this);
        }
    }
    cmd(config, handler) {
        var _a;
        let text;
        if (typeof config == 'string') {
            text = config;
        }
        else {
            text = config.command;
        }
        let { command, lastSub } = (0, command_1.parseCommand)(text);
        lastSub.exec = handler;
        if (typeof config != 'string') {
            lastSub.showHelp = (_a = config.showHelp) !== null && _a !== void 0 ? _a : false;
        }
        this.mergeCommands(command);
    }
    /**
     * 函数化操作文本解析后的Command链末尾的Command
     * @param cmd
     * @param set
     */
    config(cmd, set) {
        const command = this.getEndCommandWithString(cmd);
        if (command) {
            set(command);
        }
    }
    /**
     * 通过命令文本获取在bot.commands中的有效Command链的末尾Command
     * @param cmd
     */
    getEndCommandWithString(cmd) {
        function getLastCommand(command) {
            if (!command)
                return undefined;
            // 检查是否存在子命令
            if (command.subCommands.length === 0) {
                return command;
            }
            else {
                // 递归迭代子命令
                return getLastCommand(command.subCommands[0]);
            }
        }
        return getLastCommand(this.getCommandChainWithString(cmd));
    }
    /**
     * 通过命令文本获取在bot.commands中的有效Command链
     * @param cmd
     */
    getCommandChainWithString(cmd) {
        let chain = undefined;
        let { command } = (0, command_1.parseCommand)(cmd);
        let search_list = this.commands;
        let find = {};
        let last_find = {};
        while (true) {
            //寻找
            find = search_list.find(x => x.name == command.name);
            if (find) {
                if (!chain) {
                    chain = find;
                }
                else {
                    last_find.subCommands = [];
                    last_find.pushSubCommand(find);
                }
                if (command.subCommands.length > 0) {
                    //为下一次做准备
                    command = command.subCommands[0];
                    search_list = find.subCommands;
                    last_find = find;
                }
                else {
                    return chain;
                }
            }
            else {
                break;
            }
        }
        return undefined;
    }
    use(middleware) {
        this.middlewares.push(middleware);
    }
    mergeCommands(cmd) {
        const find = this.commands.find(c => c.name == cmd.name);
        if (find) {
            for (let sub of cmd.subCommands)
                find.pushSubCommand(sub);
        }
        else {
            this.commands.push(cmd);
        }
    }
}
exports.Bot = Bot;
function findMatchingSub(cmd, text) {
    let parts = Array.isArray(text) ? text : text.split(' ');
    let sub = cmd.subCommands.find(x => x.name == parts[0]);
    if (!sub) {
        // is arg
        return { command: cmd, args: parts, commandTree: cmd };
    }
    else {
        const { command, args, commandTree } = findMatchingSub(sub, parts.slice(1));
        return { command, args, commandTree: cmd };
    }
}
exports.findMatchingSub = findMatchingSub;
