import { getFromCache, setCache } from './api-football';

// ============================================================
// The Odds API v4 client
// Provides real betting odds from 40+ bookmakers
// Free tier: 500 credits/month
// ============================================================

const ODDS_API_KEY = process.env.ODDS_API_KEY || '';
const ODDS_BASE_URL = 'https://api.the-odds-api.com/v4';

// Map football-data.org competition IDs to The Odds API sport keys
const COMPETITION_TO_SPORT_KEY: Record<number, string> = {
  2013: 'soccer_brazil_campeonato',      // Série A
  2021: 'soccer_epl',                     // Premier League
  2014: 'soccer_spain_la_liga',            // La Liga
  2002: 'soccer_germany_bundesliga',       // Bundesliga
  2019: 'soccer_italy_serie_a',            // Serie A
  2015: 'soccer_france_ligue_one',         // Ligue 1
  2001: 'soccer_uefa_champs_league',       // Champions League
  2003: 'soccer_netherlands_eredivisie',   // Eredivisie
  2146: 'soccer_uefa_europa_league',       // Europa League
  2018: 'soccer_efl_champ',               // Championship
};

// All soccer sport keys to query for a comprehensive odds lookup
const ALL_SOCCER_KEYS = [
  'soccer_brazil_campeonato',
  'soccer_epl',
  'soccer_spain_la_liga',
  'soccer_germany_bundesliga',
  'soccer_italy_serie_a',
  'soccer_france_ligue_one',
  'soccer_uefa_champs_league',
  'soccer_netherlands_eredivisie',
  'soccer_uefa_europa_league',
  'soccer_efl_champ',
  'soccer_portugal_primeira_liga',
  'soccer_argentina_primera_division',
];

interface OddsOutcome {
  name: string;
  price: number;
}

interface OddsEvent {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: {
    key: string;
    title: string;
    markets: {
      key: string;
      outcomes: OddsOutcome[];
    }[];
  }[];
}

// Fetch odds for a specific sport key
async function fetchOddsForSport(sportKey: string): Promise<OddsEvent[]> {
  const cacheKey = `odds_sport_${sportKey}`;
  const cached = await getFromCache(cacheKey);
  if (cached) return cached as OddsEvent[];

  try {
    const url = `${ODDS_BASE_URL}/sports/${sportKey}/odds?apiKey=${ODDS_API_KEY}&regions=eu,uk&markets=h2h&oddsFormat=decimal`;
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 429 || response.status === 401) {
        console.warn(`Odds API rate/auth limit for ${sportKey}`);
        return [];
      }
      console.error(`Odds API error ${response.status} for ${sportKey}`);
      return [];
    }

    // Log remaining credits
    const remaining = response.headers.get('x-requests-remaining');
    if (remaining) {
      console.log(`Odds API credits remaining: ${remaining}`);
    }

    const data: OddsEvent[] = await response.json();
    
    // Cache for 30 min to save credits
    await setCache(cacheKey, data, 30);
    return data;
  } catch (error) {
    console.error(`Error fetching odds for ${sportKey}:`, error);
    return [];
  }
}

// Normalize team names for fuzzy matching
function normalizeTeamName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s*(fc|sc|cf|ac|afc|rcd|ca|ec|se|cr|ssc|as|rb|vfl|sv|tsg|1\.)\s*/gi, ' ')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Check if two team names likely refer to the same team
function teamsMatch(name1: string, name2: string): boolean {
  const n1 = normalizeTeamName(name1);
  const n2 = normalizeTeamName(name2);
  
  // Exact match
  if (n1 === n2) return true;
  
  // One contains the other
  if (n1.includes(n2) || n2.includes(n1)) return true;
  
  // Check if main words overlap significantly
  const words1 = n1.split(' ').filter(w => w.length > 2);
  const words2 = n2.split(' ').filter(w => w.length > 2);
  const commonWords = words1.filter(w => words2.some(w2 => w2.includes(w) || w.includes(w2)));
  
  return commonWords.length > 0 && commonWords.length >= Math.min(words1.length, words2.length) * 0.5;
}

// Find odds for a specific match by team names and competition
export async function getOddsForMatch(
  homeTeam: string,
  awayTeam: string,
  competitionId?: number
): Promise<any[]> {
  if (!ODDS_API_KEY) return [];

  // Determine which sport keys to query
  let sportKeys: string[] = [];
  
  if (competitionId && COMPETITION_TO_SPORT_KEY[competitionId]) {
    sportKeys = [COMPETITION_TO_SPORT_KEY[competitionId]];
  } else {
    // Query most common leagues
    sportKeys = ALL_SOCCER_KEYS.slice(0, 6); // Limit to save credits
  }

  // Fetch odds for relevant sport keys
  let allEvents: OddsEvent[] = [];
  for (const key of sportKeys) {
    const events = await fetchOddsForSport(key);
    allEvents = allEvents.concat(events);
    
    // If we found a match in first sport key, no need to check others
    const found = allEvents.find(e => 
      teamsMatch(e.home_team, homeTeam) && teamsMatch(e.away_team, awayTeam)
    );
    if (found) break;
  }

  // Find the matching event
  const matchingEvent = allEvents.find(e =>
    (teamsMatch(e.home_team, homeTeam) && teamsMatch(e.away_team, awayTeam)) ||
    (teamsMatch(e.home_team, awayTeam) && teamsMatch(e.away_team, homeTeam))
  );

  if (!matchingEvent) {
    console.log(`No odds found for: ${homeTeam} vs ${awayTeam}`);
    return [];
  }

  // Check if teams are swapped
  const isSwapped = teamsMatch(matchingEvent.home_team, awayTeam);

  // Transform bookmaker odds to our format
  const flatOdds: any[] = [];

  for (const bookmaker of matchingEvent.bookmakers) {
    const h2hMarket = bookmaker.markets.find(m => m.key === 'h2h');
    if (!h2hMarket) continue;

    const outcomes = h2hMarket.outcomes;
    const homeOutcome = outcomes.find(o => 
      teamsMatch(o.name, isSwapped ? awayTeam : homeTeam) || 
      o.name === matchingEvent.home_team
    );
    const awayOutcome = outcomes.find(o => 
      teamsMatch(o.name, isSwapped ? homeTeam : awayTeam) ||
      o.name === matchingEvent.away_team
    );
    const drawOutcome = outcomes.find(o => o.name === 'Draw');

    if (homeOutcome && awayOutcome) {
      flatOdds.push({
        bookmaker: bookmaker.title,
        betType: 'Match Winner',
        homeOdd: isSwapped ? awayOutcome.price : homeOutcome.price,
        drawOdd: drawOutcome?.price || null,
        awayOdd: isSwapped ? homeOutcome.price : awayOutcome.price,
      });
    }
  }

  return flatOdds;
}
