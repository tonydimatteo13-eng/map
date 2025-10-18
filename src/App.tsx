import React, { lazy, useEffect, useMemo, useState } from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { StateStatus, StatusColor, statesQueryOptions } from './api/client';
import Header from './components/Header';
import Legend from './components/Legend';
import MapUS from './components/MapUS';

const NewsFeed = lazy(() => import('./components/NewsFeed'));

type ThemeMode = 'light' | 'dark';

export interface AppProps {
  themeStorageKey: string;
}

function isChangedWithin(state: StateStatus, days: number) {
  if (!state.updated_at) {
    return false;
  }

  const updated = new Date(state.updated_at);
  if (Number.isNaN(updated.getTime())) {
    return false;
  }

  const now = new Date();
  const diffMs = now.getTime() - updated.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays <= days;
}

const ALL_COLORS: StatusColor[] = ['green', 'yellow', 'red'];

const App: React.FC<AppProps> = ({ themeStorageKey }) => {
  const { data: states } = useSuspenseQuery(statesQueryOptions);

  const [colorFilters, setColorFilters] = useState<Set<StatusColor>>(new Set(ALL_COLORS));
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [changedOnly, setChangedOnly] = useState(false);
  const [selectedState, setSelectedState] = useState(() => states[0]?.code ?? '');
  const [theme, setTheme] = useState<ThemeMode>(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  );

  useEffect(() => {
    if (selectedState) {
      const exists = states.some((state) => state.code === selectedState);
      if (!exists && states[0]) {
        setSelectedState(states[0].code);
      }
    } else if (states[0]) {
      setSelectedState(states[0].code);
    }
  }, [selectedState, states]);

  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    for (const entry of states) {
      if (Array.isArray(entry.tags)) {
        entry.tags.forEach((tag) => tagSet.add(tag));
      }
    }
    return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
  }, [states]);

  const filteredStates = useMemo(() => {
    const shouldFilterByTag = Boolean(tagFilter);
    return states.map((state) => {
      const matchesColor = colorFilters.size === 0 || colorFilters.has(state.status);
      const matchesTag =
        !shouldFilterByTag || (Array.isArray(state.tags) && state.tags.includes(tagFilter!));
      const matchesChanged = !changedOnly || isChangedWithin(state, 30);
      const visible = matchesColor && matchesTag && matchesChanged;
      return { ...state, visible };
    });
  }, [states, colorFilters, tagFilter, changedOnly]);

  const onToggleColor = (color: StatusColor) => {
    setColorFilters((prev) => {
      const next = new Set(prev);
      if (next.has(color)) {
        next.delete(color);
      } else {
        next.add(color);
      }
      return next;
    });
  };

  const onResetFilters = () => {
    setColorFilters(new Set(ALL_COLORS));
    setTagFilter(null);
    setChangedOnly(false);
  };

  const handleThemeChange = (nextTheme: ThemeMode) => {
    setTheme(nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem(themeStorageKey, nextTheme);
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 transition-colors dark:bg-slate-950">
      <Header
        theme={theme}
        colors={ALL_COLORS}
        activeColors={colorFilters}
        availableTags={availableTags}
        activeTag={tagFilter}
        changedOnly={changedOnly}
        onToggleColor={onToggleColor}
        onTagChange={setTagFilter}
        onChangedOnlyChange={setChangedOnly}
        onResetFilters={onResetFilters}
        onThemeChange={handleThemeChange}
      />

      <main className="flex flex-1 flex-col gap-6 px-4 pb-6 pt-4 lg:flex-row lg:items-start lg:px-8">
        <section className="flex w-full flex-1 flex-col gap-4">
          <Legend />
          <div className="card h-full">
            <MapUS
              states={filteredStates}
              selectedState={selectedState}
              onSelectState={setSelectedState}
            />
          </div>
        </section>

        <aside className="w-full shrink-0 lg:w-[350px] xl:w-[400px]">
          <React.Suspense
            fallback={<div className="card text-sm text-slate-500">Loading news…</div>}
          >
            <NewsFeed stateCode={selectedState} />
          </React.Suspense>
        </aside>
      </main>
    </div>
  );
};

export default App;
