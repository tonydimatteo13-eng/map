import type { NewsItem, StateStatus, StatusColor } from '../api/client';
import { STATE_BY_CODE } from './states';

const redStates = ['WA', 'MT', 'SD', 'SC', 'CT', 'DE', 'LA', 'AR', 'TN'];
const greenStates = [
  'IL',
  'NJ',
  'PA',
  'NY',
  'OH',
  'MA',
  'MI',
  'VA',
  'NC',
  'GA',
  'AL',
  'MS',
  'MO',
  'MN',
  'WI',
  'IA',
  'KS',
  'OK',
  'NM',
  'CO',
  'UT',
  'NV',
  'ID',
  'OR',
  'MD',
  'DC',
  'KY',
  'WV',
  'VT',
  'NH',
  'RI',
  'TX',
  'NE',
  'WY',
  'ND'
];
const yellowStates = ['IN', 'ME', 'AZ', 'FL', 'CA'];

const reasonByStatus: Record<StatusColor, string> = {
  green: 'Friendly outlook with clear regulatory guidance for skill cash games.',
  yellow: 'Mixed regulatory signals; monitor compliance requirements closely.',
  red: 'High friction for skill cash operations; current environment is restrictive.'
};

const confidenceByStatus: Record<StatusColor, string> = {
  green: 'High',
  yellow: 'Medium',
  red: 'Low'
};

const baseTimestamp = Date.UTC(2024, 8, 15); // September 15, 2024

function makeState(code: string, status: StatusColor, offsetIndex: number): StateStatus {
  const meta = STATE_BY_CODE[code];
  const updatedAt = new Date(baseTimestamp + offsetIndex * 36 * 60 * 60 * 1000).toISOString();

  return {
    code,
    name: meta?.name ?? code,
    status,
    reason_short: reasonByStatus[status],
    updated_at: updatedAt,
    confidence: confidenceByStatus[status],
    link: {
      url: `https://example.com/insights/${code.toLowerCase()}`,
      label: `${code} policy brief`
    },
    tags:
      status === 'green'
        ? ['regulation', 'friendly']
        : status === 'yellow'
        ? ['monitor', 'compliance']
        : ['restriction', 'legal']
  };
}

export const demoStates: StateStatus[] = [
  ...redStates.map((code, index) => makeState(code, 'red', index)),
  ...greenStates.map((code, index) => makeState(code, 'green', index + redStates.length)),
  ...yellowStates.map(
    (code, index) => makeState(code, 'yellow', index + redStates.length + greenStates.length)
  )
];

export const demoNews: NewsItem[] = [
  {
    id: 'WA-20241005',
    state: 'WA',
    title: 'Washington regulators uphold strict stance on skill gaming payouts',
    url: 'https://example.com/news/wa-2024-skill-gaming',
    source: 'Reg Review Daily',
    published_at: '2024-10-05T13:00:00Z',
    tags: ['restriction', 'litigation'],
    summary:
      'The Washington Gambling Commission reaffirmed enforcement actions that limit real-money skill contests pending legislative review.',
    old_to_new: true
  },
  {
    id: 'TN-20240928',
    state: 'TN',
    title: 'Tennessee considers pilot program for cash tournaments',
    url: 'https://example.com/news/tn-cash-tournament-pilot',
    source: 'Volunteer Ledger',
    published_at: '2024-09-28T08:30:00Z',
    tags: ['restriction', 'pilot'],
    summary:
      'Lawmakers floated a one-year pilot for skill-based cash tournaments, but key committees remain skeptical.',
    old_to_new: false
  },
  {
    id: 'NJ-20241009',
    state: 'NJ',
    title: 'New Jersey expands licensing for skill gaming operators',
    url: 'https://example.com/news/nj-licensing-update',
    source: 'Garden State Times',
    published_at: '2024-10-09T16:15:00Z',
    tags: ['regulation', 'friendly'],
    summary:
      'Updated Division of Gaming Enforcement rules clarify onboarding requirements for skill-based contests with cash stakes.',
    old_to_new: false
  },
  {
    id: 'AZ-20240922',
    state: 'AZ',
    title: 'Arizona issues compliance memo on cash contest disclosures',
    url: 'https://example.com/news/az-compliance-memo',
    source: 'Sonoran Business Journal',
    published_at: '2024-09-22T11:05:00Z',
    tags: ['monitor', 'compliance'],
    summary:
      'Operators must file quarterly disclosures to maintain conditional approval for skill-based tournaments statewide.',
    old_to_new: false
  },
  {
    id: 'CA-20241003',
    state: 'CA',
    title: 'California AG signals review of peer-to-peer skill contests',
    url: 'https://example.com/news/ca-ag-review',
    source: 'Golden State Insider',
    published_at: '2024-10-03T19:45:00Z',
    tags: ['monitor', 'policy'],
    summary:
      'A working group will examine player protections and payout structures before recommending changes to state law.',
    old_to_new: false
  },
  {
    id: 'TX-20241001',
    state: 'TX',
    title: 'Texas lawmakers praise self-regulatory framework for skill games',
    url: 'https://example.com/news/tx-self-regulation',
    source: 'Lone Star Ledger',
    published_at: '2024-10-01T14:20:00Z',
    tags: ['friendly', 'legislation'],
    summary:
      'Industry-led standards are credited with maintaining consumer protections while enabling statewide expansion.',
    old_to_new: false
  }
];

export function getDemoNewsForState(stateCode: string): NewsItem[] {
  const normalized = stateCode.toUpperCase();
  const matches = demoNews.filter((item) => item.state === normalized);
  if (matches.length > 0) {
    return matches;
  }
  return demoNews.slice(0, 3);
}
