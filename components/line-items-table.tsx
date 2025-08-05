'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { LineItem, TAX_RATE } from '@/types';
import { usePurchaseOrderStore } from '@/store/purchase-order';
import { cn } from '@/lib/cn';

export function LineItemsTable() {
  const { currentPO, updatePO } = usePurchaseOrderStore();
  const [lineItems, setLineItems] = useState<LineItem[]>(currentPO.lineItems || []);

  // Update store when line items change
  useEffect(() => {
    updatePO({ lineItems });
    calculateTotals();
  }, [lineItems]);

  const calculateTotals = () => {
    const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
    const tax = subtotal * TAX_RATE;
    const total = subtotal + tax;
    
    updatePO({
      subtotal,
      tax,
      total
    });
  };

  const addLineItem = () => {
    const newItem: LineItem = {
      description: '',
      quantity: 1,
      unit: 'each',
      unitPrice: 0,
      total: 0
    };
    setLineItems([...lineItems, newItem]);
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: any) => {
    const updatedItems = [...lineItems];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value
    };
    
    // Recalculate total for this line item
    if (field === 'quantity' || field === 'unitPrice') {
      updatedItems[index].total = updatedItems[index].quantity * updatedItems[index].unitPrice;
    }
    
    setLineItems(updatedItems);
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="bg-white rounded-lg border border-tcs-gray-200">
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-tcs-gray-900">Line Items</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addLineItem}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </div>

        {lineItems.length === 0 ? (
          <div className="text-center py-8 text-tcs-gray-500">
            No line items added yet. Click "Add Item" to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-tcs-gray-200">
                  <th className="text-left py-3 px-2 text-sm font-medium text-tcs-gray-700">Description</th>
                  <th className="text-center py-3 px-2 text-sm font-medium text-tcs-gray-700 w-24">Quantity</th>
                  <th className="text-center py-3 px-2 text-sm font-medium text-tcs-gray-700 w-24">Unit</th>
                  <th className="text-right py-3 px-2 text-sm font-medium text-tcs-gray-700 w-32">Unit Price</th>
                  <th className="text-right py-3 px-2 text-sm font-medium text-tcs-gray-700 w-32">Total</th>
                  <th className="w-12"></th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, index) => (
                  <tr key={index} className="border-b border-tcs-gray-100">
                    <td className="py-2 px-2">
                      <Input
                        value={item.description}
                        onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                        placeholder="Enter description"
                        className="w-full"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                        className="text-center"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <Input
                        value={item.unit}
                        onChange={(e) => updateLineItem(index, 'unit', e.target.value)}
                        placeholder="each"
                        className="text-center"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <Input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) => updateLineItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                        className="text-right"
                        placeholder="0.00"
                      />
                    </td>
                    <td className="py-2 px-2 text-right font-medium text-tcs-gray-900">
                      {formatCurrency(item.total)}
                    </td>
                    <td className="py-2 px-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeLineItem(index)}
                        className="hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Totals Section */}
      <div className="bg-tcs-gray-50 p-6 border-t border-tcs-gray-200">
        <div className="max-w-sm ml-auto space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-tcs-gray-700">Subtotal:</span>
            <span className="font-medium text-tcs-gray-900">{formatCurrency(currentPO.subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-tcs-gray-700">Tax ({(TAX_RATE * 100).toFixed(2)}%):</span>
            <span className="font-medium text-tcs-gray-900">{formatCurrency(currentPO.tax)}</span>
          </div>
          <div className="flex justify-between text-lg font-semibold pt-2 border-t border-tcs-gray-300">
            <span className="text-tcs-gray-900">Total:</span>
            <span className="text-tcs-blue-600">{formatCurrency(currentPO.total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}