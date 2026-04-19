'use client';

import { TranscriptChunk } from '@/lib/types';

type TranscriptPanelProps = {
  transcriptChunks: TranscriptChunk[];
  isRecording: boolean;
  onStart: () => void;
  onStop: () => void;
};

export function TranscriptPanel({
  transcriptChunks,
  isRecording,
  onStart,
  onStop,
}: TranscriptPanelProps) {
  return (
    <section className="panel column">
      <div className="panel-heading">
        <span>1. MIC &amp; TRANSCRIPT</span>
        <span>{isRecording ? 'RECORDING' : 'IDLE'}</span>
      </div>

      <button className="mic-button" type="button" onClick={isRecording ? onStop : onStart}>
        <span className="mic-dot" />
        <span>{isRecording ? 'Stop mic' : 'Click mic to start. Transcript appends every ~30s.'}</span>
      </button>

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
