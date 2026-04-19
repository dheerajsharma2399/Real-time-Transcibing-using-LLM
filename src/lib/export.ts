import { ChatMessage, Settings, SuggestionBatch, TranscriptChunk } from '@/lib/types';

type ExportPayloadArgs = {
  startedAt: number;
  transcriptChunks: TranscriptChunk[];
  suggestionBatches: SuggestionBatch[];
  chatMessages: ChatMessage[];
  settings: Settings;
};

function formatTime(isoString: string) {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export function createSessionExportPayload({
  startedAt,
  transcriptChunks,
  suggestionBatches,
  chatMessages,
  settings,
}: ExportPayloadArgs) {
  return {
    exported_at: new Date().toISOString(),
    duration_seconds: Math.max(0, Math.round((Date.now() - startedAt) / 1000)),
    settings_used: {
      suggestionContextChars: settings.suggestionContextChars,
      chatContextChars: settings.chatContextChars,
    },
    transcript: transcriptChunks.map((chunk) => ({
      id: chunk.id,
      t: formatTime(chunk.createdAt),
      text: chunk.text,
    })),
    batches: suggestionBatches.map((batch) => ({
      id: batch.id,
      t: formatTime(batch.createdAt),
      suggestions: batch.suggestions.map((suggestion) => ({
        type: suggestion.type,
        title: suggestion.title,
        preview: suggestion.preview,
        detail: suggestion.detail,
        reason: suggestion.reason,
      })),
    })),
    chat: chatMessages.map((message) => ({
      id: message.id,
      t: formatTime(message.createdAt),
      role: message.role,
      content: message.content,
      linkedSuggestionId: message.linkedSuggestionId,
    })),
  };
}

export function downloadSessionExport(args: ExportPayloadArgs) {
  const payload = createSessionExportPayload(args);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `twinmind-${timestamp}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
