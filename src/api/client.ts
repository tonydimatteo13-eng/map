import { queryOptions } from '@tanstack/react-query';
import { STATE_BY_CODE, STATE_BY_FIPS } from '../data/states';
import { demoStates, getDemoNewsForState } from '../data/demo';

export type StatusColor = 'green' | 'yellow' | 'red';

export interface StateLink {
  label?: string;
  url: string;
}

export interface StateStatus {
  code: string;
  name: string;
  status: StatusColor;
  reason_short: string;
  updated_at: string;
  confidence: string;
  link?: StateLink | null;
  tags?: string[];
}

export interface StatesResponse {
  states?: StateStatus[];
  data?: StateStatus[];
  [key: string]: unknown;
}

export interface NewsItem {
  id: string;
  state: string;
  title: string;
  url: string;
  source: string;
  published_at: string;
  tags?: string[];
  summary?: string;
  old_to_new?: boolean;
}

export interface NewsResponse {
  news?: NewsItem[];
  items?: NewsItem[];
  data?: NewsItem[];
  [key: string]: unknown;
}

async function fetchJSON<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json'
    },
    ...init
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T;
}

const STATUS_MAP: Record<string, StatusColor> = {
  green: 'green',
  good: 'green',
  stable: 'green',
  low: 'green',
  yellow: 'yellow',
  watch: 'yellow',
  medium: 'yellow',
  caution: 'yellow',
  red: 'red',
  high: 'red',
  critical: 'red'
};

function normalizeStatus(value: unknown): StatusColor {
  if (typeof value === 'string') {
    const key = value.toLowerCase();
    if (STATUS_MAP[key]) {
      return STATUS_MAP[key];
    }
  }
  return 'green';
}

function normalizeStates(payload: StatesResponse | StateStatus[]): StateStatus[] {
  const rawList: unknown[] = (() => {
    if (Array.isArray(payload)) {
      return payload;
    }

    if (Array.isArray(payload.states)) {
      return payload.states;
    }

    if (Array.isArray(payload.data)) {
      return payload.data;
    }

    for (const value of Object.values(payload)) {
      if (Array.isArray(value)) {
        return value;
      }
    }

    return [];
  })();

  return rawList.map((raw, index) => {
    const record = raw as Record<string, unknown>;
    const rawCodeValue = record.code ?? record.state ?? record.abbreviation ?? '';
    const rawCode =
      typeof rawCodeValue === 'string' ? rawCodeValue.toUpperCase() : String(rawCodeValue ?? '').toUpperCase();
    const fipsSource = record.fips ?? record.state_fips ?? record.stateFips ?? '';
    const fipsValue =
      typeof fipsSource === 'string'
        ? fipsSource.padStart(2, '0')
        : String(fipsSource ?? '').padStart(2, '0');
    const metaFromCode = STATE_BY_CODE[rawCode];
    const metaFromFips = fipsValue ? STATE_BY_FIPS[fipsValue] : undefined;
    const resolvedCode = ((metaFromCode ?? metaFromFips)?.code ?? rawCode) || `UNK-${index}`;
    const meta = STATE_BY_CODE[resolvedCode];

    const linkValue = record.link ?? record.url ?? null;
    let link: StateLink | null = null;
    if (typeof linkValue === 'string') {
      link = { url: linkValue };
    } else if (linkValue && typeof linkValue === 'object') {
      const linkRecord = linkValue as Record<string, unknown>;
      const url = linkRecord.url ?? linkRecord.href;
      if (typeof url === 'string') {
        link = { url, label: (linkRecord.label ?? linkRecord.title ?? linkRecord.text) as string | undefined };
      }
    }

    const tags = Array.isArray(record.tags)
      ? (record.tags as unknown[])
          .map((tag) => (tag == null ? null : String(tag)))
          .filter((tag): tag is string => Boolean(tag))
      : [];

    const reasonValue = record.reason_short ?? record.reason ?? record.summary ?? '';
    const updatedValue = record.updated_at ?? record.updatedAt ?? record.last_updated ?? '';
    const confidenceValue = record.confidence ?? record.confidence_label ?? record.certainty ?? 'Unknown';
    const reasonText =
      typeof reasonValue === 'string' ? reasonValue : reasonValue == null ? '' : String(reasonValue);
    const updatedText =
      typeof updatedValue === 'string' ? updatedValue : updatedValue == null ? '' : String(updatedValue);
    const confidenceText =
      typeof confidenceValue === 'string'
        ? confidenceValue
        : confidenceValue == null
        ? 'Unknown'
        : String(confidenceValue);

    return {
      code: resolvedCode,
      name:
        typeof record.name === 'string'
          ? record.name
          : meta?.name ?? (rawCode ? rawCode : resolvedCode),
      status: normalizeStatus(record.status ?? record.color),
      reason_short: reasonText,
      updated_at: updatedText,
      confidence: confidenceText,
      link,
      tags
    };
  });
}

function normalizeNews(payload: NewsResponse | NewsItem[]): NewsItem[] {
  const rawList: unknown[] = (() => {
    if (Array.isArray(payload)) {
      return payload;
    }

    if (Array.isArray(payload.news)) {
      return payload.news;
    }

    if (Array.isArray(payload.items)) {
      return payload.items;
    }

    if (Array.isArray(payload.data)) {
      return payload.data;
    }

    for (const value of Object.values(payload)) {
      if (Array.isArray(value)) {
        return value;
      }
    }

    return [];
  })();

  return rawList.map((raw, index) => {
    const record = raw as Record<string, unknown>;
    const state = (record.state ?? record.region ?? '').toString().toUpperCase();
    const tags = Array.isArray(record.tags)
      ? (record.tags as unknown[])
          .map((tag) => (tag == null ? null : String(tag)))
          .filter((tag): tag is string => Boolean(tag))
      : [];

    const publishedValue = record.published_at ?? record.publishedAt ?? record.date ?? '';

    const titleValue = record.title ?? record.headline ?? 'Untitled';
    const urlValue = record.url ?? record.link ?? '#';
    const sourceValue = record.source ?? record.publisher ?? 'Unknown';

    return {
      id: (record.id ?? `${state}-${index}`).toString(),
      state,
      title: typeof titleValue === 'string' ? titleValue : String(titleValue ?? 'Untitled'),
      url: typeof urlValue === 'string' ? urlValue : '#',
      source: typeof sourceValue === 'string' ? sourceValue : String(sourceValue ?? 'Unknown'),
      published_at: typeof publishedValue === 'string' ? publishedValue : '',
      tags,
      summary: typeof record.summary === 'string' ? record.summary : undefined,
      old_to_new: Boolean(record.old_to_new ?? record.oldToNew ?? record.sequence === 'old_to_new')
    };
  });
}

export const statesQueryOptions = queryOptions({
  queryKey: ['map', 'states'],
  queryFn: async () => {
    try {
      const result = await fetchJSON<StatesResponse | StateStatus[]>('/webhook/map/states');
      const states = normalizeStates(result);
      if (states.length === 0) {
        console.warn('map/states returned no data, falling back to demo data.');
        return demoStates;
      }
      return states;
    } catch (error) {
      console.warn('Falling back to demo state data due to fetch error:', error);
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
        const result = await fetchJSON<NewsResponse | NewsItem[]>(
          `/webhook/map/news?state=${encodeURIComponent(state)}`
        );
        const news = normalizeNews(result);
        if (news.length === 0) {
          console.warn('map/news returned no items, using demo feed.');
          return getDemoNewsForState(state);
        }
        return news;
      } catch (error) {
        console.warn('Falling back to demo news data due to fetch error:', error);
        return getDemoNewsForState(state);
      }
    },
    enabled: !!state,
    staleTime: 60 * 1000
  });
