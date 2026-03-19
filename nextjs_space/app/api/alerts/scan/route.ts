import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getFixtures } from '@/lib/api-football';
import { getOddsForMatch } from '@/lib/odds-api';

export const dynamic = 'force-dynamic';

// POST: Scan upcoming matches for value bet alerts
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const minEdge = body.minEdge || 5; // minimum edge% to create alert (default 5%)

    // Get today's fixtures
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const fixtures = await getFixtures(dateStr);

    if (!fixtures || fixtures.length === 0) {
      return NextResponse.json({ message: 'No fixtures found for today', alerts: 0 });
    }

    // Only consider upcoming matches (not started)
    const upcoming = fixtures.filter((f: any) => {
      const status = f?.fixture?.status?.short;
      return status === 'NS' || status === 'TBD';
    });

    let alertsCreated = 0;
    const newAlerts: any[] = [];

    for (const fixture of upcoming.slice(0, 10)) { // limit to 10 to save API credits
      try {
        const homeTeam = fixture?.teams?.home?.name;
        const awayTeam = fixture?.teams?.away?.name;
        const matchId = String(fixture?.fixture?.id);
        const league = fixture?.league?.name || 'Unknown';
        const kickoff = new Date(fixture?.fixture?.date);
        const competitionId = fixture?.league?.id;

        // Fetch real odds
        const odds = await getOddsForMatch(homeTeam, awayTeam, competitionId);
        if (!odds || odds.length === 0) continue;

        // Calculate fair odds from average market odds (consensus)
        const avgHome = odds.reduce((s: number, o: any) => s + (o.homeOdd || 0), 0) / odds.length;
        const avgDraw = odds.reduce((s: number, o: any) => s + (o.drawOdd || 0), 0) / odds.length;
        const avgAway = odds.reduce((s: number, o: any) => s + (o.awayOdd || 0), 0) / odds.length;

        // Fair probabilities (remove overround)
        const totalImplied = (1 / avgHome) + (1 / avgDraw) + (1 / avgAway);
        const fairProbHome = (1 / avgHome) / totalImplied;
        const fairProbDraw = (1 / avgDraw) / totalImplied;
        const fairProbAway = (1 / avgAway) / totalImplied;

        const fairOddsHome = 1 / fairProbHome;
        const fairOddsDraw = 1 / fairProbDraw;
        const fairOddsAway = 1 / fairProbAway;

        // Check each bookmaker for value
        for (const bk of odds) {
          const checks = [
            { selection: `Vitória ${homeTeam}`, odd: bk.homeOdd, fairOdd: fairOddsHome, market: '1X2' },
            { selection: 'Empate', odd: bk.drawOdd, fairOdd: fairOddsDraw, market: '1X2' },
            { selection: `Vitória ${awayTeam}`, odd: bk.awayOdd, fairOdd: fairOddsAway, market: '1X2' },
          ];

          for (const check of checks) {
            if (!check.odd || !check.fairOdd) continue;

            const edge = ((check.odd / check.fairOdd) - 1) * 100;

            if (edge >= minEdge) {
              // Avoid duplicates
              const existing = await prisma.alert.findFirst({
                where: {
                  matchId,
                  bookmaker: bk.bookmaker,
                  selection: check.selection,
                  status: 'ACTIVE',
                },
              });
              if (existing) continue;

              const confidence = Math.min(95, Math.round(50 + edge * 2));
              const riskLevel = edge > 15 ? 'HIGH' : edge > 8 ? 'MEDIUM' : 'LOW';

              const alert = await prisma.alert.create({
                data: {
                  matchId,
                  league,
                  homeTeam,
                  awayTeam,
                  kickoff,
                  marketType: check.market,
                  selection: check.selection,
                  currentOdds: new Prisma.Decimal(parseFloat(check.odd.toFixed(2))),
                  bookmaker: bk.bookmaker,
                  fairOdds: new Prisma.Decimal(parseFloat(check.fairOdd.toFixed(2))),
                  edgePercent: new Prisma.Decimal(parseFloat(edge.toFixed(2))),
                  confidence,
                  riskLevel,
                },
              });

              alertsCreated++;
              newAlerts.push({
                id: alert.id,
                match: `${homeTeam} vs ${awayTeam}`,
                selection: check.selection,
                bookmaker: bk.bookmaker,
                odds: check.odd,
                fairOdds: parseFloat(check.fairOdd.toFixed(2)),
                edge: parseFloat(edge.toFixed(2)),
              });
            }
          }
        }
      } catch (err) {
        console.error('Error processing fixture for alerts:', err);
      }
    }

    // Expire old alerts for matches already started
    await prisma.alert.updateMany({
      where: {
        status: 'ACTIVE',
        kickoff: { lt: new Date() },
      },
      data: { status: 'EXPIRED' },
    });

    return NextResponse.json({ alertsCreated, alerts: newAlerts });
  } catch (error: any) {
    console.error('Error scanning for alerts:', error);
    return NextResponse.json({ error: error?.message || 'Failed to scan for alerts' }, { status: 500 });
  }
}
