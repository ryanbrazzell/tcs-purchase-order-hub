'use client';

import { useEffect, useState } from 'react';

interface LoadingProgressProps {
  isLoading: boolean;
  stage?: 'uploading' | 'extracting' | 'processing' | 'complete';
}

export function LoadingProgress({ isLoading, stage = 'uploading' }: LoadingProgressProps) {
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    if (!isLoading) {
      setProgress(0);
      return;
    }
    
    // Simulate progress based on stage
    const stages = {
      uploading: { start: 0, end: 30, duration: 1000 },
      extracting: { start: 30, end: 60, duration: 2000 },
      processing: { start: 60, end: 95, duration: 3000 },
      complete: { start: 95, end: 100, duration: 500 }
    };
    
    const currentStage = stages[stage];
    let currentProgress = currentStage.start;
    
    const interval = setInterval(() => {
      if (currentProgress < currentStage.end) {
        const increment = (currentStage.end - currentStage.start) / (currentStage.duration / 100);
        currentProgress = Math.min(currentProgress + increment, currentStage.end);
        setProgress(currentProgress);
      }
    }, 100);
    
    return () => clearInterval(interval);
  }, [isLoading, stage]);
  
  const getStageText = () => {
    switch (stage) {
      case 'uploading':
        return 'Uploading PDF...';
      case 'extracting':
        return 'Extracting text from PDF...';
      case 'processing':
        return 'Processing with AI...';
      case 'complete':
        return 'Almost done...';
      default:
        return 'Processing...';
    }
  };
  
  if (!isLoading) return null;
  
  return (
    <div className="mt-4">
      <div className="bg-tcs-blue-100 rounded-full h-2 overflow-hidden">
        <div 
          className="bg-tcs-blue-600 h-full rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex justify-between items-center mt-2">
        <p className="text-sm text-tcs-gray-600">{getStageText()}</p>
        <p className="text-sm text-tcs-gray-600">{Math.round(progress)}%</p>
      </div>
    </div>
  );
}