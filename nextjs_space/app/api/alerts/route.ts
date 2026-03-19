import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';

export const dynamic = 'force-dynamic';

// GET: Fetch alerts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'ACTIVE';
    const limit = parseInt(searchParams.get('limit') || '30');

    const alerts = await prisma.alert.findMany({
      where: { status },
      orderBy: [{ edgePercent: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      include: { coltPick: true },
    });

    const serialized = alerts.map((a: any) => ({
      ...a,
      currentOdds: Number(a.currentOdds),
      fairOdds: Number(a.fairOdds),
      edgePercent: Number(a.edgePercent),
      coltPick: a.coltPick ? {
        ...a.coltPick,
        recommendedOddsMin: Number(a.coltPick.recommendedOddsMin),
        currentOddsAtPick: a.coltPick.currentOddsAtPick ? Number(a.coltPick.currentOddsAtPick) : null,
      } : null,
    }));

    return NextResponse.json({ alerts: serialized });
  } catch (error: any) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json({ error: error?.message || 'Failed to fetch alerts' }, { status: 500 });
  }
}

// POST: Dismiss or expire an alert
export async function POST(request: NextRequest) {
  try {
    const { alertId, action } = await request.json();

    if (!alertId || !['DISMISS', 'EXPIRE'].includes(action)) {
      return NextResponse.json({ error: 'alertId and valid action required' }, { status: 400 });
    }

    const newStatus = action === 'DISMISS' ? 'DISMISSED' : 'EXPIRED';

    await prisma.alert.update({
      where: { id: alertId },
      data: { status: newStatus },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating alert:', error);
    return NextResponse.json({ error: error?.message || 'Failed to update alert' }, { status: 500 });
  }
}
