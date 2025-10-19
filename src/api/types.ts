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
