import { NextRequest, NextResponse } from 'next/server';
import { getMatchById } from '@/lib/api-football';

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

    // football-data.org includes statistics in the match detail for finished matches
    const match = await getMatchById(parseInt(matchId));
    
    const homeRaw = match?._rawHomeStats;
    const awayRaw = match?._rawAwayStats;

    if (!homeRaw && !awayRaw) {
      return NextResponse.json({ statistics: [] });
    }

    // Transform to the format the frontend expects:
    // [{ team: { name, logo }, statistics: [{ type, value }] }, ...]
    const mapStats = (raw: any, teamName: string, teamLogo: string) => {
      if (!raw) return null;
      const stats: { type: string; value: any }[] = [];
      const keyMap: Record<string, string> = {
        corner_kicks: 'Corner Kicks',
        free_kicks: 'Free Kicks',
        goal_kicks: 'Goal Kicks',
        offsides: 'Offsides',
        fouls: 'Fouls',
        ball_possession: 'Ball Possession',
        saves: 'Goalkeeper Saves',
        throw_ins: 'Throw In',
        shots: 'Total Shots',
        shots_on_goal: 'Shots on Goal',
        shots_off_goal: 'Shots off Goal',
        yellow_cards: 'Yellow Cards',
        yellow_red_cards: 'Yellow Red Cards',
        red_cards: 'Red Cards',
      };
      for (const [key, label] of Object.entries(keyMap)) {
        if (raw[key] !== undefined && raw[key] !== null) {
          const val = key === 'ball_possession' ? `${raw[key]}%` : raw[key];
          stats.push({ type: label, value: val });
        }
      }
      return { team: { name: teamName, logo: teamLogo }, statistics: stats };
    };

    const statistics = [
      mapStats(homeRaw, match?.teams?.home?.name, match?.teams?.home?.logo),
      mapStats(awayRaw, match?.teams?.away?.name, match?.teams?.away?.logo),
    ].filter(Boolean);

    return NextResponse.json({ statistics });
  } catch (error: any) {
    console.error('Statistics API error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}
