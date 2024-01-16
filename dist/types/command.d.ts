import { Context } from "./context";
export interface CommandArgs {
    [key: string]: string;
}
export declare class Command {
    name: string;
    args: CommandArgs;
    subCommands: Command[];
    exec: (context: Context, args: string[]) => void;
    constructor(name: string, args?: CommandArgs);
    pushSubCommand(command: Command): void;
    showHelp: boolean;
}
export declare function parseCommand(text: string): {
    command: Command;
    lastSub: Command;
};
