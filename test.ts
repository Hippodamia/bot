import {Bot} from "./bot";

const bot = new Bot({loggerLevel:'debug'})
bot.cmd({command: '/dev fakeuser <count>', showHelp: true}, (ctx) => {

})
bot.cmd('/dev race player set', (ctx) => {

})

bot.regex(/^(?<at>@.*\s*)?[.。][bB][oO][tT]\s*[oO][nN]\s*$/g,
    (ctx)=>{
        ctx.logger.info('bot on!')
        ctx.logger.debug('bot on debug')
    })


bot.emit('command', {platform: 'fakeuser', command_text: '@heer .bot on', user: {name: 'fakeuser', id: 'fakeuser'}, channel: {id: 'fakeuser'}})
bot.emit('command', {platform: 'fakeuser', command_text: '.bot on', user: {name: 'fakeuser', id: 'fakeuser'}, channel: {id: 'fakeuser'}})

console.log(JSON.stringify( bot.getCommandChainWithString('/dev race player set')))
//{"subCommands":[{"subCommands":[{"subCommands":[{"subCommands":[{"subCommands":[],"name":"set","args":{"count":""}}],"name":"health","args":{}}],"name":"player","args":{}}],"name":"race","args":{}}],"name":"dev","args":{}}
console.log(JSON.stringify(bot.getEndCommandWithString('/dev race player health set <count>')))
//{"subCommands":[],"name":"set","args":{"count":""}}
