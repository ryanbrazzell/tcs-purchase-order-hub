'use client';

import { useCallback, useState } from 'react';
import { Upload, FileText, X, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/cn';
import { MAX_FILE_SIZE, ALLOWED_FILE_TYPES } from '@/types';
import { FileError, handleError } from '@/lib/errors';
import { LoadingProgress } from './loading-progress';
import toast from 'react-hot-toast';

interface PDFUploadProps {
  onFileSelect: (file: File) => void;
  isLoading?: boolean;
  loadingStage?: 'uploading' | 'extracting' | 'processing' | 'complete';
  className?: string;
}

export function PDFUpload({ onFileSelect, isLoading = false, loadingStage = 'uploading', className }: PDFUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const validateFile = (file: File): void => {
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      throw new FileError('Please upload a PDF file');
    }
    
    if (file.size > MAX_FILE_SIZE) {
      throw new FileError('File size must be less than 10MB');
    }
  };

  const handleFile = useCallback((file: File) => {
    try {
      validateFile(file);
      setSelectedFile(file);
      onFileSelect(file);
    } catch (error) {
      handleError(error);
    }
  }, [onFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const removeFile = useCallback(() => {
    setSelectedFile(null);
  }, []);

  return (
    <div className={cn('w-full', className)}>
      {!selectedFile ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'relative border-2 border-dashed rounded-lg p-8 text-center transition-all',
            'hover:border-tcs-blue-400 hover:bg-tcs-blue-50/50',
            isDragging ? 'border-tcs-blue-500 bg-tcs-blue-50' : 'border-tcs-gray-300',
            isLoading && 'opacity-50 cursor-not-allowed'
          )}
        >
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileInput}
            disabled={isLoading}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            aria-label="Upload PDF file"
          />
          
          <div className="flex flex-col items-center space-y-4">
            <div className={cn(
              'w-16 h-16 rounded-full flex items-center justify-center',
              isDragging ? 'bg-tcs-blue-100' : 'bg-tcs-gray-100'
            )}>
              <Upload className={cn(
                'w-8 h-8',
                isDragging ? 'text-tcs-blue-600' : 'text-tcs-gray-600'
              )} />
            </div>
            
            <div>
              <p className="text-lg font-medium text-tcs-gray-900">
                Drop your PDF here or click to browse
              </p>
              <p className="text-sm text-tcs-gray-600 mt-1">
                Maximum file size: 10MB
              </p>
            </div>
            
            <div className="flex items-center space-x-2 text-sm text-tcs-gray-500">
              <AlertCircle className="w-4 h-4" />
              <span>Supported: Customer proposals or existing purchase orders</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="border border-tcs-gray-200 rounded-lg p-4 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-tcs-blue-100 flex items-center justify-center">
                <FileText className="w-5 h-5 text-tcs-blue-600" />
              </div>
              <div>
                <p className="font-medium text-tcs-gray-900">{selectedFile.name}</p>
                <p className="text-sm text-tcs-gray-600">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            
            {!isLoading && (
              <button
                onClick={removeFile}
                className="p-1 rounded-lg hover:bg-tcs-gray-100 transition-colors"
                aria-label="Remove file"
              >
                <X className="w-5 h-5 text-tcs-gray-600" />
              </button>
            )}
          </div>
          
          {isLoading && (
            <LoadingProgress isLoading={isLoading} stage={loadingStage} />
          )}
        </div>
      )}
    </div>
  );
}