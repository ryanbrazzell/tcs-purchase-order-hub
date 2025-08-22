'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mic, MicOff, Play, Pause, Trash2, Upload, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

interface VoiceRecorderProps {
  onTranscriptionComplete: (data: any) => void;
  isUploading?: boolean;
}

export function VoiceRecorder({ onTranscriptionComplete, isUploading = false }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Guided prompts for better data extraction
  const recordingPrompts = [
    "Describe the job site location and square footage",
    "Mention floor type and current condition", 
    "Share timeline and scheduling requirements",
    "Note any special access or logistical needs",
    "Add customer contact info and preferences"
  ];

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000 // Optimal for Whisper
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
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      toast.success('Recording started! Share details about the job.');
      
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Unable to access microphone. Please check permissions.');
    }
  }, []);

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
      
      toast.success('Recording completed!');
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
    
    toast.success('Recording deleted');
  }, []);

  // Submit for transcription
  const submitRecording = useCallback(async () => {
    if (!recordedBlob) return;
    
    setIsProcessing(true);
    
    try {
      const formData = new FormData();
      formData.append('audio', recordedBlob, 'recording.webm');
      
      const response = await fetch('/api/transcribe-voice', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`Transcription failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      onTranscriptionComplete(result);
      
      // Clear recording after successful processing
      deleteRecording();
      
      toast.success('Voice details extracted successfully!');
      
    } catch (error: any) {
      console.error('Transcription error:', error);
      toast.error(error.message || 'Failed to process voice recording');
    } finally {
      setIsProcessing(false);
    }
  }, [recordedBlob, onTranscriptionComplete, deleteRecording]);

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
    <Card className="p-6 bg-gradient-to-br from-card to-card/95 border-0 shadow-lg">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mic className="w-8 h-8 text-primary" />
          </div>
          <h3 className="font-semibold text-lg">Voice Job Details</h3>
          <p className="text-sm text-muted-foreground">
            Record details about the job to auto-populate fields
          </p>
        </div>

        {/* Guided Prompts */}
        {!recordedBlob && !isRecording && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 mb-2">💡 What to include in your recording:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              {recordingPrompts.map((prompt, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  {prompt}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recording Controls */}
        <div className="flex flex-col items-center space-y-4">
          
          {/* Recording Animation */}
          <AnimatePresence>
            {isRecording && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                className="flex items-center space-x-4 p-4 bg-red-50 rounded-lg border border-red-200"
              >
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="w-4 h-4 bg-red-500 rounded-full"
                />
                <span className="text-red-700 font-medium">
                  Recording: {formatTime(recordingTime)}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main Controls */}
          <div className="flex items-center space-x-3">
            {!isRecording && !recordedBlob && (
              <Button
                onClick={startRecording}
                disabled={isUploading}
                size="lg"
                className="bg-red-500 hover:bg-red-600 text-white min-w-[140px]"
              >
                <Mic className="w-5 h-5 mr-2" />
                Start Recording
              </Button>
            )}

            {isRecording && (
              <Button
                onClick={stopRecording}
                size="lg"
                variant="outline"
                className="min-w-[140px] border-red-200 text-red-600 hover:bg-red-50"
              >
                <MicOff className="w-5 h-5 mr-2" />
                Stop Recording
              </Button>
            )}

            {recordedBlob && !isProcessing && (
              <>
                <Button
                  onClick={isPlaying ? stopPlaying : playRecording}
                  variant="outline"
                  size="lg"
                  className="min-w-[120px]"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-4 h-4 mr-2" />
                      Stop
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Play
                    </>
                  )}
                </Button>

                <Button
                  onClick={deleteRecording}
                  variant="outline"
                  size="lg"
                  className="text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>

                <Button
                  onClick={submitRecording}
                  disabled={isUploading}
                  size="lg"
                  className="min-w-[140px] bg-green-600 hover:bg-green-700"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Extract Data
                </Button>
              </>
            )}

            {isProcessing && (
              <Button disabled size="lg" className="min-w-[140px]">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </Button>
            )}
          </div>

          {/* Recording Info */}
          {recordedBlob && !isProcessing && (
            <div className="text-center text-sm text-muted-foreground">
              <p>Recording ready • {formatTime(recordingTime)} • Click &ldquo;Extract Data&rdquo; to process</p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}