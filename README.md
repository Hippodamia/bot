# @hippodamia/bot
A simple bot command parsing and event emitting library.

## Install

```
npm install @hippodamia/bot
```
or
```
pnpm add @hippodamia/bot
```

## Usage

```ts
import { Bot } from '@hippodamia/bot'

const bot = new Bot()

// Register a command 
bot.cmd('/help shop [page]', (ctx) => {
  console.log(`user:${ctx.user.name}, page: ${ctx.args.page}`)
})

```

`bot.cmd()` is used to register a command listener. It accepts a command string and a callback function.

When that command is triggered, the callback is called and you get a `ctx` object containing:

- `ctx.command` - The full command
- `ctx.args` - Parsed arguments
- `ctx.user` - The user who triggered the command

## API

- `bot.cmd(command, callback)` - Register a command
- `bot.on(event, callback)` - Listen for an event
- `bot.emit(event, data)` - Emit an event

## Objects

- `Context` - Contains data about the command execution context

## License

MIT

Hope this helps! Let me know if you have any questions or suggestions.
