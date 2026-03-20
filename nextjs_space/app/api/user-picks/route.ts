import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function buildStats(trackedPicks: any[]) {
  const total = trackedPicks.length;
  const pending = trackedPicks.filter((entry) => entry.coltPick.status === 'PENDING').length;
  const settledEntries = trackedPicks.filter((entry) => entry.coltPick.status === 'SETTLED' && entry.coltPick.result);
  const settled = settledEntries.length;
  const wins = settledEntries.filter((entry) => entry.coltPick.result?.result === 'WIN').length;
  const losses = settledEntries.filter((entry) => entry.coltPick.result?.result === 'LOSS').length;
  const pushes = settledEntries.filter((entry) => ['PUSH', 'VOID'].includes(entry.coltPick.result?.result)).length;
  const totalProfitUnits = settledEntries.reduce((sum, entry) => sum + Number(entry.coltPick.result?.profitUnits || 0), 0);

  return {
    total,
    pending,
    settled,
    wins,
    losses,
    pushes,
    winRate: settled > 0 ? parseFloat(((wins / settled) * 100).toFixed(1)) : 0,
    totalProfitUnits: parseFloat(totalProfitUnits.toFixed(2)),
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
