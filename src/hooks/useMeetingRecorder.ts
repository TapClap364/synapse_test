// src/hooks/useMeetingRecorder.ts
import { useState, useRef, useCallback } from 'react';
import type { MeetingResult } from '../types';

// Web Speech API types (для поддержки без webkit-префиксов)
interface SpeechWindow extends Window {
  SpeechRecognition?: new () => SpeechRecognition;
  webkitSpeechRecognition?: new () => SpeechRecognition;
}

export function useMeetingRecorder(
  onResult: (result: MeetingResult) => void,
  onDataRefresh: () => Promise<void>,
) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  const processMeetingText = useCallback(async (text: string) => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/process-meeting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, title: `Meeting ${new Date().toLocaleTimeString()}` }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      const data = await res.json();
      onResult(data);
      await onDataRefresh();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      alert(`Ошибка: ${msg}`);
    } finally {
      setIsProcessing(false);
    }
  }, [onResult, onDataRefresh]);

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
