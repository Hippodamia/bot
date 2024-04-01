"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Context = void 0;
class Context {
    constructor(user, bot, raw, logger) {
        /**
         * 上下文往往只有两种来源，一种是群组，一种是一对一对话
         */
        this.type = this.channel ? 'channel' : 'direct';
        this.user = user;
        this.bot = bot;
        this.rawContent = raw;
        this.logger = logger;
    }
    /**
     * 语法糖
     * 快速进行回复，只能采用字符串数组进行简单的文本回复，不会有任何拼接
     * @param content
     */
    reply(...content) {
        var _a, _b;
        let text = content.join('');
        (_a = this.adapter) === null || _a === void 0 ? void 0 : _a.send(text, { channel: (_b = this.channel) === null || _b === void 0 ? void 0 : _b.id, user: this.user.id });
    }
}
exports.Context = Context;
