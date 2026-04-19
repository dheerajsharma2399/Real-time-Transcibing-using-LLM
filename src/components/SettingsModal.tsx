'use client';

import { FormEvent, useEffect, useState } from 'react';

import { Settings } from '@/lib/types';

type SettingsModalProps = {
  isOpen: boolean;
  settings: Settings;
  onClose: () => void;
  onSave: (settings: Settings) => void;
};

export function SettingsModal({ isOpen, settings, onClose, onSave }: SettingsModalProps) {
  const [draft, setDraft] = useState(settings);

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSave({
      ...draft,
      suggestionContextChars: Number(draft.suggestionContextChars) || 3000,
      chatContextChars: Number(draft.chatContextChars) || 8000,
      refreshIntervalSeconds: Number(draft.refreshIntervalSeconds) || 30,
    });
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-header">
          <div>
            <h2>Settings</h2>
            <p>Session settings are stored locally in your browser.</p>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close settings">
            ×
          </button>
        </div>

        <form className="settings-form" onSubmit={handleSubmit}>
          <label>
            <span>Groq API Key</span>
            <input
              type="password"
              value={draft.groqApiKey}
              onChange={(event) => setDraft((prev) => ({ ...prev, groqApiKey: event.target.value }))}
            />
          </label>

          <label>
            <span>Suggestion context (chars)</span>
            <input
              type="number"
              min={500}
              step={100}
              value={draft.suggestionContextChars}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, suggestionContextChars: Number(event.target.value) }))
              }
            />
          </label>

          <label>
            <span>Chat context (chars)</span>
            <input
              type="number"
              min={500}
              step={100}
              value={draft.chatContextChars}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, chatContextChars: Number(event.target.value) }))
              }
            />
          </label>

          <label>
            <span>Auto-refresh interval (s)</span>
            <input
              type="number"
              min={10}
              step={1}
              value={draft.refreshIntervalSeconds}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, refreshIntervalSeconds: Number(event.target.value) }))
              }
            />
          </label>

          <label>
            <span>Suggestion system prompt</span>
            <textarea
              rows={10}
              value={draft.suggestionPrompt}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, suggestionPrompt: event.target.value }))
              }
            />
          </label>

          <label>
            <span>Chat system prompt</span>
            <textarea
              rows={8}
              value={draft.chatPrompt}
              onChange={(event) => setDraft((prev) => ({ ...prev, chatPrompt: event.target.value }))}
            />
          </label>

          <div className="modal-actions">
            <button
              className="secondary-button"
              type="button"
              onClick={() => {
                setDraft(settings);
                onClose();
              }}
            >
              Cancel
            </button>
            <button className="primary-button" type="submit">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
