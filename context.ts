import {Bot} from "./bot";
import {Adapter} from "./adapter";
import {Command} from "./command";
import {Logger} from "pino";

export class Context {

    /**
     * 命令上下文会解析参数，参数由命令表达式决定
     */
    args?: {
        [key: string]: string
    }
    /**
     * 代表上下文涉及的用户
     * 也有可能没有用户，即这是一个无用户事件的上下文
     */
    user: {
        name?: string,
        id: string
    }
    /**
     * 涉及到的群组/子频道等，id为最贴近的一个
     */
    channel?: {
        id: string
    }
    /**
     * 上下文往往只有两种来源，一种是群组，一种是一对一对话
     */
    type = this.channel ? 'channel' : 'direct'
    /**
     * 原始文本
     */
    rawContent: string
    /**
     * 机器人对象
     */
    bot: Bot
    /**
     * 上下文涉及的适配器对象
     */
    adapter?: Adapter
    /**
     * 上下文涉及到的命令链
     */
    command?: Command;
    /**
     * 日志输出工具
     */
    logger: Logger;

    constructor(user: Context['user'],bot:Bot,raw:string, logger: Logger) {
        this.user = user
        this.bot = bot
        this.rawContent = raw
        this.logger = logger
    }

    /**
     * 语法糖
     * 快速进行回复，只能采用字符串数组进行简单的文本回复，不会有任何拼接
     * @param content
     */
    reply(...content: string[]) {
        let text = content.join('')
        this.adapter?.send(text, {channel: this.channel?.id, user: this.user.id})
    }


}
