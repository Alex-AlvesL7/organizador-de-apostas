import { NextRequest, NextResponse } from 'next/server';
import { getFixtures } from '@/lib/api-football';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const leagueCode = searchParams.get('league'); // Now a competition code like 'PL', 'BSA'

    const data = await getFixtures(date, leagueCode || undefined);

    return NextResponse.json({
      fixtures: data?.response || [],
      count: data?.results || 0
    });
  } catch (error: any) {
    console.error('Fixtures API error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch fixtures' },
      { status: 500 }
    );
  }
}
