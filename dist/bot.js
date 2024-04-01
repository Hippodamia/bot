"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findMatchingSub = exports.Bot = void 0;
const eventemitter3_1 = require("eventemitter3");
const command_1 = require("./command");
const context_1 = require("./context");
const pino_1 = __importDefault(require("pino"));
class Bot extends eventemitter3_1.EventEmitter {
    constructor(options = { loggerLevel: 'info' }) {
        super();
        this.adapters = [];
        this.commands = [];
        this.regexCommands = [];
        this.middlewares = [];
        //初始bot的logger
        this.logger = (0, pino_1.default)({
            level: options.loggerLevel,
            transport: {
                target: 'pino-pretty',
                options: {
                    colorize: true
                }
            },
        });
        this.on("command", (event) => {
            var _a;
            const ctx = new context_1.Context(event.user, this, event.command_text, this.logger);
            ctx.channel = event.channel;
            let name = event.command_text.split(' ')[0]; // 获取command chain的header
            if (name[0] == '/')
                name = name.substring(1);
            //正则模式解析
            this.regexCommands.forEach(x => {
                //重置所有正则游标
                x.regex.lastIndex = 0;
            });
            let regex_cmd_list = this.regexCommands.filter(x => x.regex.test(event.command_text)); //匹配满足正则条件的所有正则命令事件
            for (let cmd of regex_cmd_list) {
                cmd.regex.lastIndex = 0;
                let result = cmd.regex.exec(event.command_text); //执行命令事件
                if (!result)
                    continue; // 跳过无结果匹配
                ctx.args = result.groups;
                cmd.exec(ctx, result.slice(1));
                this.emit('command_exec', { ctx, args: result.slice(1) });
            }
            // 常规的命令链 解析
            let cmd = this.commands.find(x => x.name == name);
            if (cmd) {
                const { command: find, args, commandTree } = findMatchingSub(cmd, event.command_text.split(' ').slice(1)); //使用空格分隔解析命令树和参数
                if (!find)
                    return;
                let copy = args.slice(0);
                let _args = {};
                for (let key of Object.keys(find.args)) {
                    _args[key] = (_a = args.shift()) !== null && _a !== void 0 ? _a : '';
                }
                ctx.args = _args;
                ctx.command = commandTree;
                if (event.platform)
                    ctx.adapter = this.adapters.find(x => x.info.name == event.platform);
                find.exec(ctx, copy);
                this.emit('command_exec', { ctx, args: copy });
            }
        });
    }
    /**
     * 让bot读取一个适配器
     * 注意，适配器的名称就是后续使用的平台
     * @param adapter
     */
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
     * Adds a regular expression command to the list of regex commands.
     * 添加一个正则匹配的指令处理
     *
     * @param {RegExp} regex - The regular expression to match.
     * @param {RegexCommand['exec']} handler - The handler function to execute when the regex matches.
     */
    regex(regex, handler) {
        let command = new command_1.RegexCommand(regex);
        command.exec = handler;
        this.regexCommands.push(command);
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
     * @returns 只有当bot已注注册命令链才会有正确的返回值。
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
    /**
     * Merges the given command with the existing commands.
     *
     * @param {Command} cmd - The command to be merged.
     */
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
