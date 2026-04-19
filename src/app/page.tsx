'use client';

import { useMemo } from 'react';

import { ChatPanel } from '@/components/ChatPanel';
import { SettingsModal } from '@/components/SettingsModal';
import { SuggestionsPanel } from '@/components/SuggestionsPanel';
import { TranscriptPanel } from '@/components/TranscriptPanel';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useSession } from '@/hooks/useSession';

export default function HomePage() {
  const {
    transcriptChunks,
    suggestionBatches,
    chatMessages,
    isRefreshing,
    isChatLoading,
    settings,
    theme,
    setTheme,
    isSettingsOpen,
    setIsSettingsOpen,
    saveSettings,
    refreshFromAudio,
    sendChatMessage,
    useSuggestionInChat,
    exportSession,
    startedAt,
    toastMessage,
    transcriptionError,
    hasHydrated,
  } = useSession();

  const { isRecording, startRecording, stopRecording, triggerManualRefresh } = useAudioRecorder({
    onChunkReady: refreshFromAudio,
    refreshIntervalSeconds: settings.refreshIntervalSeconds,
  });

  const batchCountLabel = useMemo(() => `${suggestionBatches.length} batches`, [suggestionBatches.length]);

  if (!hasHydrated) {
    return null;
  }

  return (
    <>
      <div className="app-shell">
        <header className="topbar">
          <div>
            <div className="topbar-title">TwinMind — Live Suggestions Web App</div>
            <div className="topbar-subtitle">3-column layout · Transcript · Live Suggestions · Chat</div>
          </div>

          <div className="topbar-actions">
            <button
              className="secondary-button"
              type="button"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? 'Light mode' : 'Dark mode'}
            </button>
            <button className="secondary-button" type="button" onClick={exportSession}>
              Export Session
            </button>
            <button className="icon-button" type="button" onClick={() => setIsSettingsOpen(true)} aria-label="Open settings">
              ⚙
            </button>
          </div>
        </header>

        <main className="app-layout">
          <TranscriptPanel
            transcriptChunks={transcriptChunks}
            isRecording={isRecording}
            onStart={startRecording}
            onStop={stopRecording}
            transcriptionError={transcriptionError}
          />
          <SuggestionsPanel
            suggestionBatches={suggestionBatches}
            isRefreshing={isRefreshing}
            isRecording={isRecording}
            refreshIntervalSeconds={settings.refreshIntervalSeconds}
            startedAt={startedAt}
            onManualRefresh={triggerManualRefresh}
            onSelectSuggestion={useSuggestionInChat}
          />
          <ChatPanel chatMessages={chatMessages} isLoading={isChatLoading} onSendMessage={sendChatMessage} />
        </main>
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        settings={settings}
        onClose={() => setIsSettingsOpen(false)}
        onSave={saveSettings}
      />

      {toastMessage ? <div className="toast">{toastMessage}</div> : null}
    </>
  );
}
