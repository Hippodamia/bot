import {Bot, Command, findMatchingSub, parseCommand} from './index'
import {randomUser} from "./utils";
import {Adapter} from "./adapter";
import fastify from "fastify";
import fetch from "node-fetch";
import {json} from "stream/consumers";
import winston from "winston";
import * as repl from "repl";

function log(obj: any) {
    console.log(JSON.stringify(obj, undefined, 2))
}

const logger = winston.createLogger({
    level: 'error',
    transports: [
        new winston.transports.Console({
            format: winston.format.simple(),
        })
    ]
})

class GoCQHttpAdapter implements Adapter {
    api = 'http://127.0.0.1:5700'

    constructor(config?: { port?: number, api?: string }) {
        this.api = config?.api ?? this.api;
    }

    info = { version: '1.0', name: 'adapter-gocqhttp', desc: '提供go-cqhttp的HTTP正反向适配' };

    async send(content: string, target: { channel?: string; user?: string }) {
        const resp = await fetch(this.api + '/send_group_msg', {
            method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(
                {group_id: target.channel!, message: content}
            )
        })
        const {message_id} = await resp.json() as { message_id: string }
        logger.debug(message_id)
    }

    init(bot: Bot) {
        const app = fastify();
        app.post<{
            Body: {
                post_type: string,
                message_type: 'private' | 'group',
                user_id: number,
                raw_message: string,
                group_id?: string
            }
        }>('/event', async (request, reply) => {
            //console.log(request.body)
            try {
                if (request.body.post_type == 'message' && request.body.message_type == 'group') {
                    let {user_id, group_id, raw_message} = request.body
                    bot.emit('command', {
                        platform: this.info.name,
                        user: {id: user_id.toString()},
                        channel: {id: group_id!},
                        command: raw_message
                    })
                }
            } catch (err: any) {
                console.log(err)
            }

        })
        app.setErrorHandler((error, request, reply) => {
            reply.send(error)
        })
        app.listen({
            port: 8080
        }, () => {
            console.log('[Adapter-gocqhttp]HTTP反向监听服务启动:端口8080')
        })
    }
}


//log(parseCommand('/race start <mode>'))

const bot = new Bot()
bot.cmd('/小马积分', (ctx) => {
    console.log('123')
    ctx.reply(['😊嗨，好久不见!', '你当前拥有🍭 $undefined$ 小马积分!', '😉你可以通过这些方式来获取积分:', '- 参与比赛', '- 每日签到', '- 雷普赫尔'].join('\n'))
})
bot.cmd('/race start', () => {
})
bot.cmd('/race start <mode>', () => {
})
bot.cmd('/race join <name>', () => {
})
bot.cmd('/race stop', () => {
})
bot.cmd('/race stop force', () => {
})
bot.cmd('/help book with <page>', (ctx, args) => {
    ctx.reply
})
bot.cmd('/help shop [page]', (ctx) => {
    console.log(`user:${ctx.user.name},page:${ctx.args.page}`)
})


bot.on('command_exec', ({ctx, args}) => {

})

bot.emit('command', {command: 'help shop 2', user: randomUser(), channel: {id: '23333'}})

bot.load(new GoCQHttpAdapter())
//log(findMatchingSub(bot.commands[0],'stop force 2333 22333 dddd'))


//log(findMatchingSub(bot.commands[0],'stop force 2333 22333 dddd'))

