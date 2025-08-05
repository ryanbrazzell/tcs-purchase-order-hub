import Dexie, { Table } from 'dexie';

export interface DraftPO {
  id?: string;
  updatedAt: Date;
  data: any; // This will be the full PurchaseOrder data
  customerCompanyName: string; // For indexing/searching
}

export interface CompletedPO {
  id?: string;
  createdAt: Date;
  poNumber: string;
  data: any; // This will be the full PurchaseOrder data
}

export class TCSDatabase extends Dexie {
  drafts!: Table<DraftPO>;
  completed!: Table<CompletedPO>;

  constructor() {
    super('TCSPurchaseOrders');
    this.version(1).stores({
      drafts: '++id, updatedAt, customerCompanyName',
      completed: '++id, createdAt, poNumber'
    });
  }
}

export const db = new TCSDatabase();

// Helper functions for common operations
export const dbHelpers = {
  // Save or update a draft
  async saveDraft(data: any): Promise<string> {
    const draft: DraftPO = {
      updatedAt: new Date(),
      data,
      customerCompanyName: data.customer?.companyName || 'Untitled'
    };
    
    if (data.id) {
      draft.id = data.id;
      await db.drafts.put(draft);
      return data.id;
    } else {
      const id = await db.drafts.add(draft);
      return String(id);
    }
  },

  // Get a draft by ID
  async getDraft(id: string): Promise<DraftPO | undefined> {
    return await db.drafts.get(id);
  },

  // Get all drafts sorted by most recent
  async getAllDrafts(): Promise<DraftPO[]> {
    return await db.drafts
      .orderBy('updatedAt')
      .reverse()
      .toArray();
  },

  // Delete a draft
  async deleteDraft(id: string): Promise<void> {
    await db.drafts.delete(id);
  },

  // Save a completed PO
  async saveCompleted(data: any): Promise<string> {
    const completed: CompletedPO = {
      createdAt: new Date(),
      poNumber: data.job?.poNumber || 'DRAFT',
      data
    };
    
    const id = await db.completed.add(completed);
    return String(id);
  },

  // Get all completed POs
  async getAllCompleted(): Promise<CompletedPO[]> {
    return await db.completed
      .orderBy('createdAt')
      .reverse()
      .toArray();
  },

  // Search completed POs by PO number
  async searchByPONumber(poNumber: string): Promise<CompletedPO[]> {
    return await db.completed
      .where('poNumber')
      .startsWithIgnoreCase(poNumber)
      .toArray();
  },

  // Clear all data (use with caution)
  async clearAll(): Promise<void> {
    await db.drafts.clear();
    await db.completed.clear();
  }
};