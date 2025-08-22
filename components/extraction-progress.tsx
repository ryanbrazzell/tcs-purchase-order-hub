'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Brain, Search, CheckCircle, Loader2 } from 'lucide-react';

interface ExtractionProgressProps {
  isVisible: boolean;
  onComplete?: () => void;
}

interface ProgressStage {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<any>;
  duration: number; // in seconds
  color: string;
}

const progressStages: ProgressStage[] = [
  {
    id: 'upload',
    label: 'Processing PDF',
    description: 'Reading document structure and extracting text...',
    icon: FileText,
    duration: 3,
    color: 'text-blue-500'
  },
  {
    id: 'analyze',
    label: 'AI Analysis',
    description: 'Identifying package selections and service details...',
    icon: Brain,
    duration: 8,
    color: 'text-purple-500'
  },
  {
    id: 'extract',
    label: 'Data Extraction',
    description: 'Converting proposal into subcontractor work orders...',
    icon: Search,
    duration: 4,
    color: 'text-orange-500'
  },
  {
    id: 'complete',
    label: 'Complete',
    description: 'Ready to review and generate purchase order!',
    icon: CheckCircle,
    duration: 1,
    color: 'text-green-500'
  }
];

export function ExtractionProgress({ isVisible, onComplete }: ExtractionProgressProps) {
  const [currentStage, setCurrentStage] = useState(0);
  const [progress, setProgress] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasStartedRef = useRef(false);

  // Memoize the onComplete callback to prevent unnecessary re-renders
  const stableOnComplete = useCallback(() => {
    onComplete?.();
  }, [onComplete]);

  useEffect(() => {
    if (!isVisible) {
      // Reset state when hiding and clear any running interval
      setCurrentStage(0);
      setProgress(0);
      setTimeRemaining(0);
      hasStartedRef.current = false;
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Prevent multiple starts
    if (hasStartedRef.current) {
      return;
    }
    
    hasStartedRef.current = true;

    // Calculate total duration
    const totalDuration = progressStages.reduce((sum, stage) => sum + stage.duration, 0);
    setTimeRemaining(totalDuration);

    let elapsedTime = 0;
    intervalRef.current = setInterval(() => {
      elapsedTime += 0.1;
      
      // Calculate which stage we're in
      let cumulativeDuration = 0;
      let stageIndex = 0;
      
      for (let i = 0; i < progressStages.length; i++) {
        if (elapsedTime <= cumulativeDuration + progressStages[i].duration) {
          stageIndex = i;
          break;
        }
        cumulativeDuration += progressStages[i].duration;
      }

      // Update state in batch to prevent multiple re-renders
      setCurrentStage(stageIndex);
      setProgress(Math.min((elapsedTime / totalDuration) * 100, 100));
      setTimeRemaining(Math.max(totalDuration - elapsedTime, 0));

      // Complete when done
      if (elapsedTime >= totalDuration) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setTimeout(() => {
          stableOnComplete();
          hasStartedRef.current = false; // Reset for next time
        }, 500);
      }
    }, 100);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isVisible, stableOnComplete]);

  if (!isVisible) return null;

  const currentStageData = progressStages[currentStage];
  const Icon = currentStageData?.icon || Loader2;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      >
        <motion.div
          initial={{ y: 20 }}
          animate={{ y: 0 }}
          className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              animate={{ rotate: currentStage === 3 ? 0 : 360 }}
              transition={{ duration: 2, repeat: currentStage === 3 ? 0 : Infinity, ease: "linear" }}
              className="inline-block mb-4"
            >
              <Icon className={`w-12 h-12 ${currentStageData?.color || 'text-gray-500'}`} />
            </motion.div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              {currentStageData?.label || 'Processing...'}
            </h3>
            <p className="text-sm text-gray-600">
              {currentStageData?.description || 'Please wait...'}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <motion.div
                className="h-3 bg-gradient-to-r from-blue-500 via-purple-500 to-green-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* Time Remaining */}
          <div className="text-center mb-6">
            <span className="text-sm text-gray-600">
              Estimated time remaining: {' '}
              <span className="font-semibold text-gray-800">
                {Math.ceil(timeRemaining)}s
              </span>
            </span>
          </div>

          {/* Stage Indicators */}
          <div className="flex justify-between">
            {progressStages.map((stage, index) => {
              const StageIcon = stage.icon;
              const isActive = index === currentStage;
              const isComplete = index < currentStage;
              
              return (
                <motion.div
                  key={stage.id}
                  className="flex flex-col items-center"
                  animate={{
                    scale: isActive ? 1.1 : 1,
                    opacity: isComplete || isActive ? 1 : 0.4
                  }}
                  transition={{ duration: 0.3 }}
                >
                  <div
                    className={
                      isComplete 
                        ? 'w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-colors bg-green-100 text-green-600' 
                        : isActive 
                          ? `w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-colors ${stage.color === 'text-blue-500' ? 'bg-blue-100 text-blue-500' : stage.color === 'text-purple-500' ? 'bg-purple-100 text-purple-500' : stage.color === 'text-orange-500' ? 'bg-orange-100 text-orange-500' : 'bg-green-100 text-green-500'}`
                          : 'w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-colors bg-gray-100 text-gray-400'
                    }
                  >
                    <StageIcon className="w-5 h-5" />
                  </div>
                  <span className="text-xs text-center text-gray-600 max-w-16">
                    {stage.label}
                  </span>
                </motion.div>
              );
            })}
          </div>

          {/* Fun Facts During Long Processing */}
          <AnimatePresence mode="wait">
            {currentStage === 1 && ( // During AI Analysis
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-6 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400"
              >
                <p className="text-sm text-blue-700">
                  <span className="font-semibold">💡 Did you know?</span> Our AI reads thousands of floor service proposals to understand exactly what your customers selected and transforms it into detailed work instructions for subcontractors.
                </p>
              </motion.div>
            )}
            
            {currentStage === 2 && ( // During Data Extraction
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-6 p-4 bg-orange-50 rounded-lg border-l-4 border-orange-400"
              >
                <p className="text-sm text-orange-700">
                  <span className="font-semibold">⚡ Processing:</span> Extracting site logistics, timing requirements, material specs, and all the critical details your subcontractors need for a perfect job.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}