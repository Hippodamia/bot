import { Context } from "./context";
export interface CommandArgs {
    [key: string]: string;
}
declare class CommandBase {
    name?: string;
    exec: (context: Context, args: string[]) => void;
}
export declare class RegexCommand extends CommandBase {
    regex: RegExp;
    constructor(regex: RegExp);
}
export declare class Command {
    name: string;
    args: CommandArgs;
    subCommands: Command[];
    showHelp?: boolean;
    constructor(name: string, args?: CommandArgs);
    exec: (context: Context, args: string[]) => void;
    pushSubCommand(command: Command): void;
}
export declare function parseCommand(text: string): {
    command: Command;
    lastSub: Command;
};
export {};
