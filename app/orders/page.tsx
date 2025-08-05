'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { dbHelpers, DraftPO, CompletedPO } from '@/lib/db';
import { usePurchaseOrderStore } from '@/store/purchase-order';
import { FileText, Edit, Trash2, Calendar, Building, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function OrdersPage() {
  const router = useRouter();
  const { loadDraft } = usePurchaseOrderStore();
  const [drafts, setDrafts] = useState<DraftPO[]>([]);
  const [completed, setCompleted] = useState<CompletedPO[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'drafts' | 'completed'>('drafts');

  // Load orders on mount
  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const [draftOrders, completedOrders] = await Promise.all([
        dbHelpers.getAllDrafts(),
        dbHelpers.getAllCompleted()
      ]);
      setDrafts(draftOrders);
      setCompleted(completedOrders);
    } catch (error) {
      console.error('Failed to load orders:', error);
      toast.error('Failed to load orders');
    }
  };

  const handleEditDraft = async (draft: DraftPO) => {
    try {
      await loadDraft(draft.id!);
      router.push('/');
    } catch (error) {
      toast.error('Failed to load draft');
    }
  };

  const handleDeleteDraft = async (id: string) => {
    if (!confirm('Are you sure you want to delete this draft?')) return;
    
    try {
      await dbHelpers.deleteDraft(id);
      await loadOrders();
      toast.success('Draft deleted');
    } catch (error) {
      toast.error('Failed to delete draft');
    }
  };

  const handleSearchCompleted = async (term: string) => {
    setSearchTerm(term);
    
    if (!term.trim()) {
      await loadOrders();
      return;
    }
    
    try {
      if (term.match(/^[A-Z0-9-]+$/i)) {
        // Search by PO number
        const results = await dbHelpers.searchByPONumber(term);
        setCompleted(results);
      } else {
        // Filter by customer name
        const allCompleted = await dbHelpers.getAllCompleted();
        const filtered = allCompleted.filter(po =>
          po.data.customer?.companyName?.toLowerCase().includes(term.toLowerCase())
        );
        setCompleted(filtered);
      }
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  const formatDate = (date: Date | string) => {
    return format(new Date(date), 'MMM dd, yyyy');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-tcs-gray-900 mb-2">
          Purchase Orders
        </h1>
        <p className="text-tcs-gray-600">
          View and manage your draft and completed purchase orders
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-tcs-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('drafts')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'drafts'
                  ? 'border-tcs-blue-500 text-tcs-blue-600'
                  : 'border-transparent text-tcs-gray-500 hover:text-tcs-gray-700 hover:border-tcs-gray-300'
              }`}
            >
              Drafts ({drafts.length})
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'completed'
                  ? 'border-tcs-blue-500 text-tcs-blue-600'
                  : 'border-transparent text-tcs-gray-500 hover:text-tcs-gray-700 hover:border-tcs-gray-300'
              }`}
            >
              Completed ({completed.length})
            </button>
          </nav>
        </div>
      </div>

      {/* Search Bar (for completed orders) */}
      {activeTab === 'completed' && (
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-tcs-gray-400 w-5 h-5" />
            <Input
              type="search"
              placeholder="Search by PO number or customer name..."
              value={searchTerm}
              onChange={(e) => handleSearchCompleted(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="bg-white rounded-lg shadow-sm">
        {activeTab === 'drafts' ? (
          // Drafts Tab
          drafts.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-12 h-12 text-tcs-gray-400 mx-auto mb-4" />
              <p className="text-tcs-gray-600 mb-4">No drafts found</p>
              <Button onClick={() => router.push('/')}>
                Create New PO
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-tcs-gray-200">
              {drafts.map((draft) => (
                <div key={draft.id} className="p-6 hover:bg-tcs-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-tcs-gray-900">
                        {draft.customerCompanyName || 'Untitled Draft'}
                      </h3>
                      <div className="mt-1 flex items-center space-x-4 text-sm text-tcs-gray-600">
                        <span className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          Last updated: {formatDate(draft.updatedAt)}
                        </span>
                        {draft.data.customer?.jobLocation && (
                          <span className="flex items-center">
                            <Building className="w-4 h-4 mr-1" />
                            {draft.data.customer.jobLocation}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditDraft(draft)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteDraft(draft.id!)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          // Completed Tab
          completed.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-12 h-12 text-tcs-gray-400 mx-auto mb-4" />
              <p className="text-tcs-gray-600">
                {searchTerm ? 'No results found' : 'No completed orders yet'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-tcs-gray-200">
              {completed.map((order) => (
                <div key={order.id} className="p-6 hover:bg-tcs-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-medium text-tcs-gray-900">
                          PO #{order.poNumber}
                        </h3>
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                          Completed
                        </span>
                      </div>
                      <div className="mt-1 text-sm text-tcs-gray-600">
                        {order.data.customer?.companyName || 'Unknown Customer'}
                      </div>
                      <div className="mt-2 flex items-center space-x-4 text-sm text-tcs-gray-600">
                        <span className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {formatDate(order.createdAt)}
                        </span>
                        <span className="font-medium text-tcs-gray-900">
                          {formatCurrency(order.data.total || 0)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          // Generate and download PDF
                          try {
                            const response = await fetch('/api/generate-pdf', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify(order.data)
                            });
                            
                            if (!response.ok) throw new Error('Failed to generate PDF');
                            
                            const blob = await response.blob();
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `PO-${order.poNumber}.pdf`;
                            document.body.appendChild(a);
                            a.click();
                            window.URL.revokeObjectURL(url);
                            document.body.removeChild(a);
                          } catch (error) {
                            toast.error('Failed to download PDF');
                          }
                        }}
                      >
                        Download PDF
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        )}
      </div>
    </div>
  );
}