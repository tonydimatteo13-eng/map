import React, { useMemo, useRef } from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useVirtualizer, type VirtualItem } from '@tanstack/react-virtual';
import { newsQueryOptions, NewsItem } from '../api/client';
import { formatDateTime, formatRelativeTime } from '../utils/datetime';

interface NewsFeedProps {
  stateCode: string;
}

const NewsFeed: React.FC<NewsFeedProps> = ({ stateCode }) => {
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
    <div className="card flex h-[520px] flex-col gap-3">
      <header className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          Latest Headlines
        </p>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          {stateCode} News Feed
        </h2>
      </header>

      <div ref={parentRef} className="custom-scrollbar flex-1 overflow-auto">
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
}

const NewsCard: React.FC<NewsCardProps> = ({ item, virtualItem }) => {
  const offsetTop = virtualItem.start;
  const tags = item.tags ?? [];
  const publishedRelative = item.published_at ? formatRelativeTime(item.published_at) : 'Unknown';
  const publishedExact = item.published_at ? formatDateTime(item.published_at) : null;

  return (
    <article
      className="absolute left-0 w-full rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
      style={{ transform: `translateY(${offsetTop}px)` }}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="badge badge-muted">{item.state ?? '??'}</span>
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
          <span>{item.source}</span>
          {item.old_to_new ? <span className="badge bg-status-yellow text-slate-900">old→new</span> : null}
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

      <footer className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span title={publishedExact ?? undefined}>Published {publishedRelative}</span>
        <div className="flex flex-wrap gap-1">
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
