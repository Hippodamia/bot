import {Bot, Command, findMatchingSub, parseCommand} from './index'

function log(obj:any){
    console.log(JSON.stringify(obj,undefined,2))
}

//log(parseCommand('/race start <mode>'))

const bot = new Bot()
bot.cmd('/race start',()=>{})
bot.cmd('/race start <mode>',()=>{})
bot.cmd('/race join <name>',()=>{})
bot.cmd('/race stop',()=>{})
bot.cmd('/race stop force',()=>{})
bot.cmd('/help book with <page>',(ctx,args)=>{
    log({ctx,args})
})
bot.cmd('/help shop',()=>{})

bot.on('command_exec',({ctx, args})=>{
    log({ctx, args})
})

bot.emit('command',{command: '/help book with 2',user:{id:'233'},channel:{id:'23333'}})
//log(findMatchingSub(bot.commands[0],'stop force 2333 22333 dddd'))




//log(findMatchingSub(bot.commands[0],'stop force 2333 22333 dddd'))

