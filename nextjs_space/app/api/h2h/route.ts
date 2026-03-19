import { NextRequest, NextResponse } from 'next/server';
import { getH2H } from '@/lib/api-football';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const team1 = searchParams.get('team1');
    const team2 = searchParams.get('team2');

    if (!team1 || !team2) {
      return NextResponse.json(
        { error: 'Both team IDs are required' },
        { status: 400 }
      );
    }

    const data = await getH2H(parseInt(team1), parseInt(team2));
    const matches = data?.response || [];

    return NextResponse.json({ h2h: matches });
  } catch (error: any) {
    console.error('H2H API error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch H2H data' },
      { status: 500 }
    );
  }
}
