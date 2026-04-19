'use client';

import { useCallback, useState } from 'react';

import { TranscriptChunk } from '@/lib/types';

type TranscriptPanelProps = {
  transcriptChunks: TranscriptChunk[];
  isRecording: boolean;
  onStart: () => Promise<void> | void;
  onStop: () => void;
  transcriptionError: string;
};

export function TranscriptPanel({
  transcriptChunks,
  isRecording,
  onStart,
  onStop,
  transcriptionError,
}: TranscriptPanelProps) {
  const [micError, setMicError] = useState('');
  const [micDisabled, setMicDisabled] = useState(false);

  const handleMicClick = useCallback(async () => {
    if (isRecording) {
      onStop();
      return;
    }

    if (micDisabled) {
      return;
    }

    try {
      await onStart();
      setMicError('');
    } catch (error) {
      const name = error && typeof error === 'object' && 'name' in error ? String((error as { name?: unknown }).name) : '';
      const isDenied = name === 'NotAllowedError' || name === 'PermissionDeniedError';

      if (isDenied) {
        setMicError('Mic permission denied');
        setMicDisabled(true);
      } else {
        setMicError('Unable to access microphone');
      }
    }
  }, [isRecording, micDisabled, onStart, onStop]);

  return (
    <section className="panel column">
      <div className="panel-heading">
        <span>1. MIC &amp; TRANSCRIPT</span>
        <span>{isRecording ? 'RECORDING' : 'IDLE'}</span>
      </div>

      <button className="mic-button" type="button" onClick={handleMicClick} disabled={!isRecording && micDisabled}>
        <span className="mic-dot" />
        <span>{isRecording ? 'Stop mic' : 'Click mic to start. Transcript appends every ~30s.'}</span>
      </button>

      {micError ? <div className="inline-error">{micError}</div> : null}
      {transcriptionError ? <div className="inline-error">{transcriptionError}</div> : null}

      <div className="callout">
        The transcript scrolls and appends new chunks every ~30 seconds while recording. Use the mic
        button to start or stop.
      </div>

      <div className="transcript-body">
        {transcriptChunks.length === 0 ? (
          <div className="empty-state">No transcript yet — start the mic.</div>
        ) : (
          transcriptChunks.map((chunk) => (
            <article key={chunk.id} className="transcript-chunk">
              <div className="transcript-time">
                {new Date(chunk.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: false,
                })}
              </div>
              <p>{chunk.text}</p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
