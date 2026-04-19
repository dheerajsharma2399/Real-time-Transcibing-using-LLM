'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type ChunkPayload = {
  blob: Blob;
  audioStartMs: number;
  audioEndMs: number;
};

type UseAudioRecorderOptions = {
  onChunkReady: (payload: ChunkPayload) => Promise<void> | void;
  refreshIntervalSeconds: number;
};

function getSupportedMimeType() {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm'];

  if (typeof MediaRecorder === 'undefined') {
    return '';
  }

  for (const candidate of candidates) {
    if (MediaRecorder.isTypeSupported(candidate)) {
      return candidate;
    }
  }

  return '';
}

export function useAudioRecorder({
  onChunkReady,
  refreshIntervalSeconds,
}: UseAudioRecorderOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const onChunkReadyRef = useRef(onChunkReady);
  const refreshIntervalSecondsRef = useRef(refreshIntervalSeconds);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number | null>(null);
  const chunkBufferRef = useRef<Blob[]>([]);
  const sessionStartRef = useRef<number>(0);
  const chunkStartRef = useRef<number>(0);
  const shouldRestartRef = useRef(false);
  const stopStreamAfterFlushRef = useRef(false);
  const isStartingRef = useRef(false);

  useEffect(() => {
    onChunkReadyRef.current = onChunkReady;
  }, [onChunkReady]);

  useEffect(() => {
    refreshIntervalSecondsRef.current = refreshIntervalSeconds;
  }, [refreshIntervalSeconds]);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const startRecorderCycle = useCallback(
    (stream: MediaStream) => {
      const mimeType = getSupportedMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

      recorderRef.current = recorder;
      chunkBufferRef.current = [];
      chunkStartRef.current = Date.now() - sessionStartRef.current;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunkBufferRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        clearTimer();
        const audioEndMs = Date.now() - sessionStartRef.current;
        const audioStartMs = chunkStartRef.current;
        const blob = new Blob(chunkBufferRef.current, { type: recorder.mimeType || 'audio/webm' });
        chunkBufferRef.current = [];
        const shouldRestart = shouldRestartRef.current && !!streamRef.current && !stopStreamAfterFlushRef.current;
        const nextStream = streamRef.current;

        if (shouldRestart && nextStream) {
          startRecorderCycle(nextStream);
        }

        if (blob.size > 1000) {
          void Promise.resolve(
            onChunkReadyRef.current({
              blob,
              audioStartMs,
              audioEndMs,
            })
          ).catch(() => undefined);
        }

        if (stopStreamAfterFlushRef.current) {
          stopStreamAfterFlushRef.current = false;
          stopTracks();
          recorderRef.current = null;
          setIsRecording(false);
          return;
        }

        if (shouldRestart) {
          return;
        }

        recorderRef.current = null;
        setIsRecording(false);
      };

      recorder.start(1000);
      setIsRecording(true);
      clearTimer();
      timerRef.current = window.setTimeout(() => {
        if (recorder.state !== 'inactive') {
          shouldRestartRef.current = true;
          recorder.stop();
        }
      }, refreshIntervalSecondsRef.current * 1000);
    },
    [clearTimer, stopTracks]
  );

  const startRecording = useCallback(async () => {
    if (isStartingRef.current || recorderRef.current || isRecording) {
      return;
    }

    isStartingRef.current = true;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      shouldRestartRef.current = true;
      stopStreamAfterFlushRef.current = false;
      sessionStartRef.current = Date.now();
      startRecorderCycle(stream);
    } finally {
      isStartingRef.current = false;
    }
  }, [isRecording, startRecorderCycle]);

  const stopRecording = useCallback(() => {
    shouldRestartRef.current = false;
    stopStreamAfterFlushRef.current = true;
    clearTimer();

    const recorder = recorderRef.current;

    if (!recorder) {
      stopTracks();
      setIsRecording(false);
      return;
    }

    if (recorder.state !== 'inactive') {
      recorder.stop();
      return;
    }

    stopTracks();
    setIsRecording(false);
  }, [clearTimer, stopTracks]);

  const triggerManualRefresh = useCallback(() => {
    const recorder = recorderRef.current;

    if (!recorder || recorder.state === 'inactive') {
      return;
    }

    shouldRestartRef.current = true;
    clearTimer();
    recorder.stop();
  }, [clearTimer]);

  useEffect(() => () => {
    clearTimer();
    shouldRestartRef.current = false;
    stopStreamAfterFlushRef.current = true;

    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    } else {
      stopTracks();
    }
  }, [clearTimer, stopTracks]);

  return {
    isRecording,
    startRecording,
    stopRecording,
    triggerManualRefresh,
  };
}
