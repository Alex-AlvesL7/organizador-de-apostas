import { prisma } from './prisma';

// ============================================================
// football-data.org v4 API client
// Replaces API-Football with football-data.org
// Transforms responses to match the format the frontend expects
// ============================================================

const FOOTBALL_DATA_KEY = process.env.FOOTBALL_DATA_KEY || '';
const BASE_URL = 'https://api.football-data.org/v4';

// --- CACHING (same as before) ---
export async function getFromCache(cacheKey: string): Promise<any | null> {
  try {
    const cached = await prisma.apiCache.findUnique({ where: { cacheKey } });
    if (cached && cached.expiresAt > new Date()) return cached.data;
    if (cached) await prisma.apiCache.delete({ where: { cacheKey } }).catch(() => {});
    return null;
  } catch (error) {
    console.error('Cache read error:', error);
    return null;
  }
}

export async function setCache(cacheKey: string, data: any, ttlMinutes: number): Promise<void> {
  try {
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
    await prisma.apiCache.upsert({
      where: { cacheKey },
      create: { cacheKey, data, expiresAt },
      update: { data, expiresAt },
    });
  } catch (error) {
    console.error('Cache write error:', error);
  }
}

// --- Status mapping: football-data.org → short codes the frontend expects ---
function mapStatus(fdStatus: string, minute?: number | null): { short: string; elapsed: number | null } {
  const map: Record<string, string> = {
    SCHEDULED: 'NS',
    TIMED: 'NS',
    IN_PLAY: 'LIVE',
    PAUSED: 'HT',
    FINISHED: 'FT',
    SUSPENDED: 'SUSP',
    POSTPONED: 'PST',
    CANCELLED: 'CANC',
    AWARDED: 'AWD',
  };
  return { short: map[fdStatus] || fdStatus, elapsed: minute ?? null };
}

// --- Transform a football-data.org match object to our unified format ---
export function transformMatch(m: any): any {
  const utc = m.utcDate ? new Date(m.utcDate) : new Date();
  const timestamp = Math.floor(utc.getTime() / 1000);
  const status = mapStatus(m.status, m.minute);
  return {
    fixture: {
      id: m.id,
      date: m.utcDate,
      timestamp,
      venue: { name: m.venue || null },
      status,
    },
    league: {
      id: m.competition?.id,
      name: m.competition?.name,
      country: m.area?.name || '',
      logo: m.competition?.emblem || '',
      flag: m.area?.flag || '',
      season: m.season?.id || new Date().getFullYear(),
      round: m.matchday ? `Rodada ${m.matchday}` : (m.stage || ''),
    },
    teams: {
      home: {
        id: m.homeTeam?.id,
        name: m.homeTeam?.name || m.homeTeam?.shortName || 'TBD',
        logo: m.homeTeam?.crest || '',
      },
      away: {
        id: m.awayTeam?.id,
        name: m.awayTeam?.name || m.awayTeam?.shortName || 'TBD',
        logo: m.awayTeam?.crest || '',
      },
    },
    goals: {
      home: m.score?.fullTime?.home ?? null,
      away: m.score?.fullTime?.away ?? null,
    },
    score: m.score,
    // Keep raw statistics if present (only in single match detail)
    _rawHomeStats: m.homeTeam?.statistics || null,
    _rawAwayStats: m.awayTeam?.statistics || null,
    _rawH2H: m.head2head || null,
  };
}

// --- Generic fetch from football-data.org ---
export async function fetchFromFootballData(endpoint: string, params: Record<string, any> = {}): Promise<any> {
  const qs = new URLSearchParams(
    Object.entries(params).reduce((acc, [k, v]) => {
      if (v !== null && v !== undefined) acc[k] = String(v);
      return acc;
    }, {} as Record<string, string>)
  ).toString();

  const url = `${BASE_URL}${endpoint}${qs ? `?${qs}` : ''}`;

  const response = await fetch(url, {
    headers: { 'X-Auth-Token': FOOTBALL_DATA_KEY },
  });

  if (!response.ok) {
    if (response.status === 429) {
      console.warn('football-data.org rate limit reached. Returning empty.');
      return { matches: [], resultSet: { count: 0 } };
    }
    const text = await response.text().catch(() => '');
    console.error(`football-data.org ${response.status}: ${text}`);
    throw new Error(`football-data.org error: ${response.status}`);
  }

  return response.json();
}

// --- Get today's matches (all available competitions) ---
// Uses a wide UTC date window to cover timezone differences (e.g. BRT = UTC-3).
// The frontend's local "today" may span two UTC days, so we fetch today-1 to today+1
// and let the frontend handle display grouping.
export async function getFixtures(date?: string, competitionCode?: string): Promise<any> {
  const today = new Date().toISOString().split('T')[0];
  const requestDate = date || today;
  const cacheKey = `fd_fixtures_${requestDate}_${competitionCode || 'all'}`;
  const cached = await getFromCache(cacheKey);
  if (cached) return cached;

  // Build a wider UTC window: from requestDate to requestDate+1
  // This covers timezone offsets (e.g. BRT=UTC-3: a match at 00:30 UTC on day+1
  // is actually 21:30 local time on the requested day)
  const d = new Date(requestDate + 'T00:00:00Z');
  const dateFrom = requestDate;
  const dayAfterNext = new Date(d.getTime() + 2 * 24 * 60 * 60 * 1000);
  const dateTo = dayAfterNext.toISOString().split('T')[0]; // requestDate + 2 days

  let data: any;
  const params: Record<string, any> = { dateFrom, dateTo };

  if (competitionCode) {
    data = await fetchFromFootballData(`/competitions/${competitionCode}/matches`, params);
  } else {
    data = await fetchFromFootballData('/matches', params);
  }

  const allMatches = (data?.matches || []).map(transformMatch);

  const result = { response: allMatches, results: allMatches.length };

  await setCache(cacheKey, result, 15); // 15 min cache for fresher data
  return result;
}

// --- Get a single match by ID (includes h2h aggregation and stats if finished) ---
export async function getMatchById(matchId: number): Promise<any> {
  const cacheKey = `fd_match_${matchId}`;
  const cached = await getFromCache(cacheKey);
  if (cached) return cached;

  const data = await fetchFromFootballData(`/matches/${matchId}`);
  const result = transformMatch(data);

  const ttl = result.fixture.status.short === 'FT' ? 1440 : 15;
  await setCache(cacheKey, result, ttl);
  return result;
}

// --- Get H2H for two teams using team matches endpoint ---
export async function getH2H(team1: number, team2: number): Promise<any> {
  const cacheKey = `fd_h2h_${team1}_${team2}`;
  const cached = await getFromCache(cacheKey);
  if (cached) return cached;

  // football-data.org: get finished matches for team1, then filter by team2
  const data = await fetchFromFootballData(`/teams/${team1}/matches`, {
    status: 'FINISHED',
    limit: 50,
  });

  const h2hMatches = (data?.matches || [])
    .filter((m: any) => {
      const hId = m.homeTeam?.id;
      const aId = m.awayTeam?.id;
      return (hId === team1 && aId === team2) || (hId === team2 && aId === team1);
    })
    .slice(0, 10)
    .map(transformMatch);

  const result = { response: h2hMatches, results: h2hMatches.length };
  await setCache(cacheKey, result, 1440);
  return result;
}

// --- Get recent form for a team (last N finished matches) ---
export async function getTeamForm(teamId: number, limit: number = 10): Promise<any> {
  const cacheKey = `fd_team_form_${teamId}_${limit}`;
  const cached = await getFromCache(cacheKey);
  if (cached) return cached;

  const data = await fetchFromFootballData(`/teams/${teamId}/matches`, {
    status: 'FINISHED',
    limit,
  });

  const matches = (data?.matches || []).map(transformMatch);

  // Calculate form string + stats
  let wins = 0, draws = 0, losses = 0, goalsFor = 0, goalsAgainst = 0;
  const formArr: string[] = [];

  for (const m of matches) {
    const isHome = m.teams.home.id === teamId;
    const gf = isHome ? (m.goals.home ?? 0) : (m.goals.away ?? 0);
    const ga = isHome ? (m.goals.away ?? 0) : (m.goals.home ?? 0);
    goalsFor += gf;
    goalsAgainst += ga;
    if (gf > ga) { wins++; formArr.push('W'); }
    else if (gf === ga) { draws++; formArr.push('D'); }
    else { losses++; formArr.push('L'); }
  }

  const total = matches.length || 1;
  const result = {
    form: formArr.join(''),
    fixtures: { played: { total }, wins: { total: wins }, draws: { total: draws }, loses: { total: losses } },
    goals: {
      for: { total: { total: goalsFor }, average: { total: (goalsFor / total).toFixed(1) } },
      against: { total: { total: goalsAgainst }, average: { total: (goalsAgainst / total).toFixed(1) } },
    },
    matches,
  };

  await setCache(cacheKey, result, 720); // 12h cache
  return result;
}

// --- Major leagues (football-data.org competition IDs and codes) ---
// `id` = numeric football-data.org competition ID (used for filtering in frontend)
// `code` = string code used for API requests
export const MAJOR_LEAGUES = [
  { id: 2013, code: 'BSA', name: 'Série A', country: 'Brazil', flag: '🇧🇷' },
  { id: 2021, code: 'PL', name: 'Premier League', country: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { id: 2014, code: 'PD', name: 'La Liga', country: 'Spain', flag: '🇪🇸' },
  { id: 2002, code: 'BL1', name: 'Bundesliga', country: 'Germany', flag: '🇩🇪' },
  { id: 2019, code: 'SA', name: 'Serie A', country: 'Italy', flag: '🇮🇹' },
  { id: 2015, code: 'FL1', name: 'Ligue 1', country: 'France', flag: '🇫🇷' },
  { id: 2001, code: 'CL', name: 'Champions League', country: 'UEFA', flag: '🇪🇺' },
  { id: 2003, code: 'DED', name: 'Eredivisie', country: 'Netherlands', flag: '🇳🇱' },
];

// Keep old export name for backward compat
export const fetchFromApiFootball = fetchFromFootballData;
