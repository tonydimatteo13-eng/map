import React from 'react';
import type { StatusColor } from '../api/client';

interface HeaderProps {
  colors: StatusColor[];
  activeColors: Set<StatusColor>;
  availableTags: string[];
  activeTag: string | null;
  changedOnly: boolean;
  onToggleColor: (color: StatusColor) => void;
  onTagChange: (tag: string | null) => void;
  onChangedOnlyChange: (value: boolean) => void;
  onResetFilters: () => void;
}

// const colorLabels: Record<StatusColor, string> = {
//   green: 'Green',
//   yellow: 'Yellow',
//   red: 'Red'
// };

const Header: React.FC<HeaderProps> = ({
  colors: _colors,
  activeColors: _activeColors,
  availableTags,
  activeTag,
  changedOnly,
  onToggleColor: _onToggleColor,
  onTagChange,
  onChangedOnlyChange,
  onResetFilters: _onResetFilters
}) => {
  return (
    <header className="border-b border-slate-200 bg-white/70 backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            US Map Monitoring
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Track state status changes and recent news across the country.
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 lg:w-auto lg:flex-row lg:items-center">
          {/* <div className="flex flex-wrap items-center gap-2">
            {colors.map((color) => {
              const isActive = activeColors.has(color);
              return (
                <button
                  key={color}
                  type="button"
                  onClick={() => onToggleColor(color)}
                  className={`badge transition ${isActive ? colorSwatchClasses[color] : 'badge-muted'} ${
                    isActive ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-900' : ''
                  }`}
                  aria-pressed={isActive}
                >
                  {colorLabels[color]}
                </button>
              );
            })}
          </div> */}

          <div className="flex flex-wrap items-center gap-3">
            {/* <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <span className="whitespace-nowrap text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
                Topic
              </span>
              <select
                className="h-9 min-w-[160px] rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-700 transition hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-status-green dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                value={activeTag ?? ''}
                onChange={(event) => onTagChange(event.target.value || null)}
              >
                <option value="">All topics</option>
                {availableTags.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
            </label> */}

            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <span className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
                Changed in last 30d
              </span>
              <button
                type="button"
                onClick={() => onChangedOnlyChange(!changedOnly)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full border border-slate-300 bg-slate-200 transition ${
                  changedOnly ? 'bg-status-green border-status-green' : ''
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                    changedOnly ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </label>

            {/* <button
              type="button"
              onClick={onResetFilters}
              className="text-sm font-medium text-status-green underline-offset-4 hover:underline"
            >
              Reset
            </button> */}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
