'use client';

import { Suggestion, SuggestionType } from '@/lib/types';

const BADGE_CLASS_NAMES: Record<SuggestionType, string> = {
  QUESTION: 'badge-question',
  ANSWER: 'badge-answer',
  FACT_CHECK: 'badge-fact-check',
  TALKING_PT: 'badge-talking-point',
  CLARIFY: 'badge-clarify',
  NEXT_STEP: 'badge-next-step',
};

type SuggestionCardProps = {
  suggestion: Suggestion;
  onSelect: (suggestion: Suggestion) => void;
};

export function SuggestionCard({ suggestion, onSelect }: SuggestionCardProps) {
  const time = new Date(suggestion.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return (
    <button className="suggestion-card" type="button" onClick={() => onSelect(suggestion)}>
      <div className="suggestion-card-top">
        <span className={`suggestion-badge ${BADGE_CLASS_NAMES[suggestion.type]}`}>{suggestion.type}</span>
        <span className="suggestion-time">{time}</span>
      </div>
      <h3>{suggestion.title}</h3>
      <p>{suggestion.preview}</p>
    </button>
  );
}
