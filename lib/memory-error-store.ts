// In-memory error storage for serverless environments
interface ErrorEntry {
  id: string;
  timestamp: string;
  source: string;
  error: any;
  context?: any;
}

// Global in-memory store (persists across requests in same instance)
const globalStore = global as any;
if (!globalStore.errorStore) {
  globalStore.errorStore = [];
}

export class MemoryErrorStore {
  static async add(source: string, error: any, context?: any) {
    const entry: ErrorEntry = {
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

    globalStore.errorStore.push(entry);
    
    // Keep only last 50 errors
    if (globalStore.errorStore.length > 50) {
      globalStore.errorStore = globalStore.errorStore.slice(-50);
    }

    console.error(`[MemoryErrorStore] ${source}:`, error);
    return entry;
  }

  static getAll(): ErrorEntry[] {
    return globalStore.errorStore || [];
  }

  static getRecent(minutes: number = 5): ErrorEntry[] {
    const since = new Date(Date.now() - minutes * 60 * 1000);
    return this.getAll().filter(e => new Date(e.timestamp) > since);
  }

  static clear() {
    globalStore.errorStore = [];
  }
}