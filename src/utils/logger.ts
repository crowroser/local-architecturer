export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  prefix: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface LoggerOptions {
  level?: LogLevel;
  structured?: boolean;
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export class Logger {
  private prefix: string;
  private level: LogLevel;
  private structured: boolean;

  constructor(prefix: string = '', options?: LoggerOptions) {
    this.prefix = prefix;
    this.level = options?.level ?? (process.env.DEBUG ? 'debug' : 'info');
    this.structured = options?.structured ?? (process.env.LOG_FORMAT === 'json');
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.level];
  }

  private formatMessage(level: LogLevel, message: string, metadata?: Record<string, unknown>): string {
    if (this.structured) {
      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level,
        prefix: this.prefix,
        message,
        metadata,
      };
      return JSON.stringify(entry);
    }

    const icons: Record<LogLevel, string> = {
      debug: '🔍',
      info: '',
      warn: '⚠️',
      error: '❌',
    };

    const icon = icons[level];
    return icon ? `${this.prefix}${icon} ${message}` : `${this.prefix}${message}`;
  }

  info(message: string, metadata?: Record<string, unknown>): void {
    if (!this.shouldLog('info')) return;
    console.log(this.formatMessage('info', message, metadata));
  }

  warn(message: string, metadata?: Record<string, unknown>): void {
    if (!this.shouldLog('warn')) return;
    console.warn(this.formatMessage('warn', message, metadata));
  }

  error(message: string, metadata?: Record<string, unknown>): void {
    if (!this.shouldLog('error')) return;
    console.error(this.formatMessage('error', message, metadata));
  }

  success(message: string, metadata?: Record<string, unknown>): void {
    if (!this.shouldLog('info')) return;
    console.log(this.formatMessage('info', `✅ ${message}`, metadata));
  }

  debug(message: string, metadata?: Record<string, unknown>): void {
    if (!this.shouldLog('debug')) return;
    console.log(this.formatMessage('debug', message, metadata));
  }

  child(prefix: string): Logger {
    return new Logger(`${this.prefix}${prefix}`, {
      level: this.level,
      structured: this.structured,
    });
  }
}
