import { NextRequest, NextResponse } from 'next/server';
import { getTeamForm } from '@/lib/api-football';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');

    if (!teamId) {
      return NextResponse.json(
        { error: 'Team ID is required' },
        { status: 400 }
      );
    }

    // season and leagueId are no longer needed — football-data.org returns all recent matches
    const data = await getTeamForm(parseInt(teamId), 10);

    return NextResponse.json({ form: data || null });
  } catch (error: any) {
    console.error('Team form API error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch team form' },
      { status: 500 }
    );
  }
}
