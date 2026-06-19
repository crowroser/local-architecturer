export class Logger {
  private prefix: string;

  constructor(prefix: string = '') {
    this.prefix = prefix;
  }

  info(message: string): void {
    console.log(`${this.prefix}${message}`);
  }

  warn(message: string): void {
    console.warn(`${this.prefix}⚠️ ${message}`);
  }

  error(message: string): void {
    console.error(`${this.prefix}❌ ${message}`);
  }

  success(message: string): void {
    console.log(`${this.prefix}✅ ${message}`);
  }

  debug(message: string): void {
    if (process.env.DEBUG) {
      console.log(`${this.prefix}🔍 ${message}`);
    }
  }
}
