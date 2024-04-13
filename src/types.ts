export interface LoggerFn {
    (msg: string): void;
    <T extends object>(obj: T): void;
}


export interface BaseLogger {
    /**
     * The current log level.
     * @type {'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' |'silent'}
     * @example
     * logger.level = 'debug';
     */
    level: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent';


    fatal: LoggerFn;

    error: LoggerFn;

    warn: LoggerFn;

    info: LoggerFn;

    debug: LoggerFn;

    trace: LoggerFn;
    
    /**
     * Noop function.
     */
    silent: LoggerFn;
}