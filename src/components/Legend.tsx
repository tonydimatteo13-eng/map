import React from 'react';

const entries = [
  { label: 'Improving / Stable', color: 'bg-status-green' },
  { label: 'Monitoring', color: 'bg-status-yellow' },
  { label: 'Action Required', color: 'bg-status-red' },
  { label: 'No Data', color: 'bg-status-neutral' }
];

const Legend: React.FC = () => (
  <div className="card flex flex-wrap items-center gap-3 text-sm">
    <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
      Legend
    </span>
    {entries.map((entry) => (
      <span key={entry.label} className="flex items-center gap-2">
        <span className={`inline-block h-3 w-3 rounded-full ${entry.color}`} />
        <span className="text-slate-600 dark:text-slate-300">{entry.label}</span>
      </span>
    ))}
  </div>
);

export default Legend;
