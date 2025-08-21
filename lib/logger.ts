export class Logger {
  private source: string;

  constructor(source: string) {
    this.source = source;
  }

  private async sendLog(level: string, message: string, data?: any) {
    // Log to console always
    const logFn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
    logFn(`[${this.source}] ${message}`, data || '');

    // Try to send to server
    try {
      await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: this.source,
          level,
          message,
          data
        })
      });
    } catch (err) {
      // Fallback to console logging if server logging fails
      console.warn(`[Logger] Failed to send log to server:`, err);
      console.log(`[${this.source}] ${level}: ${message}`, data);
    }
  }

  log(message: string, data?: any) {
    this.sendLog('log', message, data);
  }

  info(message: string, data?: any) {
    this.sendLog('info', message, data);
  }

  warn(message: string, data?: any) {
    this.sendLog('warn', message, data);
  }

  error(message: string, data?: any) {
    this.sendLog('error', message, data);
  }
}