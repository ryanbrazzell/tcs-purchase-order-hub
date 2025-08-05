import { create } from 'zustand';
import { dbHelpers } from '@/lib/db';
import toast from 'react-hot-toast';

interface PurchaseOrderState {
  // Current PO data
  currentPO: any;
  isDirty: boolean;
  lastSaved: Date | null;
  autoSaveTimer: NodeJS.Timeout | null;
  
  // Actions
  setPO: (data: any) => void;
  updatePO: (updates: any) => void;
  saveDraft: () => Promise<void>;
  loadDraft: (id: string) => Promise<void>;
  resetPO: () => void;
  markClean: () => void;
  
  // Auto-save
  startAutoSave: () => void;
  stopAutoSave: () => void;
}

const initialPO = {
  customer: {
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    jobLocation: '',
    onsiteContactName: '',
    onsiteContactPhone: ''
  },
  contractor: {
    companyName: '',
    technicianName: '',
    email: '',
    phone: ''
  },
  job: {
    poNumber: '',
    requestedServiceDate: '',
    squareFootage: 0,
    floorType: '',
    description: '',
    additionalNotes: ''
  },
  lineItems: [],
  subtotal: 0,
  tax: 0,
  total: 0,
  standardTerms: {
    paymentTerms: 'Net 30 with customer funds',
    photoRequirement: '30 Before and After Pics required',
    signOffRequired: 'Sign off required by customer for payment',
    workersCompNote: 'All workers on jobsite to be referred to as "TCS employees"'
  }
};

export const usePurchaseOrderStore = create<PurchaseOrderState>((set, get) => ({
  currentPO: initialPO,
  isDirty: false,
  lastSaved: null,
  autoSaveTimer: null,
  
  setPO: (data) => set((state) => ({
    currentPO: data,
    isDirty: true
  })),
  
  updatePO: (updates) => set((state) => ({
    currentPO: { ...state.currentPO, ...updates },
    isDirty: true
  })),
  
  saveDraft: async () => {
    const state = get();
    try {
      const id = await dbHelpers.saveDraft(state.currentPO);
      set({
        currentPO: { ...state.currentPO, id },
        isDirty: false,
        lastSaved: new Date()
      });
      toast.success('Draft saved');
    } catch (error) {
      console.error('Failed to save draft:', error);
      toast.error('Failed to save draft');
    }
  },
  
  loadDraft: async (id) => {
    try {
      const draft = await dbHelpers.getDraft(id);
      if (draft) {
        set({
          currentPO: { ...draft.data, id },
          isDirty: false,
          lastSaved: draft.updatedAt
        });
        toast.success('Draft loaded');
      }
    } catch (error) {
      console.error('Failed to load draft:', error);
      toast.error('Failed to load draft');
    }
  },
  
  resetPO: () => {
    const state = get();
    state.stopAutoSave();
    set({
      currentPO: initialPO,
      isDirty: false,
      lastSaved: null
    });
  },
  
  markClean: () => set({ isDirty: false }),
  
  startAutoSave: () => {
    const state = get();
    
    // Clear existing timer
    if (state.autoSaveTimer) {
      clearInterval(state.autoSaveTimer);
    }
    
    // Set up new timer for auto-save every 10 seconds
    const timer = setInterval(() => {
      const currentState = get();
      if (currentState.isDirty) {
        currentState.saveDraft();
      }
    }, 10000);
    
    set({ autoSaveTimer: timer });
  },
  
  stopAutoSave: () => {
    const state = get();
    if (state.autoSaveTimer) {
      clearInterval(state.autoSaveTimer);
      set({ autoSaveTimer: null });
    }
  }
}));

// Helper hook for calculating totals
export const useCalculatedTotals = () => {
  const { currentPO, updatePO } = usePurchaseOrderStore();
  
  const calculateTotals = () => {
    const subtotal = currentPO.lineItems.reduce((sum: number, item: any) => 
      sum + (item.quantity * item.unitPrice), 0
    );
    const tax = subtotal * 0.0825; // 8.25% tax rate (configurable)
    const total = subtotal + tax;
    
    updatePO({
      subtotal,
      tax,
      total
    });
  };
  
  return { calculateTotals };
};