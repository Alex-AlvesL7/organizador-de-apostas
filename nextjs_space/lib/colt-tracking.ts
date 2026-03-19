import { Prisma } from '@prisma/client';
import { prisma } from './prisma';

// ============================================================
// COLT TRACKING - Core business logic
// ============================================================

export interface ColtDica {
  mercado: string;
  aposta: string;
  odd_minima: string;
  stake: number;
  risco: string;
  motivo: string;
}

function normalizeSelectionText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function selectionMentionsTeam(selection: string, teamName: string): boolean {
  const normalizedSelection = normalizeSelectionText(selection);
  const normalizedTeam = normalizeSelectionText(teamName);

  if (!normalizedSelection || !normalizedTeam) return false;
  if (normalizedSelection.includes(normalizedTeam)) return true;

  const selectionWords = normalizedSelection.split(' ');
  const teamWords = normalizedTeam.split(' ').filter((word) => word.length > 2);

  if (teamWords.length === 0) return false;

  return teamWords.every((word) => selectionWords.some((selectionWord) => selectionWord.includes(word) || word.includes(selectionWord)));
}

// Map market names from AI output to standardized market types
function mapMarketType(mercado: string): string {
  const m = mercado.toLowerCase();
  if (m.includes('resultado') || m.includes('1x2') || m.includes('moneyline') || m.includes('vitória') || m.includes('empate')) return '1X2';
  if (m.includes('over') || m.includes('under') || m.includes('gol') || m.includes('acima') || m.includes('abaixo')) return 'OVER_UNDER';
  if (m.includes('ambas') || m.includes('btts') || m.includes('both')) return 'BTTS';
  if (m.includes('handicap') || m.includes('spread')) return 'HANDICAP';
  if (m.includes('escanteio') || m.includes('corner')) return 'CORNERS';
  if (m.includes('cartão') || m.includes('cartao') || m.includes('card')) return 'CARDS';
  return 'OTHER';
}

// Map risk level from Portuguese
function mapRiskLevel(risco: string): string {
  const r = risco.toLowerCase();
  if (r.includes('baixo') || r.includes('low')) return 'LOW';
  if (r.includes('alto') || r.includes('high')) return 'HIGH';
  return 'MEDIUM';
}

// Save picks from Colt's AI recommendation
export async function saveColtPicks(params: {
  matchId: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  kickoff: Date;
  dicas: ColtDica[];
  confianca: number;
  analise: string;
  odds?: any[]; // odds data from the match
}): Promise<string[]> {
  const pickIds: string[] = [];

  for (const dica of params.dicas) {
    // Find best matching bookmaker odd for this pick
    let currentOdd: number | null = null;
    let bookmaker: string | null = null;

    if (params.odds && params.odds.length > 0) {
      // Try to find a relevant odd from the odds data
      const bestBookmaker = params.odds[0];
      if (bestBookmaker) {
        bookmaker = bestBookmaker.bookmaker || null;
        // Try to match by selection type
        const selection = normalizeSelectionText(dica.aposta);
        const mentionsHomeTeam = selectionMentionsTeam(selection, params.homeTeam);
        const mentionsAwayTeam = selectionMentionsTeam(selection, params.awayTeam);

        if (mentionsHomeTeam || selection.includes('casa') || selection.includes('home') || (selection.includes('vitoria') && !mentionsAwayTeam)) {
          currentOdd = bestBookmaker.homeOdd || null;
        } else if (mentionsAwayTeam || selection.includes('fora') || selection.includes('away') || selection.includes('visitante')) {
          currentOdd = bestBookmaker.awayOdd || null;
        } else if (selection.includes('empate') || selection.includes('draw')) {
          currentOdd = bestBookmaker.drawOdd || null;
        }
      }
    }

    try {
      const pick = await prisma.coltPick.create({
        data: {
          matchId: params.matchId,
          league: params.league,
          homeTeam: params.homeTeam,
          awayTeam: params.awayTeam,
          kickoff: params.kickoff,
          marketType: mapMarketType(dica.mercado),
          selection: dica.aposta,
          recommendedOddsMin: new Prisma.Decimal(parseFloat(dica.odd_minima) || 1.5),
          currentOddsAtPick: currentOdd ? new Prisma.Decimal(currentOdd) : null,
          bookmaker,
          stakeUnits: Math.min(10, Math.max(1, dica.stake || 5)),
          riskLevel: mapRiskLevel(dica.risco),
          confidence: Math.min(100, Math.max(0, params.confianca || 50)),
          reasoning: dica.motivo || params.analise,
        },
      });
      pickIds.push(pick.id);
    } catch (err) {
      console.error('Error saving ColtPick:', err);
    }
  }

  return pickIds;
}

// Get all picks with optional filters
export async function getColtPicks(filters?: {
  status?: string;
  league?: string;
  limit?: number;
  offset?: number;
}) {
  const where: any = {};
  if (filters?.status) where.status = filters.status;
  if (filters?.league) where.league = filters.league;

  return prisma.coltPick.findMany({
    where,
    include: { result: true },
    orderBy: { createdAt: 'desc' },
    take: filters?.limit || 50,
    skip: filters?.offset || 0,
  });
}

// Get pick stats summary
export async function getColtPickStats() {
  const [total, pending, settled] = await Promise.all([
    prisma.coltPick.count(),
    prisma.coltPick.count({ where: { status: 'PENDING' } }),
    prisma.coltPick.count({ where: { status: 'SETTLED' } }),
  ]);

  const results = await prisma.coltPickResult.groupBy({
    by: ['result'],
    _count: true,
    _sum: { profitUnits: true },
  });

  let totalProfit = 0;
  let wins = 0;
  let losses = 0;
  let pushes = 0;

  for (const r of results) {
    const profit = Number(r._sum.profitUnits || 0);
    totalProfit += profit;
    if (r.result === 'WIN') wins = r._count;
    if (r.result === 'LOSS') losses = r._count;
    if (r.result === 'PUSH' || r.result === 'VOID') pushes += r._count;
  }

  const winRate = settled > 0 ? ((wins / settled) * 100).toFixed(1) : '0.0';

  return {
    total,
    pending,
    settled,
    wins,
    losses,
    pushes,
    winRate: parseFloat(winRate),
    totalProfitUnits: parseFloat(totalProfit.toFixed(2)),
  };
}

// Settle a pick manually or via automation
export async function settlePick(pickId: string, params: {
  result: 'WIN' | 'LOSS' | 'PUSH' | 'VOID';
  finalOdds?: number;
}) {
  const pick = await prisma.coltPick.findUnique({ where: { id: pickId } });
  if (!pick || pick.status === 'SETTLED') return null;

  const finalOdds = params.finalOdds || Number(pick.currentOddsAtPick || pick.recommendedOddsMin);
  let profitUnits = 0;

  switch (params.result) {
    case 'WIN':
      profitUnits = pick.stakeUnits * (finalOdds - 1);
      break;
    case 'LOSS':
      profitUnits = -pick.stakeUnits;
      break;
    case 'PUSH':
    case 'VOID':
      profitUnits = 0;
      break;
  }

  const [pickResult] = await prisma.$transaction([
    prisma.coltPickResult.create({
      data: {
        coltPickId: pickId,
        result: params.result,
        finalOdds: params.finalOdds ? new Prisma.Decimal(params.finalOdds) : null,
        profitUnits: new Prisma.Decimal(parseFloat(profitUnits.toFixed(2))),
      },
    }),
    prisma.coltPick.update({
      where: { id: pickId },
      data: { status: 'SETTLED' },
    }),
  ]);

  return pickResult;
}
