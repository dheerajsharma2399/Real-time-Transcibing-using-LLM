export type TranscriptChunk = {
  id: string;
  text: string;
  createdAt: string;
  audioStartMs: number;
  audioEndMs: number;
};

export type SuggestionType =
  | 'QUESTION'
  | 'ANSWER'
  | 'FACT_CHECK'
  | 'TALKING_PT'
  | 'CLARIFY'
  | 'NEXT_STEP';

export type Suggestion = {
  id: string;
  type: SuggestionType;
  title: string;
  preview: string;
  detail: string;
  reason: string;
  basedOnChunkIds: string[];
  createdAt: string;
};

export type SuggestionBatch = {
  id: string;
  createdAt: string;
  suggestions: Suggestion[];
};

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  linkedSuggestionId?: string;
};

export type Settings = {
  groqApiKey: string;
  suggestionContextChars: number;
  chatContextChars: number;
  refreshIntervalSeconds: number;
  suggestionPrompt: string;
  chatPrompt: string;
};

export type SuggestionsRequestBody = {
  transcriptWindow: string;
  recentWindow: string;
  previousTitles: string[];
  chunkIds: string[];
  suggestionPrompt?: string;
};

export type ChatRequestBody = {
  messages: ChatMessage[];
  transcriptWindow: string;
  chatPrompt?: string;
};

export type RefreshResponse = {
  transcriptChunk: TranscriptChunk | null;
  suggestions: Suggestion[];
};
