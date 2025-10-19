import React from 'react';
import type { StatusColor } from '../api/client';

interface LegendProps {
  counts: Record<StatusColor, number>;
}

const STATUS_META: Array<{
  status: StatusColor;
  title: string;
  colorClass: string;
  description: string;
}> = [
  {
    status: 'green',
    title: 'Legal',
    colorClass: 'bg-status-green',
    description: 'Permitted for skill cash contests'
  },
  {
    status: 'yellow',
    title: 'Caution',
    colorClass: 'bg-status-yellow',
    description: 'Conditional or watch-outs'
  },
  {
    status: 'red',
    title: 'Illegal',
    colorClass: 'bg-status-red',
    description: 'Restricted or high-friction'
  }
];

const Legend: React.FC<LegendProps> = ({ counts }) => (
  <div className="card">
    <div className="flex items-center justify-between">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
        State Status
      </span>
    </div>
    <div className="mt-4 grid gap-3 sm:grid-cols-3">
      {STATUS_META.map((entry) => (
        <div
          key={entry.status}
          className="flex items-center justify-between rounded-lg border border-slate-200 bg-white/60 p-3 text-sm dark:border-slate-800 dark:bg-slate-900/60"
        >
          <div className="flex items-center gap-3">
            <span className={`inline-block h-3 w-3 rounded-full ${entry.colorClass}`} />
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{entry.title}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{entry.description}</p>
            </div>
          </div>
          <span className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            {counts[entry.status] ?? 0}
          </span>
        </div>
      ))}
    </div>
  </div>
);

export default Legend;
