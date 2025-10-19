import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { NewsItem } from '../api/client';
import { callOpenAiChat, type ChatMessagePayload } from '../api/openai';

interface ChatPanelProps {
  article: NewsItem | null;
  stateName?: string | null;
  onClose: () => void;
}

interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const OPENAI_CONFIGURED = Boolean(
  import.meta.env.VITE_OPENAI_API_KEY ?? import.meta.env.OPENAI_API_KEY ?? ''
);

function createId() {
  return Math.random().toString(36).slice(2);
}

const ChatPanel: React.FC<ChatPanelProps> = ({ article, stateName, onClose }) => {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const historyRef = useRef<ChatMessagePayload[]>([]);

  const systemPrompt = useMemo(() => {
    const stateText = stateName ? ` for ${stateName}` : '';
    return [
      'You are a regulatory analyst helping monitor US state-by-state statuses for skill-based cash contests.',
      'Provide concise, structured answers. Highlight legal, compliance, or operational implications.',
      'If you lack enough detail, state what additional information is required.',
      `Tailor guidance to stakeholders tracking updates${stateText}.`
    ].join(' ');
  }, [stateName]);

  const focusArticle = useMemo(() => {
    if (!article) {
      return null;
    }
    return {
      id: article.id,
      title: article.title,
      source: article.source,
      url: article.url,
      summary: article.summary,
      state: article.state ?? '',
      publishedAt: article.published_at
    };
  }, [article]);

  const sendMessage = useCallback(
    async (content: string, options: { silentUser?: boolean } = {}): Promise<void> => {
      if (!focusArticle) {
        return;
      }
      if (!OPENAI_CONFIGURED) {
        setError('OpenAI API key is not configured. Add VITE_OPENAI_API_KEY in your environment.');
        return;
      }

      const { silentUser = false } = options;

      const userMessage: ChatMessagePayload = { role: 'user', content };
      let nextHistory = [...historyRef.current, userMessage];
      if (nextHistory.length > 20) {
        nextHistory = nextHistory.slice(-20);
      }
      historyRef.current = nextHistory;

      if (!silentUser) {
        setMessages((prev) => [...prev, { id: createId(), role: 'user', content }]);
      }

      if (abortRef.current) {
        abortRef.current.abort();
      }

      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      setError(null);

      const promptMessages: ChatMessagePayload[] = [
        { role: 'system', content: systemPrompt },
        ...historyRef.current
      ];

      try {
        const reply = await callOpenAiChat(promptMessages, {
          temperature: 1,
          signal: controller.signal
        });

        const assistantMessage: ChatMessagePayload = { role: 'assistant', content: reply };
        let updatedHistory = [...historyRef.current, assistantMessage];
        if (updatedHistory.length > 20) {
          updatedHistory = updatedHistory.slice(-20);
        }
        historyRef.current = updatedHistory;

        setMessages((prev) => [...prev, { id: createId(), role: 'assistant', content: reply }]);
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          return;
        }
        setError((err as Error).message ?? 'Chat request failed.');
      } finally {
        setIsLoading(false);
      }
    },
    [focusArticle, systemPrompt]
  );

  useEffect(() => {
    historyRef.current = [];
    setMessages([]);
    setInput('');
    setError(null);
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }

    if (!focusArticle || !OPENAI_CONFIGURED) {
      return;
    }

    const initialPrompt = focusArticle.url
      ? `Review the article "${focusArticle.title}" from ${focusArticle.source} (${focusArticle.url}). Summarize the most important developments, highlight regulatory implications, and suggest next steps or watch-outs. If you cannot access the article, fall back to this summary text: """${focusArticle.summary ?? 'No summary provided.'}""". Present your response as concise markdown bullet points and note the publication date ${focusArticle.publishedAt ?? 'unknown'}.`
      : `We have the following summary for "${focusArticle.title}" from ${focusArticle.source}: """${focusArticle.summary ?? 'No summary provided.'}""". Summarize the key developments, compliance considerations, and suggested next steps using concise markdown bullet points.`;

    void sendMessage(initialPrompt, { silentUser: true });
  }, [focusArticle, sendMessage]);

  useEffect(() => {
    if (!focusArticle) {
      return;
    }
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (abortRef.current) {
          abortRef.current.abort();
          abortRef.current = null;
        }
        historyRef.current = [];
        setMessages([]);
        setInput('');
        setError(null);
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [focusArticle, onClose]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) {
      return;
    }
    container.scrollTop = container.scrollHeight;
  }, [messages, isLoading]);

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    if (!input.trim() || isLoading) {
      return;
    }
    const prompt = input.trim();
    setInput('');
    await sendMessage(prompt);
  };

  if (!focusArticle) {
    return null;
  }

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="relative flex h-[80vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200/60 bg-gradient-to-br from-white via-white to-slate-50 shadow-2xl dark:border-slate-700 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200/60 px-6 py-4 dark:border-slate-800/70">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Chat about
            </p>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {focusArticle.title}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>{focusArticle.source}</span>
              {focusArticle.url ? (
                <a
                  href={focusArticle.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-full bg-status-green/20 px-2 py-1 text-[11px] font-semibold text-status-green transition hover:bg-status-green/30"
                >
                  View article
                </a>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (abortRef.current) {
                abortRef.current.abort();
                abortRef.current = null;
              }
              historyRef.current = [];
              setMessages([]);
              setInput('');
              setError(null);
              onClose();
            }}
            className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:border-status-green hover:text-status-green dark:border-slate-700 dark:text-slate-400"
          >
            Close
          </button>
        </header>

        <div className="flex flex-1 flex-col gap-3 px-6 py-4">
          <div
            ref={scrollRef}
            className="custom-scrollbar flex-1 space-y-3 overflow-auto rounded-xl border border-slate-200/60 bg-white/80 p-4 shadow-inner dark:border-slate-800/70 dark:bg-slate-900/80"
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={`rounded-lg px-4 py-3 text-sm leading-relaxed ${
                  message.role === 'assistant'
                    ? 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100'
                    : 'bg-status-green/20 text-slate-800 dark:bg-status-green/25 dark:text-slate-100'
                }`}
              >
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  {message.role === 'assistant' ? 'Assistant' : 'You'}
                </div>
                <div className="mt-1 whitespace-pre-wrap text-[13px] text-slate-700 dark:text-slate-200">
                  {message.content}
                </div>
              </div>
            ))}
            {isLoading ? (
              <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                <span className="h-3 w-3 animate-spin rounded-full border-[2px] border-slate-300 border-t-status-green" />
                ChatGPT is thinking…
              </div>
            ) : null}
          </div>

          {error ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-400/40 dark:bg-red-950/40 dark:text-red-200">
              {error}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Ask a follow-up
            </label>
            <div className="flex items-end gap-3">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                rows={3}
                placeholder="Ask about compliance impacts, next steps, or clarifications…"
                className="custom-scrollbar w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm transition focus:border-status-green focus:outline-none focus:ring-2 focus:ring-status-green/40 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                disabled={isLoading || !OPENAI_CONFIGURED}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim() || !OPENAI_CONFIGURED}
                className="inline-flex items-center justify-center rounded-xl bg-status-green px-4 py-3 text-sm font-semibold text-slate-900 shadow transition hover:bg-status-green/90 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
              >
                Send
              </button>
            </div>
            {!OPENAI_CONFIGURED ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Add <code className="rounded bg-slate-100 px-1 py-0.5 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">VITE_OPENAI_API_KEY</code> to enable chat.
              </p>
            ) : null}
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ChatPanel;
