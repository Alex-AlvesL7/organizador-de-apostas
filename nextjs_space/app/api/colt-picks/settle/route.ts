import { NextRequest, NextResponse } from 'next/server';
import { settlePick } from '@/lib/colt-tracking';
import { prisma } from '@/lib/prisma';
import { getMatchById } from '@/lib/api-football';

export const dynamic = 'force-dynamic';

// POST: Manually settle a pick
export async function POST(request: NextRequest) {
  try {
    const { pickId, result, finalOdds } = await request.json();

    if (!pickId || !result) {
      return NextResponse.json({ error: 'pickId and result are required' }, { status: 400 });
    }

    if (!['WIN', 'LOSS', 'PUSH', 'VOID'].includes(result)) {
      return NextResponse.json({ error: 'Invalid result. Must be WIN, LOSS, PUSH, or VOID' }, { status: 400 });
    }

    const pickResult = await settlePick(pickId, { result, finalOdds });
    if (!pickResult) {
      return NextResponse.json({ error: 'Pick not found or already settled' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      result: {
        ...pickResult,
        finalOdds: pickResult.finalOdds ? Number(pickResult.finalOdds) : null,
        profitUnits: Number(pickResult.profitUnits),
      },
    });
  } catch (error: any) {
    console.error('Error settling pick:', error);
    return NextResponse.json({ error: error?.message || 'Failed to settle pick' }, { status: 500 });
  }
}

// PUT: Auto-settle all pending picks for finished matches
export async function PUT(request: NextRequest) {
  try {
    const pendingPicks = await prisma.coltPick.findMany({
      where: {
        status: 'PENDING',
        kickoff: { lt: new Date() }, // only past matches
      },
    });

    if (pendingPicks.length === 0) {
      return NextResponse.json({ message: 'No pending picks to settle', settled: 0 });
    }

    let settled = 0;
    const results: any[] = [];

    for (const pick of pendingPicks) {
      try {
        // Fetch match result from football-data.org
        const matchId = parseInt(pick.matchId);
        if (isNaN(matchId)) continue;

        const match = await getMatchById(matchId);
        if (!match) continue;

        const status = match?.fixture?.status?.short;
        if (status !== 'FT' && status !== 'AET' && status !== 'PEN') continue;

        const homeGoals = match?.goals?.home ?? null;
        const awayGoals = match?.goals?.away ?? null;
        if (homeGoals === null || awayGoals === null) continue;

        // Determine pick result based on market type and selection
        const pickResult = determineResult(pick, homeGoals, awayGoals);
        if (!pickResult) continue;

        const settledResult = await settlePick(pick.id, {
          result: pickResult,
          finalOdds: pick.currentOddsAtPick ? Number(pick.currentOddsAtPick) : undefined,
        });

        if (settledResult) {
          settled++;
          results.push({
            pickId: pick.id,
            match: `${pick.homeTeam} vs ${pick.awayTeam}`,
            result: pickResult,
            profitUnits: Number(settledResult.profitUnits),
          });
        }
      } catch (err) {
        console.error(`Error settling pick ${pick.id}:`, err);
      }
    }

    return NextResponse.json({ settled, results });
  } catch (error: any) {
    console.error('Error auto-settling picks:', error);
    return NextResponse.json({ error: error?.message || 'Failed to auto-settle' }, { status: 500 });
  }
}

function determineResult(
  pick: { marketType: string; selection: string; homeTeam: string; awayTeam: string },
  homeGoals: number,
  awayGoals: number
): 'WIN' | 'LOSS' | 'PUSH' | null {
  const sel = pick.selection
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const homeTeam = pick.homeTeam
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const awayTeam = pick.awayTeam
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const mt = pick.marketType;

  if (mt === '1X2') {
    const homeWin = homeGoals > awayGoals;
    const draw = homeGoals === awayGoals;
    const awayWin = awayGoals > homeGoals;
    const mentionsHomeTeam = homeTeam && sel.includes(homeTeam);
    const mentionsAwayTeam = awayTeam && sel.includes(awayTeam);

    if (mentionsHomeTeam || sel.includes('casa') || sel.includes('home') || (sel.includes('vitoria') && !mentionsAwayTeam && !sel.includes('fora'))) {
      return homeWin ? 'WIN' : 'LOSS';
    }
    if (sel.includes('empate') || sel.includes('draw')) {
      return draw ? 'WIN' : 'LOSS';
    }
    if (mentionsAwayTeam || sel.includes('fora') || sel.includes('away') || sel.includes('visitante')) {
      return awayWin ? 'WIN' : 'LOSS';
    }
  }

  if (mt === 'OVER_UNDER') {
    const totalGoals = homeGoals + awayGoals;
    // Extract the line (e.g. "Over 2.5" -> 2.5)
    const lineMatch = sel.match(/(\d+\.?\d*)/);
    const line = lineMatch ? parseFloat(lineMatch[1]) : 2.5;

    if (sel.includes('over') || sel.includes('acima') || sel.includes('mais')) {
      if (totalGoals > line) return 'WIN';
      if (totalGoals === line) return 'PUSH';
      return 'LOSS';
    }
    if (sel.includes('under') || sel.includes('abaixo') || sel.includes('menos')) {
      if (totalGoals < line) return 'WIN';
      if (totalGoals === line) return 'PUSH';
      return 'LOSS';
    }
  }

  if (mt === 'BTTS') {
    const bothScored = homeGoals > 0 && awayGoals > 0;
    if (sel.includes('sim') || sel.includes('yes')) {
      return bothScored ? 'WIN' : 'LOSS';
    }
    if (sel.includes('não') || sel.includes('no') || sel.includes('nao')) {
      return !bothScored ? 'WIN' : 'LOSS';
    }
  }

  // For other market types, return null (manual settlement needed)
  return null;
}
