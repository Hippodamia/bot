"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Context = void 0;
class Context {
    constructor() {
        this.type = this.channel ? 'channel' : 'direct';
    }
    reply(...content) {
        let text = content.join('');
        this.adapter.send(text, { channel: this.channel.id, user: this.user.id });
    }
}
exports.Context = Context;
