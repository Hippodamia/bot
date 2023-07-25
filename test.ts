import {Bot, Command, findMatchingSub, parseCommand} from './index'
import {randomUser} from "./utils";
import {Adapter} from "./adapter";
import fastify from "fastify";
import fetch from "node-fetch";
import {json} from "stream/consumers";
import * as repl from "repl";
import {GoCQHttpAdapter} from "@hippodamia/adapter-gocqhttp";

function log(obj: any) {
    console.log(JSON.stringify(obj, undefined, 2))
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

