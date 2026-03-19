import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET: Fetch all room data for a match (analysis, picks, results, conversation, league stats)
export async function GET(
  request: NextRequest,
  context: { params: { matchId: string } }
) {
  try {
    const matchId = context.params.matchId;
    if (!matchId) {
      return NextResponse.json({ error: 'matchId is required' }, { status: 400 });
    }

    // Fetch all data in parallel
    const [analysis, picks, conversation, leagueStats] = await Promise.all([
      // Analysis
      prisma.coltAnalysis.findUnique({ where: { matchId } }).catch(() => null),

      // Picks + results
      prisma.coltPick.findMany({
        where: { matchId },
        include: { result: true },
        orderBy: { createdAt: 'desc' },
      }).catch(() => []),

      // Conversation log
      prisma.conversationLog.findMany({
        where: { matchId },
        orderBy: { createdAt: 'asc' },
        take: 200,
      }).catch(() => []),

      // League stats: aggregate picks from same league
      (async () => {
        // First, get the league from any pick or analysis for this match
        const ref = await prisma.coltPick.findFirst({ where: { matchId } }).catch(() => null);
        const analysisRef = await prisma.coltAnalysis.findUnique({ where: { matchId } }).catch(() => null);
        const league = ref?.league || analysisRef?.league;
        if (!league) return null;

        const leaguePicks = await prisma.coltPick.findMany({
          where: { league, status: 'SETTLED' },
          include: { result: true },
        });

        let wins = 0, losses = 0, pushes = 0, totalProfit = 0;
        for (const p of leaguePicks) {
          if (p.result) {
            if (p.result.result === 'WIN') wins++;
            else if (p.result.result === 'LOSS') losses++;
            else pushes++;
            totalProfit += Number(p.result.profitUnits || 0);
          }
        }
        const total = wins + losses + pushes;
        const totalStaked = leaguePicks.reduce((s, p) => s + p.stakeUnits, 0);

        return {
          league,
          total,
          wins,
          losses,
          pushes,
          winRate: total > 0 ? parseFloat(((wins / total) * 100).toFixed(1)) : 0,
          totalProfitUnits: parseFloat(totalProfit.toFixed(2)),
          roi: totalStaked > 0 ? parseFloat(((totalProfit / totalStaked) * 100).toFixed(1)) : 0,
        };
      })(),
    ]);

    // Serialize Decimals
    const serializedPicks = picks.map((p: any) => ({
      ...p,
      recommendedOddsMin: Number(p.recommendedOddsMin),
      currentOddsAtPick: p.currentOddsAtPick ? Number(p.currentOddsAtPick) : null,
      result: p.result ? {
        ...p.result,
        finalOdds: p.result.finalOdds ? Number(p.result.finalOdds) : null,
        profitUnits: Number(p.result.profitUnits),
      } : null,
    }));

    const serializedAnalysis = analysis ? {
      ...analysis,
      rawResult: analysis.rawResult,
    } : null;

    return NextResponse.json({
      analysis: serializedAnalysis,
      picks: serializedPicks,
      conversation,
      leagueStats,
    });
  } catch (error: any) {
    console.error('Error fetching room data:', error);
    return NextResponse.json({ error: error?.message || 'Failed to fetch room data' }, { status: 500 });
  }
}
