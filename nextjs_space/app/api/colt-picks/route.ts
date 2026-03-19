import { NextRequest, NextResponse } from 'next/server';
import { getColtPicks, getColtPickStats } from '@/lib/colt-tracking';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const league = searchParams.get('league') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const statsOnly = searchParams.get('stats') === 'true';

    if (statsOnly) {
      const stats = await getColtPickStats();
      return NextResponse.json({ stats });
    }

    const [picks, stats] = await Promise.all([
      getColtPicks({ status, league, limit, offset }),
      getColtPickStats(),
    ]);

    // Serialize Decimals
    const serialized = picks.map((p: any) => ({
      ...p,
      recommendedOddsMin: Number(p.recommendedOddsMin),
      currentOddsAtPick: p.currentOddsAtPick ? Number(p.currentOddsAtPick) : null,
      result: p.result ? {
        ...p.result,
        finalOdds: p.result.finalOdds ? Number(p.result.finalOdds) : null,
        profitUnits: Number(p.result.profitUnits),
      } : null,
    }));

    return NextResponse.json({ picks: serialized, stats });
  } catch (error: any) {
    console.error('Error fetching colt picks:', error);
    return NextResponse.json({ error: error?.message || 'Failed to fetch picks' }, { status: 500 });
  }
}
