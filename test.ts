import {Bot} from "./bot";

const bot = new Bot()
bot.cmd({command: '/dev fakeuser <count>', showHelp: true}, (ctx) => {

})
bot.cmd('/dev race player set', (ctx) => {

})
bot.cmd('/dev race player health set <count>', (ctx) => {

})
bot.cmd('/dev race player set die', (ctx) => {

})
bot.cmd('/dev coin', (ctx) => {

})
console.log(JSON.stringify( bot.getCommandChainWithString('/dev race player health set <count>')))
//{"subCommands":[{"subCommands":[{"subCommands":[{"subCommands":[{"subCommands":[],"name":"set","args":{"count":""}}],"name":"health","args":{}}],"name":"player","args":{}}],"name":"race","args":{}}],"name":"dev","args":{}}
console.log(JSON.stringify(bot.getEndCommandWithString('/dev race player health set <count>')))
//{"subCommands":[],"name":"set","args":{"count":""}}
