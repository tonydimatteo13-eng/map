import React from 'react';
import type { StateStatus, StatusColor } from '../api/client';
import { formatDateTime, formatRelativeTime } from '../utils/datetime';

export interface TooltipData extends StateStatus {
  visible: boolean;
}

interface TooltipProps {
  open: boolean;
  state?: TooltipData | null;
  floatingStyles: React.CSSProperties;
  setFloating: (node: HTMLDivElement | null) => void;
  pinned: boolean;
}

const statusLabels: Record<string, string> = {
  green: 'Green',
  yellow: 'Yellow',
  red: 'Red'
};

const statusSwatches: Record<StatusColor, string> = {
  green: '#0f8554',
  yellow: '#ffff33',
  red: '#cc3333'
};

const Tooltip: React.FC<TooltipProps> = ({ open, state, floatingStyles, setFloating, pinned }) => {
  if (!open || !state) {
    return null;
  }

  const statusLabel = statusLabels[state.status] ?? state.status;
  const updated = state.updated_at ? formatRelativeTime(state.updated_at) : 'Unknown';
  const absolute = state.updated_at ? formatDateTime(state.updated_at) : '';
  const confidence = state.confidence ?? 'Unknown';

  const reason = state.reason_short ?? 'No summary available.';

  return (
    <div
      ref={setFloating}
      style={floatingStyles}
      className={`z-50 w-72 rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-lg dark:border-slate-800 dark:bg-slate-900 ${
        pinned ? 'pointer-events-auto' : 'pointer-events-none'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {state.code} — {statusLabel}
          </p>
          <p className="text-base font-semibold text-slate-900 dark:text-slate-100">{state.name}</p>
        </div>
        <span
          className="badge text-slate-900 dark:text-slate-200"
          style={{ backgroundColor: statusSwatches[state.status] }}
        >
          {statusLabel}
        </span>
      </div>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{reason}</p>
      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
        Last updated {updated}
        {absolute ? <span className="block text-[11px] text-slate-400">({absolute})</span> : null}
        <span className="block text-[11px] uppercase tracking-wide text-slate-400">
          Confidence • {confidence}
        </span>
      </p>
      {state.link?.url ? (
        <a
          href={state.link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-status-green underline-offset-4 hover:underline"
        >
          {state.link.label?.trim() ? state.link.label : 'Latest link'}
        </a>
      ) : null}
    </div>
  );
};

export default Tooltip;
