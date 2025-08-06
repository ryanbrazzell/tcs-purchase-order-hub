'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PurchaseOrder, PurchaseOrderSchema } from '@/types';
import { usePurchaseOrderStore, useCalculatedTotals } from '@/store/purchase-order';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { LineItemsTable } from '@/components/line-items-table';
import { Save, Download, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

interface PurchaseOrderFormProps {
  initialData?: Partial<PurchaseOrder>;
  onSubmit?: (data: PurchaseOrder) => void;
}

export function PurchaseOrderForm({ initialData, onSubmit }: PurchaseOrderFormProps) {
  const { currentPO, setPO, updatePO, saveDraft, startAutoSave, stopAutoSave } = usePurchaseOrderStore();
  const { calculateTotals } = useCalculatedTotals();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<PurchaseOrder>({
    resolver: zodResolver(PurchaseOrderSchema),
    defaultValues: currentPO
  });

  // Start auto-save when component mounts
  useEffect(() => {
    startAutoSave();
    return () => stopAutoSave();
  }, [startAutoSave, stopAutoSave]);

  // Update store when form values change
  useEffect(() => {
    const subscription = watch((value) => {
      updatePO(value);
    });
    return () => subscription.unsubscribe();
  }, [watch, updatePO]);

  // Initialize with provided data
  useEffect(() => {
    if (initialData) {
      
      // Merge the initial data with current PO
      const mergedData = {
        ...currentPO,
        ...initialData,
        customer: { ...currentPO.customer, ...initialData.customer },
        contractor: { ...currentPO.contractor, ...initialData.contractor },
        job: { ...currentPO.job, ...initialData.job },
        lineItems: initialData.lineItems || currentPO.lineItems
      };
      
      // Update both the store and the form
      setPO(mergedData);
      reset(mergedData);
    }
  }, [initialData, setPO, reset]);

  const onFormSubmit = async (data: PurchaseOrder) => {
    try {
      calculateTotals();
      await saveDraft();
      
      if (onSubmit) {
        onSubmit(data);
      } else {
        // Generate PDF
        const response = await fetch('/api/generate-pdf', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(currentPO)
        });

        if (!response.ok) {
          throw new Error('Failed to generate PDF');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `PO-${currentPO.job.poNumber || 'draft'}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast.success('Purchase order generated successfully!');
      }
    } catch (error) {
      console.error('Form submission error:', error);
      toast.error('Failed to process purchase order');
    }
  };

  const handleSaveDraft = async () => {
    try {
      await saveDraft();
      toast.success('Draft saved successfully');
    } catch (error) {
      toast.error('Failed to save draft');
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-8">
      {/* Customer Information */}
      <div className="bg-white rounded-lg border border-tcs-gray-200 p-6">
        <h2 className="text-xl font-semibold text-tcs-gray-900 mb-4">Customer Information</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="customer.companyName">Company Name *</Label>
            <Input
              id="customer.companyName"
              {...register('customer.companyName')}
              className={errors.customer?.companyName ? 'border-red-500' : ''}
            />
            {errors.customer?.companyName && (
              <p className="text-sm text-red-600 mt-1">{errors.customer.companyName.message}</p>
            )}
          </div>
          
          <div>
            <Label htmlFor="customer.contactName">Contact Name *</Label>
            <Input
              id="customer.contactName"
              {...register('customer.contactName')}
              className={errors.customer?.contactName ? 'border-red-500' : ''}
            />
            {errors.customer?.contactName && (
              <p className="text-sm text-red-600 mt-1">{errors.customer.contactName.message}</p>
            )}
          </div>
          
          <div>
            <Label htmlFor="customer.email">Email *</Label>
            <Input
              id="customer.email"
              type="email"
              {...register('customer.email')}
              className={errors.customer?.email ? 'border-red-500' : ''}
            />
            {errors.customer?.email && (
              <p className="text-sm text-red-600 mt-1">{errors.customer.email.message}</p>
            )}
          </div>
          
          <div>
            <Label htmlFor="customer.phone">Phone *</Label>
            <Input
              id="customer.phone"
              placeholder="555-555-5555"
              {...register('customer.phone')}
              className={errors.customer?.phone ? 'border-red-500' : ''}
            />
            {errors.customer?.phone && (
              <p className="text-sm text-red-600 mt-1">{errors.customer.phone.message}</p>
            )}
          </div>
          
          <div className="col-span-2">
            <Label htmlFor="customer.jobLocation">Job Location *</Label>
            <Input
              id="customer.jobLocation"
              {...register('customer.jobLocation')}
              className={errors.customer?.jobLocation ? 'border-red-500' : ''}
            />
            {errors.customer?.jobLocation && (
              <p className="text-sm text-red-600 mt-1">{errors.customer.jobLocation.message}</p>
            )}
          </div>
          
          <div>
            <Label htmlFor="customer.onsiteContactName">Onsite Contact Name *</Label>
            <Input
              id="customer.onsiteContactName"
              {...register('customer.onsiteContactName')}
              className={errors.customer?.onsiteContactName ? 'border-red-500' : ''}
            />
            {errors.customer?.onsiteContactName && (
              <p className="text-sm text-red-600 mt-1">{errors.customer.onsiteContactName.message}</p>
            )}
          </div>
          
          <div>
            <Label htmlFor="customer.onsiteContactPhone">Onsite Contact Phone *</Label>
            <Input
              id="customer.onsiteContactPhone"
              placeholder="555-555-5555"
              {...register('customer.onsiteContactPhone')}
              className={errors.customer?.onsiteContactPhone ? 'border-red-500' : ''}
            />
            {errors.customer?.onsiteContactPhone && (
              <p className="text-sm text-red-600 mt-1">{errors.customer.onsiteContactPhone.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Contractor Information */}
      <div className="bg-white rounded-lg border border-tcs-gray-200 p-6">
        <h2 className="text-xl font-semibold text-tcs-gray-900 mb-4">Contractor Information</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="contractor.companyName">Company Name *</Label>
            <Input
              id="contractor.companyName"
              {...register('contractor.companyName')}
              className={errors.contractor?.companyName ? 'border-red-500' : ''}
            />
            {errors.contractor?.companyName && (
              <p className="text-sm text-red-600 mt-1">{errors.contractor.companyName.message}</p>
            )}
          </div>
          
          <div>
            <Label htmlFor="contractor.technicianName">Technician Name *</Label>
            <Input
              id="contractor.technicianName"
              {...register('contractor.technicianName')}
              className={errors.contractor?.technicianName ? 'border-red-500' : ''}
            />
            {errors.contractor?.technicianName && (
              <p className="text-sm text-red-600 mt-1">{errors.contractor.technicianName.message}</p>
            )}
          </div>
          
          <div>
            <Label htmlFor="contractor.email">Email *</Label>
            <Input
              id="contractor.email"
              type="email"
              {...register('contractor.email')}
              className={errors.contractor?.email ? 'border-red-500' : ''}
            />
            {errors.contractor?.email && (
              <p className="text-sm text-red-600 mt-1">{errors.contractor.email.message}</p>
            )}
          </div>
          
          <div>
            <Label htmlFor="contractor.phone">Phone *</Label>
            <Input
              id="contractor.phone"
              placeholder="555-555-5555"
              {...register('contractor.phone')}
              className={errors.contractor?.phone ? 'border-red-500' : ''}
            />
            {errors.contractor?.phone && (
              <p className="text-sm text-red-600 mt-1">{errors.contractor.phone.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Job Details */}
      <div className="bg-white rounded-lg border border-tcs-gray-200 p-6">
        <h2 className="text-xl font-semibold text-tcs-gray-900 mb-4">Job Details</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="job.poNumber">PO Number *</Label>
            <Input
              id="job.poNumber"
              {...register('job.poNumber')}
              className={errors.job?.poNumber ? 'border-red-500' : ''}
            />
            {errors.job?.poNumber && (
              <p className="text-sm text-red-600 mt-1">{errors.job.poNumber.message}</p>
            )}
          </div>
          
          <div>
            <Label htmlFor="job.requestedServiceDate">Requested Service Date *</Label>
            <Input
              id="job.requestedServiceDate"
              type="date"
              {...register('job.requestedServiceDate')}
              className={errors.job?.requestedServiceDate ? 'border-red-500' : ''}
            />
            {errors.job?.requestedServiceDate && (
              <p className="text-sm text-red-600 mt-1">{errors.job.requestedServiceDate.message}</p>
            )}
          </div>
          
          <div>
            <Label htmlFor="job.squareFootage">Square Footage *</Label>
            <Input
              id="job.squareFootage"
              type="number"
              {...register('job.squareFootage', { valueAsNumber: true })}
              className={errors.job?.squareFootage ? 'border-red-500' : ''}
            />
            {errors.job?.squareFootage && (
              <p className="text-sm text-red-600 mt-1">{errors.job.squareFootage.message}</p>
            )}
          </div>
          
          <div>
            <Label htmlFor="job.floorType">Floor Type *</Label>
            <Input
              id="job.floorType"
              {...register('job.floorType')}
              className={errors.job?.floorType ? 'border-red-500' : ''}
            />
            {errors.job?.floorType && (
              <p className="text-sm text-red-600 mt-1">{errors.job.floorType.message}</p>
            )}
          </div>
          
          <div className="col-span-2">
            <Label htmlFor="job.description">Job Description *</Label>
            <Textarea
              id="job.description"
              {...register('job.description')}
              className={errors.job?.description ? 'border-red-500' : ''}
              rows={3}
            />
            {errors.job?.description && (
              <p className="text-sm text-red-600 mt-1">{errors.job.description.message}</p>
            )}
          </div>
          
          <div className="col-span-2">
            <Label htmlFor="job.additionalNotes">Additional Notes</Label>
            <Textarea
              id="job.additionalNotes"
              {...register('job.additionalNotes')}
              rows={3}
            />
          </div>
        </div>
      </div>

      {/* Line Items */}
      <LineItemsTable />

      {/* Standard Terms */}
      <div className="bg-white rounded-lg border border-tcs-gray-200 p-6">
        <h2 className="text-xl font-semibold text-tcs-gray-900 mb-4">Standard Terms</h2>
        <div className="space-y-2 text-sm text-tcs-gray-700">
          <p>• {currentPO.standardTerms.paymentTerms}</p>
          <p>• {currentPO.standardTerms.photoRequirement}</p>
          <p>• {currentPO.standardTerms.signOffRequired}</p>
          <p>• {currentPO.standardTerms.workersCompNote}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <div className="flex space-x-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleSaveDraft}
            disabled={isSubmitting}
          >
            <Save className="w-4 h-4 mr-2" />
            Save Draft
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => window.location.reload()}
            disabled={isSubmitting}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset
          </Button>
        </div>
        
        <Button type="submit" disabled={isSubmitting}>
          <Download className="w-4 h-4 mr-2" />
          Generate PDF
        </Button>
      </div>
    </form>
  );
}