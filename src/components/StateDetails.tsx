import React, { useMemo } from 'react';
import type { StateStatus, StatusColor } from '../api/client';
import { formatDateTime, formatRelativeTime } from '../utils/datetime';

interface StateDetailsProps {
  state: StateStatus | null;
}

const statusLabels: Record<StatusColor, string> = {
  green: 'Legal',
  yellow: 'Caution',
  red: 'Illegal'
};

const statusClassName: Record<StatusColor, string> = {
  green: 'bg-status-green text-slate-900',
  yellow: 'bg-status-yellow text-slate-900',
  red: 'bg-status-red text-white'
};

const StateDetails: React.FC<StateDetailsProps> = ({ state }) => {
  const formatted = useMemo(() => {
    if (!state?.updated_at) {
      return { relative: 'Unknown', absolute: '' };
    }
    return {
      relative: formatRelativeTime(state.updated_at),
      absolute: formatDateTime(state.updated_at)
    };
  }, [state]);

  if (!state) {
    return (
      <div className="card text-sm text-slate-500">
        Select a state to view details and open the latest source link.
      </div>
    );
  }

  const statusLabel = statusLabels[state.status] ?? state.status;

  return (
    <div className="card flex flex-col gap-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            {state.code} — {statusLabel}
          </p>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{state.name}</h2>
        </div>
        <span className={`badge ${statusClassName[state.status]}`}>{statusLabel}</span>
      </header>

      {state.reason_short ? (
        <p className="text-sm text-slate-600 dark:text-slate-300">{state.reason_short}</p>
      ) : (
        <p className="text-sm text-slate-500 dark:text-slate-400">No summary available.</p>
      )}

      <dl className="grid grid-cols-2 gap-3 text-xs text-slate-500 dark:text-slate-400">
        <div>
          <dt className="uppercase tracking-wide">Last Updated</dt>
          <dd className="text-slate-700 dark:text-slate-200">
            {formatted.relative}
            {formatted.absolute ? (
              <span className="block text-[11px] text-slate-400 dark:text-slate-500">
                ({formatted.absolute})
              </span>
            ) : null}
          </dd>
        </div>
        <div>
          <dt className="uppercase tracking-wide">Confidence</dt>
          <dd className="text-slate-700 dark:text-slate-200">{state.confidence ?? 'Unknown'}</dd>
        </div>
      </dl>

      {state.tags && state.tags.length ? (
        <div className="flex flex-wrap gap-2">
          {state.tags.map((tag) => (
            <span key={tag} className="badge badge-muted text-xs">
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      {state.link?.url ? (
        <a
          href={state.link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-md border border-status-green bg-status-green/10 px-3 py-2 text-sm font-medium text-status-green transition hover:bg-status-green/20"
        >
          {state.link.label?.trim() ? state.link.label : 'Open latest link'}
        </a>
      ) : null}
    </div>
  );
};

export default StateDetails;
