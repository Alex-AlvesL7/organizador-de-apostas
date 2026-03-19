import { NextRequest, NextResponse } from 'next/server';
import { getMatchById } from '@/lib/api-football';
import { getOddsForMatch } from '@/lib/odds-api';
import { getFromCache, setCache } from '@/lib/api-football';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const resolvedParams = await context?.params;
    const matchId = resolvedParams?.id;

    if (!matchId) {
      return NextResponse.json(
        { error: 'Match ID is required' },
        { status: 400 }
      );
    }

    // Check cache first
    const cacheKey = `match_odds_${matchId}`;
    const cached = await getFromCache(cacheKey);
    if (cached) {
      return NextResponse.json({ odds: cached });
    }

    // Get match details to know team names
    const match = await getMatchById(parseInt(matchId));
    if (!match) {
      return NextResponse.json({ odds: [] });
    }

    const homeTeam = match?.teams?.home?.name;
    const awayTeam = match?.teams?.away?.name;
    const competitionId = match?.league?.id;

    if (!homeTeam || !awayTeam) {
      return NextResponse.json({ odds: [] });
    }

    // Fetch odds from The Odds API
    const odds = await getOddsForMatch(homeTeam, awayTeam, competitionId);

    // Cache for 30 min
    if (odds.length > 0) {
      await setCache(cacheKey, odds, 30);
    }

    return NextResponse.json({ odds });
  } catch (error: any) {
    console.error('Odds API error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch odds' },
      { status: 500 }
    );
  }
}
