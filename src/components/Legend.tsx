import React from 'react';
import clsx from 'clsx';
import type { StatusColor } from '../api/client';
import { buttonActive, buttonBase, buttonMuted } from '../styles/buttons';

interface LegendProps {
  counts: Record<StatusColor, number>;
  activeColors: Set<StatusColor>;
  onToggleColor: (status: StatusColor) => void;
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

const Legend: React.FC<LegendProps> = ({ counts, activeColors, onToggleColor }) => (
  <div className="card">
    <div className="flex items-center justify-between">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
        State Status
      </span>
    </div>
    <div className="mt-4 grid gap-3 sm:grid-cols-3">
      {STATUS_META.map((entry) => (
        <button
          key={entry.status}
          type="button"
          onClick={() => onToggleColor(entry.status)}
          aria-pressed={activeColors.has(entry.status)}
          className={clsx(
            buttonBase,
            'w-full justify-between rounded-xl text-left text-sm',
            activeColors.has(entry.status) ? buttonActive : buttonMuted
          )}
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
        </button>
      ))}
    </div>
  </div>
);

export default Legend;
