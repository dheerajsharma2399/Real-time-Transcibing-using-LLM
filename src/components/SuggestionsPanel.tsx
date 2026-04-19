'use client';

import { Suggestion, SuggestionBatch } from '@/lib/types';

import { SuggestionCard } from './SuggestionCard';

type SuggestionsPanelProps = {
  suggestionBatches: SuggestionBatch[];
  isRefreshing: boolean;
  isRecording: boolean;
  refreshIntervalSeconds: number;
  startedAt: number;
  onManualRefresh: () => void;
  onSelectSuggestion: (suggestion: Suggestion) => void;
};

export function SuggestionsPanel({
  suggestionBatches,
  isRefreshing,
  isRecording,
  refreshIntervalSeconds,
  startedAt,
  onManualRefresh,
  onSelectSuggestion,
}: SuggestionsPanelProps) {
  const sessionAgeSeconds = Math.floor((Date.now() - startedAt) / 1000);
  const showInitialEmptyState = suggestionBatches.length === 0 && isRecording && sessionAgeSeconds < 30;

  return (
    <section className="panel column">
      <div className="panel-heading">
        <span>2. LIVE SUGGESTIONS</span>
        <span>{suggestionBatches.length} BATCHES</span>
      </div>

      <div className="panel-toolbar">
        <button className="secondary-button" type="button" onClick={onManualRefresh} disabled={!isRecording || isRefreshing}>
          ↻ Reload suggestions
        </button>
        <span className="toolbar-text">auto-refresh in {refreshIntervalSeconds}s</span>
      </div>

      <div className="callout">
        On reload (or auto every ~30s), generate 3 fresh suggestions from recent transcript context.
        Newest batch appears at the top, older batches push down. Each is a tappable card.
      </div>

      <div className="suggestions-body">
        {suggestionBatches.length === 0 ? (
          <div className="empty-state">
            {showInitialEmptyState
              ? 'Suggestions appear here once the first 30-second batch finishes.'
              : 'Suggestions appear here once recording starts.'}
          </div>
        ) : (
          suggestionBatches.map((batch, index) => (
            <section key={batch.id} className="batch-section">
              <div className="batch-header">
                Batch #{suggestionBatches.length - index} ·{' '}
                {new Date(batch.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: false,
                })}
              </div>
              <div className="suggestion-list">
                {batch.suggestions.map((suggestion) => (
                  <SuggestionCard key={suggestion.id} suggestion={suggestion} onSelect={onSelectSuggestion} />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </section>
  );
}
