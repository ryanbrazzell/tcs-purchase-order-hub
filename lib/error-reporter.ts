import fs from 'fs';
import path from 'path';

const ERROR_FILE = path.join(process.cwd(), 'errors.json');

export interface ErrorReport {
  id: string;
  timestamp: string;
  source: string;
  error: any;
  context?: any;
}

export class ErrorReporter {
  static async report(source: string, error: any, context?: any) {
    const report: ErrorReport = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      source,
      error: {
        message: error?.message || String(error),
        stack: error?.stack,
        type: error?.constructor?.name,
        ...error
      },
      context
    };

    try {
      // Read existing errors
      let errors: ErrorReport[] = [];
      if (fs.existsSync(ERROR_FILE)) {
        const content = fs.readFileSync(ERROR_FILE, 'utf-8');
        try {
          errors = JSON.parse(content);
        } catch (e) {
          errors = [];
        }
      }

      // Add new error
      errors.push(report);

      // Keep only last 100 errors
      if (errors.length > 100) {
        errors = errors.slice(-100);
      }

      // Write back
      fs.writeFileSync(ERROR_FILE, JSON.stringify(errors, null, 2));

      console.error(`[ErrorReporter] Reported error from ${source}:`, error);
    } catch (e) {
      console.error('[ErrorReporter] Failed to write error:', e);
    }

    return report;
  }

  static async getErrors(since?: string, source?: string): Promise<ErrorReport[]> {
    try {
      if (!fs.existsSync(ERROR_FILE)) {
        return [];
      }

      const content = fs.readFileSync(ERROR_FILE, 'utf-8');
      let errors: ErrorReport[] = JSON.parse(content);

      if (since) {
        const sinceDate = new Date(since);
        errors = errors.filter(e => new Date(e.timestamp) > sinceDate);
      }

      if (source) {
        errors = errors.filter(e => e.source === source);
      }

      return errors;
    } catch (e) {
      console.error('[ErrorReporter] Failed to read errors:', e);
      return [];
    }
  }

  static async clearErrors() {
    try {
      if (fs.existsSync(ERROR_FILE)) {
        fs.unlinkSync(ERROR_FILE);
      }
    } catch (e) {
      console.error('[ErrorReporter] Failed to clear errors:', e);
    }
  }
}