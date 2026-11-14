import type { Disc } from '../discs/disc'

/** Sample discs for local development only (?demo). Based on the original prototype. */
const base = {
  is_public: true, status: 'shipped', cover_tag: null, shipped_on: null, url: null,
  image_path: null, image_mode: 'art', spine_wide: false, made_for: null, kind: null,
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
} as const

const d = (i: number, x: Partial<Disc> & Pick<Disc, 'title' | 'cover_bg' | 'cover_fg' | 'pattern' | 'thickness' | 'height'>): Disc => ({
  ...base, id: `demo-${i}`, position: i, spine_text: null, description: null, tags: [], ...x,
})

export const demoDiscs: Disc[] = [
  d(1, { title: 'Notion Task Assistant', spine_text: 'Notion Tasks', made_for: 'Personal', kind: 'Workflow', cover_bg: '#e9a6c2', cover_fg: '#3a1226', pattern: 'checks', thickness: 30, height: 330, description: 'A Notion task database with its own tagging taxonomy and a Today / This Week / Some Day flow, with Claude as the assistant on top.', tags: ['Notion', 'Claude'] }),
  d(2, { title: 'Calendar Assistant', spine_text: 'Calendar', made_for: 'Personal', kind: 'Workflow', cover_bg: '#2f7d4f', cover_fg: '#e6f4ea', pattern: 'grid', thickness: 22, height: 352, description: 'A Google Calendar assistant across nine calendars.', tags: ['Google Calendar', 'Claude'] }),
  d(3, { title: 'Clinical Session Recorder', spine_text: 'Session Recorder', made_for: 'Demo org', kind: 'Power Apps', cover_bg: '#1f3d93', cover_fg: '#e2e8ff', pattern: 'rings', thickness: 56, height: 378, cover_tag: '2025', description: 'An audio-recording app for capturing sessions.', tags: ['Power Apps', 'Power Fx'] }),
  d(4, { title: 'Desk Manager', spine_text: 'Desk Manager', made_for: 'Side project', kind: 'Discord bot', cover_bg: '#171717', cover_fg: '#c6f36a', pattern: 'candles', thickness: 40, height: 332, tags: ['C#', '.NET', 'Discord'] }),
  d(5, { title: 'Vaulted', spine_text: 'Vaulted', made_for: 'Personal Project', kind: 'Web app', cover_bg: '#3b3b3b', cover_fg: '#ebe6d8', pattern: 'brackets', spine_wide: true, thickness: 44, height: 350, url: 'https://vaulted.nuennuen.com/', description: 'A place to share and store all the media you have consumed.', tags: ['C#', '.NET', 'React'] }),
  d(6, { title: 'Forex Simulator', spine_text: 'Forex Sim', made_for: 'Side project', kind: '.NET platform', cover_bg: '#f2c230', cover_fg: '#1a1a1a', pattern: 'chart', thickness: 34, height: 346, tags: ['Blazor', 'SignalR'] }),
]
