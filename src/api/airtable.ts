import type { NewsItem, StateStatus, StatusColor } from './types';
import { STATE_BY_CODE } from '../data/states';

interface AirtableRecord<TFields> {
  id: string;
  createdTime: string;
  fields: TFields;
}

interface AirtableQueryOptions {
  fields?: string[];
  filterByFormula?: string;
  maxRecords?: number;
  pageSize?: number;
  sort?: Array<{ field: string; direction?: 'asc' | 'desc' }>;
  view?: string;
}

interface AirtableStateFields {
  code?: string;
  name?: string;
  status?: string;
  reason_short?: string;
  last_updated?: string;
  confidence?: number | string | null;
  latest_link?: string;
  latest_title?: string;
  news?: string[];
}

interface AirtableNewsFields {
  state?: string[];
  published_at?: string;
  source?: string;
  title?: string;
  url?: string;
  summary?: string;
  topic_tags?: string[];
  impact?: string;
  confidence?: number | string | null;
  status_change_from?: string;
  status_change_to?: string;
}

const DEFAULT_BASE_ID = 'appu3EJIBXxGqsmRN';
const AIRTABLE_PAT =
  import.meta.env.VITE_AIRTABLE_PAT ??
  import.meta.env.VITE_AIRTABLE_TOKEN ??
  import.meta.env.VITE_AIRTABLE_API_KEY ??
  '';
const AIRTABLE_BASE_ID = import.meta.env.VITE_AIRTABLE_BASE_ID ?? DEFAULT_BASE_ID;
const AIRTABLE_API_BASE_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`;

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

const STATUS_RANK: Record<StatusColor, number> = {
  green: 1,
  yellow: 2,
  red: 3
};

const stateCodeToRecordId = new Map<string, string>();
const stateRecordIdToCode = new Map<string, string>();

let statesPromise: Promise<StateStatus[]> | null = null;
let newsRecordsPromise: Promise<AirtableRecord<AirtableNewsFields>[]> | null = null;
let newsByStateCache: Map<string, NewsItem[]> | null = null;

function ensureConfigured(): void {
  if (!AIRTABLE_PAT) {
    throw new Error('Missing Airtable PAT. Set VITE_AIRTABLE_PAT (or VITE_AIRTABLE_TOKEN).');
  }
}

async function fetchAllRecords<TFields>(
  tableName: string,
  options: AirtableQueryOptions = {}
): Promise<AirtableRecord<TFields>[]> {
  ensureConfigured();

  const records: AirtableRecord<TFields>[] = [];
  let offset: string | undefined;

  do {
    const searchParams = new URLSearchParams();
    if (options.view) {
      searchParams.append('view', options.view);
    }
    if (typeof options.maxRecords === 'number') {
      searchParams.append('maxRecords', options.maxRecords.toString());
    }
    if (typeof options.pageSize === 'number') {
      searchParams.append('pageSize', options.pageSize.toString());
    }
    if (Array.isArray(options.fields)) {
      for (const field of options.fields) {
        searchParams.append('fields[]', field);
      }
    }
    if (options.filterByFormula) {
      searchParams.append('filterByFormula', options.filterByFormula);
    }
    if (Array.isArray(options.sort)) {
      options.sort.forEach((sort, index) => {
        if (sort.field) {
          searchParams.append(`sort[${index}][field]`, sort.field);
        }
        if (sort.direction) {
          searchParams.append(`sort[${index}][direction]`, sort.direction);
        }
      });
    }
    if (offset) {
      searchParams.append('offset', offset);
    }

    const url = `${AIRTABLE_API_BASE_URL}/${encodeURIComponent(tableName)}?${searchParams.toString()}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${AIRTABLE_PAT}`
      }
    });

    if (!response.ok) {
      const bodyText = await response.text().catch(() => '');
      throw new Error(`Airtable request failed (${response.status} ${response.statusText}): ${bodyText}`);
    }

    const payload = (await response.json()) as { records?: AirtableRecord<TFields>[]; offset?: string };
    if (Array.isArray(payload.records)) {
      records.push(...payload.records);
    }
    offset = payload.offset;
  } while (offset);

  return records;
}

function normalizeStatus(value: unknown): StatusColor {
  if (typeof value === 'string') {
    const key = value.toLowerCase();
    if (STATUS_MAP[key]) {
      return STATUS_MAP[key];
    }
  }
  return 'green';
}

function formatConfidence(value: unknown): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value >= 0.75) {
      return 'High';
    }
    if (value >= 0.5) {
      return 'Medium';
    }
    if (value > 0) {
      return 'Low';
    }
    return 'Unknown';
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed) {
      return trimmed;
    }
  }

  return 'Unknown';
}

function buildStateStatus(
  record: AirtableRecord<AirtableStateFields>,
  tagsByState: Map<string, Set<string>>
): StateStatus | null {
  const fields = record.fields ?? {};
  const rawCode = (fields.code ?? '').toString().toUpperCase();
  if (!rawCode) {
    return null;
  }

  const meta = STATE_BY_CODE[rawCode];
  const linkUrl = typeof fields.latest_link === 'string' ? fields.latest_link.trim() : '';
  const linkTitle = typeof fields.latest_title === 'string' ? fields.latest_title.trim() : '';
  const tags = Array.from(tagsByState.get(rawCode) ?? []);

  return {
    code: rawCode,
    name: typeof fields.name === 'string' && fields.name.trim() ? fields.name : meta?.name ?? rawCode,
    status: normalizeStatus(fields.status),
    reason_short: typeof fields.reason_short === 'string' ? fields.reason_short : '',
    updated_at: typeof fields.last_updated === 'string' ? fields.last_updated : '',
    confidence: formatConfidence(fields.confidence),
    link: linkUrl ? { url: linkUrl, label: linkTitle || undefined } : null,
    tags
  };
}

function collectTagsFromNews(
  newsRecords: AirtableRecord<AirtableNewsFields>[],
  recordIdToCode: Map<string, string>
): Map<string, Set<string>> {
  const tagMap = new Map<string, Set<string>>();

  for (const record of newsRecords) {
    const fields = record.fields ?? {};
    const stateIds = Array.isArray(fields.state) ? fields.state : [];
    const tags = Array.isArray(fields.topic_tags)
      ? fields.topic_tags.map((tag) => tag?.toString()).filter((tag): tag is string => Boolean(tag))
      : [];

    if (!tags.length || !stateIds.length) {
      continue;
    }

    for (const stateId of stateIds) {
      const code = recordIdToCode.get(stateId);
      if (!code) {
        continue;
      }
      if (!tagMap.has(code)) {
        tagMap.set(code, new Set());
      }
      const set = tagMap.get(code)!;
      tags.forEach((tag) => set.add(tag));
    }
  }

  return tagMap;
}

function buildNewsCache(
  newsRecords: AirtableRecord<AirtableNewsFields>[],
  recordIdToCode: Map<string, string>
): Map<string, NewsItem[]> {
  const cache = new Map<string, NewsItem[]>();

  for (const record of newsRecords) {
    const fields = record.fields ?? {};
    const stateIds = Array.isArray(fields.state) ? fields.state : [];
    if (!stateIds.length) {
      continue;
    }

    const topicTags = Array.isArray(fields.topic_tags)
      ? fields.topic_tags.map((tag) => tag?.toString()).filter((tag): tag is string => Boolean(tag))
      : [];
    const baseTags = new Set<string>(topicTags);

    const impact = typeof fields.impact === 'string' ? fields.impact.trim() : '';
    if (impact) {
      baseTags.add(`impact:${impact}`);
    }

    const confidenceLabel = formatConfidence(fields.confidence);
    if (confidenceLabel && confidenceLabel !== 'Unknown') {
      baseTags.add(`confidence:${confidenceLabel.toLowerCase()}`);
    }

    const statusFrom = typeof fields.status_change_from === 'string' ? normalizeStatus(fields.status_change_from) : null;
    const statusTo = typeof fields.status_change_to === 'string' ? normalizeStatus(fields.status_change_to) : null;
    const indicatesImprovement =
      statusFrom && statusTo ? STATUS_RANK[statusTo] < STATUS_RANK[statusFrom] : false;
    const indicatesChange = statusFrom && statusTo ? statusFrom !== statusTo : false;

    const publishedAt = typeof fields.published_at === 'string' ? fields.published_at : '';
    const source = typeof fields.source === 'string' && fields.source.trim() ? fields.source : 'Unknown';
    const title = typeof fields.title === 'string' && fields.title.trim() ? fields.title : 'Untitled';
    const url = typeof fields.url === 'string' && fields.url.trim() ? fields.url : '#';
    const summary =
      typeof fields.summary === 'string' && fields.summary.trim() ? fields.summary.trim() : undefined;

    const allTags = Array.from(baseTags);

    for (const stateId of stateIds) {
      const code = recordIdToCode.get(stateId);
      if (!code) {
        continue;
      }

      const item: NewsItem = {
        id: `${record.id}-${code}`,
        state: code,
        title,
        url,
        source,
        published_at: publishedAt,
        summary,
        tags: allTags,
        old_to_new: indicatesChange ? indicatesImprovement : false
      };

      if (!cache.has(code)) {
        cache.set(code, []);
      }
      cache.get(code)!.push(item);
    }
  }

  for (const [stateCode, items] of cache) {
    items.sort((a, b) => {
      const aTime = a.published_at ? Date.parse(a.published_at) : 0;
      const bTime = b.published_at ? Date.parse(b.published_at) : 0;
      return bTime - aTime;
    });
    cache.set(stateCode, items);
  }

  return cache;
}

async function ensureNewsRecords(): Promise<AirtableRecord<AirtableNewsFields>[]> {
  if (!newsRecordsPromise) {
    const requestPromise = fetchAllRecords<AirtableNewsFields>('news', {
      fields: [
        'state',
        'published_at',
        'source',
        'title',
        'url',
        'summary',
        'topic_tags',
        'impact',
        'confidence',
        'status_change_from',
        'status_change_to'
      ],
      sort: [{ field: 'published_at', direction: 'desc' }],
      maxRecords: 200,
      view: 'Grid view'
    });

    newsRecordsPromise = requestPromise.catch((error) => {
      newsRecordsPromise = null;
      throw error;
    });
  }

  return newsRecordsPromise;
}

export async function loadStatesFromAirtable(): Promise<StateStatus[]> {
  if (statesPromise) {
    return statesPromise;
  }

  statesPromise = (async () => {
    const stateRecordsPromise = fetchAllRecords<AirtableStateFields>('states', {
      fields: [
        'code',
        'name',
        'status',
        'reason_short',
        'last_updated',
        'confidence',
        'latest_link',
        'latest_title',
        'news'
      ],
      sort: [
        { field: 'status', direction: 'asc' },
        { field: 'code', direction: 'asc' }
      ],
      view: 'Grid view'
    });

    const [stateRecords, newsRecords] = await Promise.all([stateRecordsPromise, ensureNewsRecords()]);

    stateCodeToRecordId.clear();
    stateRecordIdToCode.clear();

    for (const record of stateRecords) {
      const fields = record.fields ?? {};
      const code = (fields.code ?? '').toString().toUpperCase();
      if (!code) {
        continue;
      }
      stateCodeToRecordId.set(code, record.id);
      stateRecordIdToCode.set(record.id, code);
    }

    const tagsByState = collectTagsFromNews(newsRecords, stateRecordIdToCode);

    const normalizedStates = stateRecords
      .map((record) => buildStateStatus(record, tagsByState))
      .filter((record): record is StateStatus => Boolean(record))
      .sort((a, b) => a.code.localeCompare(b.code));

    newsByStateCache = buildNewsCache(newsRecords, stateRecordIdToCode);

    return normalizedStates;
  })();

  try {
    return await statesPromise;
  } catch (error) {
    statesPromise = null;
    throw error;
  }
}

export async function loadNewsForStateFromAirtable(stateCode: string): Promise<NewsItem[]> {
  if (!stateCode) {
    return [];
  }

  const normalizedCode = stateCode.toUpperCase();

  await loadStatesFromAirtable();

  if (!newsByStateCache) {
    const newsRecords = await ensureNewsRecords();
    newsByStateCache = buildNewsCache(newsRecords, stateRecordIdToCode);
  }

  return newsByStateCache.get(normalizedCode) ?? [];
}

export function clearAirtableCaches(): void {
  statesPromise = null;
  newsRecordsPromise = null;
  newsByStateCache = null;
  stateCodeToRecordId.clear();
  stateRecordIdToCode.clear();
}

export { normalizeStatus };
