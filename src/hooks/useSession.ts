'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { downloadSessionExport } from '@/lib/export';
import { DEFAULT_CHAT_PROMPT, DEFAULT_SUGGESTION_PROMPT } from '@/lib/prompts';
import { ChatMessage, RefreshResponse, Settings, Suggestion, SuggestionBatch, TranscriptChunk } from '@/lib/types';

const SETTINGS_STORAGE_KEY = 'twinmind-settings';
const THEME_STORAGE_KEY = 'theme';

const DEFAULT_SETTINGS: Settings = {
  groqApiKey: '',
  suggestionContextChars: 3000,
  chatContextChars: 8000,
  refreshIntervalSeconds: 30,
  suggestionPrompt: DEFAULT_SUGGESTION_PROMPT,
  chatPrompt: DEFAULT_CHAT_PROMPT,
};

function createId() {
  return crypto.randomUUID();
}

function createHeaders(apiKey: string) {
  return apiKey ? { 'x-groq-key': apiKey } : {};
}

function readStoredSettings() {
  if (typeof window === 'undefined') {
    return DEFAULT_SETTINGS;
  }

  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);

    if (!raw) {
      return DEFAULT_SETTINGS;
    }

    return {
      ...DEFAULT_SETTINGS,
      ...JSON.parse(raw),
    } as Settings;
  } catch (_error) {
    return DEFAULT_SETTINGS;
  }
}

function readStoredTheme() {
  if (typeof window === 'undefined') {
    return 'dark';
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  return storedTheme === 'light' ? 'light' : 'dark';
}

async function readSseTokens(response: Response, onToken: (token: string) => void) {
  const reader = response.body?.getReader();

  if (!reader) {
    throw new Error('Chat stream was not readable');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() || '';

    for (const event of events) {
      const lines = event.split('\n');

      for (const line of lines) {
        if (!line.startsWith('data:')) {
          continue;
        }

        const payload = line.slice(5).trim();

        if (!payload) {
          continue;
        }

        if (payload === '[DONE]') {
          return;
        }

        const parsed = JSON.parse(payload) as { token?: string; error?: string };

        if (parsed.error) {
          throw new Error(parsed.error);
        }

        if (parsed.token) {
          onToken(parsed.token);
        }
      }
    }
  }
}

export function useSession() {
  const [transcriptChunks, setTranscriptChunks] = useState<TranscriptChunk[]>([]);
  const [suggestionBatches, setSuggestionBatches] = useState<SuggestionBatch[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [startedAt] = useState(() => Date.now());
  const [toastMessage, setToastMessage] = useState('');
  const [transcriptionError, setTranscriptionError] = useState('');
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timer = window.setTimeout(() => setToastMessage(''), 4500);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  useEffect(() => {
    const initialSettings = readStoredSettings();
    const initialTheme = readStoredTheme();

    setSettings(initialSettings);
    setTheme(initialTheme);
    setIsSettingsOpen(!initialSettings.groqApiKey.trim());
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }, [hasHydrated, settings]);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    document.documentElement.dataset.theme = theme;
  }, [hasHydrated, theme]);

  const fullTranscriptText = useMemo(
    () => transcriptChunks.map((chunk) => chunk.text.trim()).filter(Boolean).join('\n'),
    [transcriptChunks]
  );

  const transcriptWindow = useMemo(
    () => fullTranscriptText.slice(-settings.suggestionContextChars),
    [fullTranscriptText, settings.suggestionContextChars]
  );

  const recentWindow = useMemo(() => fullTranscriptText.slice(-500), [fullTranscriptText]);

  const previousTitles = useMemo(
    () =>
      suggestionBatches
        .slice(0, 2)
        .flatMap((batch) => batch.suggestions.map((suggestion) => suggestion.title)),
    [suggestionBatches]
  );

  const chatTranscriptWindow = useMemo(
    () => fullTranscriptText.slice(-settings.chatContextChars),
    [fullTranscriptText, settings.chatContextChars]
  );

  const saveSettings = useCallback((nextSettings: Settings) => {
    setSettings(nextSettings);
    setIsSettingsOpen(false);
  }, []);

  const appendTranscriptChunk = useCallback((chunk: TranscriptChunk | null) => {
    if (!chunk || !chunk.text.trim()) {
      return;
    }

    setTranscriptChunks((prev) => [...prev, chunk]);
    setTranscriptionError('');
  }, []);

  const appendSuggestionBatch = useCallback((suggestions: Suggestion[]) => {
    if (!suggestions.length) {
      return;
    }

    setSuggestionBatches((prev) =>
      [
        {
          id: createId(),
          createdAt: new Date().toISOString(),
          suggestions,
        },
        ...prev,
      ].slice(0, 5)
    );
  }, []);

  const refreshFromAudio = useCallback(
    async ({
      blob,
      audioStartMs,
      audioEndMs,
    }: {
      blob: Blob;
      audioStartMs: number;
      audioEndMs: number;
    }) => {
      if (isRefreshing) {
        return;
      }

      const apiKey = settings.groqApiKey.trim();

      setIsRefreshing(true);
      setToastMessage('');

      try {
        const formData = new FormData();
        formData.append('audio', blob, 'audio.webm');
        formData.append('transcriptWindow', transcriptWindow);
        formData.append('recentWindow', recentWindow);
        formData.append('previousTitles', JSON.stringify(previousTitles));
        formData.append('chunkIds', JSON.stringify(transcriptChunks.map((chunk) => chunk.id)));
        formData.append('suggestionPrompt', settings.suggestionPrompt);
        formData.append('audioStartMs', String(audioStartMs));
        formData.append('audioEndMs', String(audioEndMs));

        const response = await fetch('/api/refresh', {
          method: 'POST',
          headers: createHeaders(apiKey),
          body: formData,
        });

        if (!response.ok) {
          if (response.status === 401) {
            setIsSettingsOpen(true);
            setToastMessage('No API key');
            setTranscriptionError('No API key');
          }

          const payload = await response.json().catch(() => ({ error: 'Refresh failed' }));
          throw new Error(payload.error || 'Transcription failed');
        }

        const payload = (await response.json()) as RefreshResponse;
        appendTranscriptChunk(payload.transcriptChunk);
        appendSuggestionBatch(payload.suggestions);

        if (payload.transcriptChunk?.text?.trim() && payload.suggestions.length === 0) {
          setToastMessage("Couldn't refresh suggestions");
        }
      } catch (error) {
        if (!apiKey) {
          setIsSettingsOpen(true);
          setToastMessage('No API key');
          setTranscriptionError('No API key');
        } else {
          setToastMessage('Transcription failed');
          setTranscriptionError('Transcription failed');
        }
      } finally {
        setIsRefreshing(false);
      }
    },
    [
      appendSuggestionBatch,
      appendTranscriptChunk,
      isRefreshing,
      previousTitles,
      recentWindow,
      settings.groqApiKey,
      settings.suggestionPrompt,
      transcriptChunks,
      transcriptWindow,
    ]
  );

  const sendChatMessage = useCallback(
    async (content: string, linkedSuggestionId?: string) => {
      const trimmedContent = content.trim();

      if (!trimmedContent || isChatLoading) {
        return;
      }

      const apiKey = settings.groqApiKey.trim();

      setIsChatLoading(true);
      setToastMessage('');

      const userMessage: ChatMessage = {
        id: createId(),
        role: 'user',
        content: trimmedContent,
        createdAt: new Date().toISOString(),
        linkedSuggestionId,
      };

      const assistantMessageId = createId();
      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        createdAt: new Date().toISOString(),
      };

      const nextMessages = [...chatMessages, userMessage];
      setChatMessages((prev) => [...prev, userMessage, assistantMessage]);

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...createHeaders(apiKey),
          },
          body: JSON.stringify({
            messages: nextMessages,
            transcriptWindow: chatTranscriptWindow,
            chatPrompt: settings.chatPrompt,
          }),
        });

        if (!response.ok) {
          if (response.status === 401) {
            setIsSettingsOpen(true);
            setToastMessage('No API key');
          }

          const payload = await response.json().catch(() => ({ error: 'Chat failed' }));
          throw new Error(payload.error || 'Chat failed');
        }

        await readSseTokens(response, (token) => {
          setChatMessages((prev) =>
            prev.map((message) =>
              message.id === assistantMessageId
                ? { ...message, content: `${message.content}${token}` }
                : message
            )
          );
        });
      } catch (error) {
        if (!apiKey) {
          setIsSettingsOpen(true);
          setToastMessage('No API key');
        } else {
          setToastMessage('Chat failed');
        }
        setChatMessages((prev) =>
          prev.map((entry) =>
            entry.id === assistantMessageId ? { ...entry, content: 'Error — try again' } : entry
          )
        );
      } finally {
        setIsChatLoading(false);
      }
    },
    [chatMessages, chatTranscriptWindow, isChatLoading, settings.chatPrompt, settings.groqApiKey]
  );

  const useSuggestionInChat = useCallback(
    async (suggestion: Suggestion) => {
      await sendChatMessage(suggestion.preview, suggestion.id);
    },
    [sendChatMessage]
  );

  const exportSession = useCallback(() => {
    downloadSessionExport({
      startedAt,
      transcriptChunks,
      suggestionBatches,
      chatMessages,
      settings,
    });
  }, [chatMessages, settings, startedAt, suggestionBatches, transcriptChunks]);

  return {
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
  };
}
