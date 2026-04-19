'use client';

import { FormEvent, useState } from 'react';

import { ChatMessage } from '@/lib/types';

type ChatPanelProps = {
  chatMessages: ChatMessage[];
  isLoading: boolean;
  onSendMessage: (content: string) => Promise<void> | void;
};

export function ChatPanel({ chatMessages, isLoading, onSendMessage }: ChatPanelProps) {
  const [value, setValue] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextValue = value.trim();

    if (!nextValue) {
      return;
    }

    setValue('');
    await onSendMessage(nextValue);
  };

  return (
    <section className="panel column chat-panel">
      <div className="panel-heading">
        <span>3. CHAT (DETAILED ANSWERS)</span>
        <span>SESSION-ONLY</span>
      </div>

      <div className="callout">
        Clicking a suggestion adds it to this chat and streams a detailed answer. Users can also type
        questions directly. One continuous chat per session — no login, no persistence.
      </div>

      <div className="chat-body">
        {chatMessages.length === 0 ? (
          <div className="empty-state">Click a suggestion or type a question below.</div>
        ) : (
          chatMessages.map((message) => (
            <article key={message.id} className={`chat-message chat-message-${message.role}`}>
              <div className="chat-message-role">{message.role === 'user' ? 'You' : 'TwinMind'}</div>
              <p>{message.content || (isLoading && message.role === 'assistant' ? '…' : '')}</p>
            </article>
          ))
        )}
      </div>

      <form className="chat-form" onSubmit={handleSubmit}>
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Ask anything..."
        />
        <button className="primary-button" type="submit" disabled={isLoading}>
          Send
        </button>
      </form>
    </section>
  );
}
