import React, { useMemo, useRef } from 'react';
import clsx from 'clsx';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useVirtualizer, type VirtualItem } from '@tanstack/react-virtual';
import { newsQueryOptions, NewsItem } from '../api/client';
import { formatDateTime, formatRelativeTime } from '../utils/datetime';
import { buttonActive, buttonBase, buttonMuted } from '../styles/buttons';

interface NewsFeedProps {
  stateCode: string;
  onAskChat: (item: NewsItem) => void;
  activeChatId?: string | null;
}

const NewsFeed: React.FC<NewsFeedProps> = ({ stateCode, onAskChat, activeChatId }) => {
  if (!stateCode) {
    return <div className="card text-sm text-slate-500">Select a state to view recent updates.</div>;
  }

  const queryOptions = useMemo(() => newsQueryOptions(stateCode), [stateCode]);
  const { data: items } = useSuspenseQuery(queryOptions);

  const parentRef = useRef<HTMLDivElement | null>(null);
  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120,
    overscan: 8
  });

  if (!items.length) {
    return (
      <div className="card text-sm text-slate-500">
        No recent news for <span className="font-semibold">{stateCode}</span>.
      </div>
    );
  }

  return (
    <div className="card flex h-[520px] flex-col gap-3 border border-slate-200/70 bg-white/90 shadow-lg dark:border-slate-800/60 dark:bg-slate-950/80">
      <header className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          {stateCode} News Feed
        </h2>
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
          {items.length} items
        </span>
      </header>

      <div ref={parentRef} className="custom-scrollbar flex-1 overflow-auto rounded-xl border border-slate-200/60 bg-white/80 dark:border-slate-800/60 dark:bg-slate-950/60">
        <div
          className="relative w-full"
          style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualItem) => {
            const item = items[virtualItem.index];
            return (
              <NewsCard
                key={item.id ?? virtualItem.key}
                item={item}
                virtualItem={virtualItem}
                onAskChat={onAskChat}
                isActive={activeChatId === item.id}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

interface NewsCardProps {
  item: NewsItem;
  virtualItem: VirtualItem;
  onAskChat: (item: NewsItem) => void;
  isActive: boolean;
}

const NewsCard: React.FC<NewsCardProps> = ({ item, virtualItem, onAskChat, isActive }) => {
  const offsetTop = virtualItem.start;
  const tags = item.tags ?? [];
  const publishedRelative = item.published_at ? formatRelativeTime(item.published_at) : 'Unknown';
  const publishedExact = item.published_at ? formatDateTime(item.published_at) : null;

  return (
    <article
      className="absolute left-0 w-full rounded-xl border border-transparent bg-white/95 p-4 shadow transition hover:-translate-y-1 hover:border-status-green/50 hover:shadow-lg dark:bg-slate-900/90"
      style={{ transform: `translateY(${offsetTop}px)` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {item.state ?? '??'}
          </span>
          <span>{item.source}</span>
          {item.old_to_new ? (
            <span className="rounded-full bg-status-yellow/80 px-2 py-0.5 text-slate-900">old→new</span>
          ) : null}
        </div>
      </div>
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 block text-base font-semibold text-slate-900 underline-offset-4 hover:underline dark:text-slate-100"
      >
        {item.title}
      </a>
      {item.summary ? (
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{item.summary}</p>
      ) : null}

      <footer className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
        <span title={publishedExact ?? undefined}>Published {publishedRelative}</span>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onAskChat(item)}
            className={clsx(
              buttonBase,
              isActive ? buttonActive : buttonMuted,
              'px-4'
            )}
          >
            Ask ChatGPT
          </button>
          {tags.map((tag) => (
            <span key={tag} className="badge badge-muted">
              {tag}
            </span>
          ))}
        </div>
      </footer>
    </article>
  );
};

export default NewsFeed;
