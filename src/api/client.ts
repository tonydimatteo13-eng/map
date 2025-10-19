import { queryOptions } from '@tanstack/react-query';
import { demoStates, getDemoNewsForState } from '../data/demo';
import { loadNewsForStateFromAirtable, loadStatesFromAirtable } from './airtable';

export type {
  StatusColor,
  StateLink,
  StateStatus,
  StatesResponse,
  NewsItem,
  NewsResponse
} from './types';

export const statesQueryOptions = queryOptions({
  queryKey: ['map', 'states'],
  queryFn: async () => {
    try {
      const states = await loadStatesFromAirtable();
      if (!states.length) {
        console.warn('Airtable returned no state records; using demo fallback.');
        return demoStates;
      }
      return states;
    } catch (error) {
      console.warn('Falling back to demo state data due to Airtable error:', error);
      return demoStates;
    }
  },
  staleTime: 5 * 60 * 1000
});

export const newsQueryOptions = (state: string) =>
  queryOptions({
    queryKey: ['map', 'news', state],
    queryFn: async () => {
      if (!state) {
        return [];
      }

      try {
        const news = await loadNewsForStateFromAirtable(state);
        if (!news.length) {
          console.warn(`Airtable returned no news for ${state}; using demo feed.`);
          return getDemoNewsForState(state);
        }
        return news;
      } catch (error) {
        console.warn('Falling back to demo news data due to Airtable error:', error);
        return getDemoNewsForState(state);
      }
    },
    enabled: !!state,
    staleTime: 60 * 1000
  });
