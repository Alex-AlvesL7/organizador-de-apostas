import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface SettledTrackedPickEntry {
  coltPick: {
    league: string;
    marketType: string;
    stakeUnits: number;
    result?: {
      result: string;
      profitUnits: any;
    } | null;
  };
}

function buildRanking(entries: SettledTrackedPickEntry[], key: 'league' | 'marketType') {
  const grouped = new Map<string, {
    label: string;
    total: number;
    wins: number;
    losses: number;
    pushes: number;
    totalProfitUnits: number;
    totalStakeUnits: number;
  }>();

  for (const entry of entries) {
    const label = entry.coltPick[key] || 'OUTROS';
    const existing = grouped.get(label) || {
      label,
      total: 0,
      wins: 0,
      losses: 0,
      pushes: 0,
      totalProfitUnits: 0,
      totalStakeUnits: 0,
    };

    existing.total += 1;
    existing.totalProfitUnits += Number(entry.coltPick.result?.profitUnits || 0);
    existing.totalStakeUnits += Number(entry.coltPick.stakeUnits || 0);

    if (entry.coltPick.result?.result === 'WIN') existing.wins += 1;
    else if (entry.coltPick.result?.result === 'LOSS') existing.losses += 1;
    else existing.pushes += 1;

    grouped.set(label, existing);
  }

  const items = Array.from(grouped.values()).map((item) => {
    const settled = item.total;
    const winRate = settled > 0 ? Number(((item.wins / settled) * 100).toFixed(1)) : 0;
    const roi = item.totalStakeUnits > 0
      ? Number(((item.totalProfitUnits / item.totalStakeUnits) * 100).toFixed(1))
      : 0;

    return {
      label: item.label,
      total: item.total,
      wins: item.wins,
      losses: item.losses,
      pushes: item.pushes,
      winRate,
      totalProfitUnits: Number(item.totalProfitUnits.toFixed(2)),
      roi,
    };
  });

  const sorted = [...items].sort((a, b) => {
    if (b.roi !== a.roi) return b.roi - a.roi;
    if (b.winRate !== a.winRate) return b.winRate - a.winRate;
    return b.total - a.total;
  });

  return {
    top: sorted.slice(0, 5),
    bottom: [...sorted].reverse().slice(0, 5),
  };
}

function buildStats(trackedPicks: any[]) {
  const total = trackedPicks.length;
  const pending = trackedPicks.filter((entry) => entry.coltPick.status === 'PENDING').length;
  const settledEntries = trackedPicks.filter((entry) => entry.coltPick.status === 'SETTLED' && entry.coltPick.result);
  const settled = settledEntries.length;
  const wins = settledEntries.filter((entry) => entry.coltPick.result?.result === 'WIN').length;
  const losses = settledEntries.filter((entry) => entry.coltPick.result?.result === 'LOSS').length;
  const pushes = settledEntries.filter((entry) => ['PUSH', 'VOID'].includes(entry.coltPick.result?.result)).length;
  const totalProfitUnits = settledEntries.reduce((sum, entry) => sum + Number(entry.coltPick.result?.profitUnits || 0), 0);
  const totalStakeUnits = settledEntries.reduce((sum, entry) => sum + Number(entry.coltPick.stakeUnits || 0), 0);
  const marketRanking = buildRanking(settledEntries, 'marketType');
  const leagueRanking = buildRanking(settledEntries, 'league');

  return {
    total,
    pending,
    settled,
    wins,
    losses,
    pushes,
    winRate: settled > 0 ? parseFloat(((wins / settled) * 100).toFixed(1)) : 0,
    totalProfitUnits: parseFloat(totalProfitUnits.toFixed(2)),
    roi: totalStakeUnits > 0 ? Number(((totalProfitUnits / totalStakeUnits) * 100).toFixed(1)) : 0,
    ranking: {
      marketsTop: marketRanking.top,
      marketsBottom: marketRanking.bottom,
      leaguesTop: leagueRanking.top,
      leaguesBottom: leagueRanking.bottom,
    },
  };
}

function serializeTrackedPicks(trackedPicks: any[]) {
  return trackedPicks.map((entry) => ({
    trackedId: entry.id,
    savedAt: entry.createdAt,
    ...entry.coltPick,
    recommendedOddsMin: Number(entry.coltPick.recommendedOddsMin),
    currentOddsAtPick: entry.coltPick.currentOddsAtPick ? Number(entry.coltPick.currentOddsAtPick) : null,
    result: entry.coltPick.result
      ? {
          ...entry.coltPick.result,
          finalOdds: entry.coltPick.result.finalOdds ? Number(entry.coltPick.result.finalOdds) : null,
          profitUnits: Number(entry.coltPick.result.profitUnits),
        }
      : null,
  }));
}

async function requireSession() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return null;
  }

  return session;
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const matchId = searchParams.get('matchId') || undefined;

    const trackedPicks = await prisma.userTrackedPick.findMany({
      where: {
        userId: session.user.id,
        ...(status ? { coltPick: { status } } : {}),
        ...(matchId ? { coltPick: { ...(status ? { status } : {}), matchId } } : {}),
      },
      include: {
        coltPick: {
          include: {
            result: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (matchId) {
      return NextResponse.json({
        saved: trackedPicks.length > 0,
        count: trackedPicks.length,
      });
    }

    return NextResponse.json({
      picks: serializeTrackedPicks(trackedPicks),
      stats: buildStats(trackedPicks),
    });
  } catch (error: any) {
    console.error('Error fetching user picks:', error);
    return NextResponse.json({ error: error?.message || 'Failed to fetch user picks' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const matchId = body.matchId ? String(body.matchId) : null;
    const pickIds = Array.isArray(body.pickIds) ? body.pickIds.map(String) : [];

    const picks = await prisma.coltPick.findMany({
      where: {
        ...(matchId ? { matchId } : {}),
        ...(pickIds.length > 0 ? { id: { in: pickIds } } : {}),
      },
      select: { id: true },
    });

    if (picks.length === 0) {
      return NextResponse.json({ error: 'Nenhuma pick encontrada para salvar' }, { status: 404 });
    }

    const created = await prisma.userTrackedPick.createMany({
      data: picks.map((pick) => ({
        userId: session.user.id,
        coltPickId: pick.id,
      })),
      skipDuplicates: true,
    });

    return NextResponse.json({
      success: true,
      savedCount: created.count,
      totalPicks: picks.length,
      alreadySaved: picks.length - created.count,
    });
  } catch (error: any) {
    console.error('Error saving user picks:', error);
    return NextResponse.json({ error: error?.message || 'Failed to save user picks' }, { status: 500 });
  }
}
