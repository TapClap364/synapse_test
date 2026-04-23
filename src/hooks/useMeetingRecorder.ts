// src/hooks/useMeetingRecorder.ts
import { useState, useRef, useCallback } from 'react';
import type { MeetingResult } from '../types';
import { apiPost } from '../lib/apiClient';
import { useWorkspace } from '../lib/workspace';

// Web Speech API types (для поддержки без webkit-префиксов)
interface SpeechWindow extends Window {
  SpeechRecognition?: new () => SpeechRecognition;
  webkitSpeechRecognition?: new () => SpeechRecognition;
}

export function useMeetingRecorder(
  onResult: (result: MeetingResult) => void,
  onDataRefresh: () => Promise<void>,
) {
  const { currentWorkspaceId } = useWorkspace();
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  const processMeetingText = useCallback(async (text: string) => {
    if (!currentWorkspaceId) {
      alert('Нет активного workspace.');
      return;
    }
    setIsProcessing(true);
    try {
      const data = await apiPost<MeetingResult>('/api/process-meeting', {
        workspaceId: currentWorkspaceId,
        body: { text, title: `Meeting ${new Date().toLocaleTimeString()}` },
      });
      onResult(data);
      await onDataRefresh();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      alert(`Ошибка: ${msg}`);
    } finally {
      setIsProcessing(false);
    }
  }, [currentWorkspaceId, onResult, onDataRefresh]);

  const startRecording = useCallback(() => {
    const win = window as SpeechWindow;
    const SpeechRecognitionCtor = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      alert('Используйте Chrome/Edge');
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = 'ru-RU';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript('');
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) final += event.results[i][0].transcript + ' ';
      }
      setTranscript(prev => prev + final);
    };

    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
  }, []);

  const stopRecording = useCallback(async () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      if (transcript.trim()) {
        await processMeetingText(transcript.trim());
      }
    }
  }, [transcript, processMeetingText]);

  return {
    isListening,
    isProcessing,
    transcript,
    startRecording,
    stopRecording,
    processMeetingText,
  };
}
