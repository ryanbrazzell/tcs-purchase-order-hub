'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Play, Pause, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

interface VoiceRecorderCompactProps {
  onRecordingComplete: (blob: Blob) => void;
  onRecordingDeleted: () => void;
  isUploading?: boolean;
}

export function VoiceRecorderCompact({ 
  onRecordingComplete, 
  onRecordingDeleted, 
  isUploading = false 
}: VoiceRecorderCompactProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000
        } 
      });
      
      streamRef.current = stream;
      chunksRef.current = [];
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setRecordedBlob(blob);
        onRecordingComplete(blob);
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      toast.success('Recording voice note...');
      
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Unable to access microphone. Please check permissions.');
    }
  }, [onRecordingComplete]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      toast.success('Voice note recorded!');
    }
  }, [isRecording]);

  // Play recorded audio
  const playRecording = useCallback(() => {
    if (recordedBlob && !isPlaying) {
      const audioUrl = URL.createObjectURL(recordedBlob);
      audioRef.current = new Audio(audioUrl);
      
      audioRef.current.onended = () => {
        setIsPlaying(false);
      };
      
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, [recordedBlob, isPlaying]);

  // Stop playing
  const stopPlaying = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  }, []);

  // Delete recording
  const deleteRecording = useCallback(() => {
    setRecordedBlob(null);
    setRecordingTime(0);
    setIsPlaying(false);
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    
    onRecordingDeleted();
    toast.success('Voice note deleted');
  }, [onRecordingDeleted]);

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  return (
    <div className="flex items-center space-x-3">
      
      {/* Recording Animation */}
      <AnimatePresence>
        {isRecording && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="flex items-center space-x-2 px-3 py-2 bg-red-50 rounded-lg border border-red-200"
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="w-3 h-3 bg-red-500 rounded-full"
            />
            <span className="text-red-700 font-medium text-sm">
              {formatTime(recordingTime)}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recording Controls */}
      {!recordedBlob && !isRecording && (
        <Button
          onClick={startRecording}
          disabled={isUploading}
          size="sm"
          className="bg-red-500 hover:bg-red-600 text-white"
        >
          <Mic className="w-4 h-4 mr-2" />
          Record Note
        </Button>
      )}

      {isRecording && (
        <Button
          onClick={stopRecording}
          size="sm"
          variant="outline"
          className="border-red-200 text-red-600 hover:bg-red-50"
        >
          <MicOff className="w-4 h-4 mr-2" />
          Stop
        </Button>
      )}

      {/* Playback Controls */}
      {recordedBlob && (
        <>
          <Button
            onClick={isPlaying ? stopPlaying : playRecording}
            variant="outline"
            size="sm"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </Button>

          <Button
            onClick={deleteRecording}
            variant="outline"
            size="sm"
            className="text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
          
          <span className="text-sm text-muted-foreground">
            {formatTime(recordingTime)}
          </span>
        </>
      )}

      {/* Helper text */}
      {!isRecording && !recordedBlob && (
        <span className="text-xs text-muted-foreground">
          Mention job details, special requirements, site logistics
        </span>
      )}
    </div>
  );
}