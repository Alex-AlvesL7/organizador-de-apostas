export interface RecommendationUserProfile {
  riskProfile?: string | null;
  bankrollEstimate?: number | null;
  minOdds?: number | null;
  maxOdds?: number | null;
  maxPicksPerDay?: number | null;
  favoriteLeagues?: string[] | null;
  preferredMarkets?: string[] | null;
}

interface RecommendationTip {
  mercado?: string;
  aposta?: string;
  odd_minima?: string | number;
  stake?: number;
  risco?: string;
  motivo?: string;
  [key: string]: any;
}

interface RecommendationResult {
  veredito?: string;
  confianca?: number;
  dicas?: RecommendationTip[];
  analise_colt?: string;
  alerta?: string | null;
  placar_provavel?: string | null;
  resumo_rapido?: string | null;
  guidance?: any;
  [key: string]: any;
}

interface SavedPickLike {
  selection?: string;
  marketType?: string;
  currentOddsAtPick?: any;
  recommendedOddsMin?: any;
}

interface DecorationOptions {
  odds?: any[] | null;
  savedPicks?: SavedPickLike[] | null;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeRiskProfile(profile?: string | null) {
  const normalized = String(profile || 'MODERATE').toUpperCase();
  if (normalized === 'CONSERVATIVE' || normalized === 'AGGRESSIVE') return normalized;
  return 'MODERATE';
}

function parseOdd(value: string | number | undefined) {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value || '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 1.5;
}

function normalizeText(value?: string) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeMarketType(market?: string) {
  const normalized = String(market || '').toLowerCase();
  if (normalized.includes('resultado') || normalized.includes('1x2') || normalized.includes('moneyline') || normalized.includes('vitória') || normalized.includes('vitoria') || normalized.includes('empate')) return '1X2';
  if (normalized.includes('over') || normalized.includes('under') || normalized.includes('gol') || normalized.includes('acima') || normalized.includes('abaixo')) return 'OVER_UNDER';
  if (normalized.includes('ambas') || normalized.includes('btts') || normalized.includes('both')) return 'BTTS';
  if (normalized.includes('handicap') || normalized.includes('spread')) return 'HANDICAP';
  if (normalized.includes('escanteio') || normalized.includes('corner')) return 'CORNERS';
  if (normalized.includes('cartão') || normalized.includes('cartao') || normalized.includes('card')) return 'CARDS';
  return 'OTHER';
}

function getConfidenceTier(confidence: number) {
  if (confidence >= 85) {
    return {
      label: 'Elite',
      summary: 'Cenário muito forte para entrada, desde que a odd não derreta.',
      color: 'emerald',
    };
  }

  if (confidence >= 70) {
    return {
      label: 'Boa',
      summary: 'Boa leitura para trabalhar com disciplina e gestão normal.',
      color: 'yellow',
    };
  }

  return {
    label: 'Cautela',
    summary: 'Jogo com mais variáveis. Exija preço melhor ou reduza exposição.',
    color: 'red',
  };
}

function getBankrollUnitPercent(riskProfile: string) {
  switch (riskProfile) {
    case 'CONSERVATIVE':
      return 0.005;
    case 'AGGRESSIVE':
      return 0.015;
    default:
      return 0.01;
  }
}

function getRiskPenalty(riskLevel: string) {
  const normalized = String(riskLevel || '').toLowerCase();
  if (normalized.includes('baixo')) return 1;
  if (normalized.includes('alto')) return -1;
  return 0;
}

function getProfileAdjustment(riskProfile: string) {
  if (riskProfile === 'CONSERVATIVE') return -1;
  if (riskProfile === 'AGGRESSIVE') return 1;
  return 0;
}

function getConfidenceAdjustment(confidence: number) {
  if (confidence >= 85) return 1;
  if (confidence <= 59) return -1;
  return 0;
}

function getOddsAdjustment(odd: number) {
  if (odd >= 3.2) return -1;
  if (odd <= 1.65) return 1;
  return 0;
}

function getStakeLabel(units: number) {
  if (units >= 8) return 'Entrada forte';
  if (units >= 5) return 'Entrada moderada';
  return 'Entrada leve';
}

function getStrategyLabel(riskProfile: string) {
  switch (riskProfile) {
    case 'CONSERVATIVE':
      return 'Proteção de banca';
    case 'AGGRESSIVE':
      return 'Busca por crescimento';
    default:
      return 'Equilíbrio entre risco e retorno';
  }
}

function matchSavedPick(tip: RecommendationTip, savedPicks?: SavedPickLike[] | null) {
  if (!savedPicks?.length) {
    return null;
  }

  const normalizedSelection = normalizeText(tip?.aposta);
  const normalizedMarket = normalizeMarketType(tip?.mercado);

  return savedPicks.find((pick) => {
    const pickSelection = normalizeText(pick.selection);
    const pickMarket = normalizeMarketType(pick.marketType);

    return (
      (normalizedSelection && pickSelection && normalizedSelection === pickSelection) ||
      (normalizedSelection && pickSelection && (normalizedSelection.includes(pickSelection) || pickSelection.includes(normalizedSelection))) ||
      (normalizedMarket !== 'OTHER' && normalizedMarket === pickMarket)
    );
  }) || null;
}

function resolveCurrentOdd(tip: RecommendationTip, options?: DecorationOptions) {
  const directCurrentOdd = tip?.current_odd ?? tip?.currentOdd ?? tip?.currentOdds;
  if (directCurrentOdd) {
    return parseOdd(directCurrentOdd);
  }

  const savedPick = matchSavedPick(tip, options?.savedPicks);
  if (savedPick?.currentOddsAtPick) {
    return parseOdd(savedPick.currentOddsAtPick);
  }

  const firstBookmaker = options?.odds?.[0];
  if (!firstBookmaker) {
    return savedPick?.recommendedOddsMin ? parseOdd(savedPick.recommendedOddsMin) : null;
  }

  const selection = normalizeText(tip?.aposta);

  if (selection.includes('empate') || selection.includes('draw')) {
    return firstBookmaker.drawOdd ? parseOdd(firstBookmaker.drawOdd) : null;
  }

  if (
    selection.includes('fora') ||
    selection.includes('visitante') ||
    selection.includes('away') ||
    selection.includes('time de fora')
  ) {
    return firstBookmaker.awayOdd ? parseOdd(firstBookmaker.awayOdd) : null;
  }

  if (
    selection.includes('casa') ||
    selection.includes('mandante') ||
    selection.includes('home') ||
    selection.includes('time da casa') ||
    selection.includes('vitoria') ||
    selection.includes('vitória')
  ) {
    if (!selection.includes('fora') && !selection.includes('visitante') && !selection.includes('away')) {
      return firstBookmaker.homeOdd ? parseOdd(firstBookmaker.homeOdd) : null;
    }
  }

  if (selection.includes('over') || selection.includes('acima')) {
    return firstBookmaker.overOdd ? parseOdd(firstBookmaker.overOdd) : null;
  }

  if (selection.includes('under') || selection.includes('abaixo')) {
    return firstBookmaker.underOdd ? parseOdd(firstBookmaker.underOdd) : null;
  }

  return savedPick?.recommendedOddsMin ? parseOdd(savedPick.recommendedOddsMin) : null;
}

function getEstimatedProbability(tip: RecommendationTip, overallConfidence: number) {
  if (tip?.probabilidade_estimada) {
    const raw = Number(tip.probabilidade_estimada);
    if (Number.isFinite(raw)) {
      return clamp(raw > 1 ? raw / 100 : raw, 0.12, 0.88);
    }
  }

  const minimumOdd = parseOdd(tip?.odd_minima);
  const baselineProbability = clamp(1 / minimumOdd, 0.12, 0.88);
  const confidenceAdjustment = ((overallConfidence - 50) / 50) * 0.08;
  const riskLevel = normalizeText(tip?.risco);
  const riskAdjustment = riskLevel.includes('baixo') ? 0.03 : riskLevel.includes('alto') ? -0.04 : 0;
  const marketType = normalizeMarketType(tip?.mercado);
  const marketAdjustment = marketType === '1X2' ? -0.01 : marketType === 'BTTS' ? -0.015 : 0.01;

  return clamp(baselineProbability + confidenceAdjustment + riskAdjustment + marketAdjustment, 0.12, 0.88);
}

function getEdgeLabel(edgePercent: number) {
  if (edgePercent >= 8) return 'Muito valor';
  if (edgePercent >= 3) return 'Com valor';
  if (edgePercent > -2) return 'Neutra';
  return 'Sem valor';
}

export function decorateRecommendationResult(
  result: RecommendationResult,
  profile?: RecommendationUserProfile | null,
  options?: DecorationOptions
) {
  const confidence = clamp(Number(result?.confianca || 0), 0, 100);
  const riskProfile = normalizeRiskProfile(profile?.riskProfile);
  const bankrollEstimate = profile?.bankrollEstimate ?? null;
  const bankrollUnitPercent = getBankrollUnitPercent(riskProfile);
  const bankrollUnitValue = bankrollEstimate ? Number((bankrollEstimate * bankrollUnitPercent).toFixed(2)) : null;
  const confidenceTier = getConfidenceTier(confidence);
  const preferredMarkets = (profile?.preferredMarkets || []).map((item) => String(item).toUpperCase());

  const tips = Array.isArray(result?.dicas)
    ? result.dicas.map((tip) => {
        const odd = parseOdd(tip?.odd_minima);
        const marketType = normalizeMarketType(tip?.mercado);
        const currentOdd = resolveCurrentOdd(tip, options);
        const estimatedProbability = getEstimatedProbability(tip, confidence);
        const fairOdd = Number((1 / estimatedProbability).toFixed(2));
        const edgeBaseOdd = currentOdd || odd;
        const edgePercent = Number((((edgeBaseOdd / fairOdd) - 1) * 100).toFixed(2));
        const impliedProbability = Number(((1 / edgeBaseOdd) * 100).toFixed(1));
        const baseStake = clamp(Number(tip?.stake || 5), 1, 10);
        const adjustedUnits = clamp(
          Math.round(
            baseStake +
              getProfileAdjustment(riskProfile) +
              getConfidenceAdjustment(confidence) +
              getRiskPenalty(String(tip?.risco || '')) +
              getOddsAdjustment(odd) +
              (preferredMarkets.includes(marketType) ? 1 : 0) +
              (edgePercent >= 5 ? 1 : edgePercent <= -3 ? -1 : 0)
          ),
          1,
          10
        );

        const bankrollPercent = Number((adjustedUnits * bankrollUnitPercent * 100).toFixed(2));
        const recommendedAmount = bankrollUnitValue ? Number((bankrollUnitValue * adjustedUnits).toFixed(2)) : null;
        const profileWarnings: string[] = [];

        if (profile?.minOdds && odd < profile.minOdds) {
          profileWarnings.push(`Odd abaixo da sua mínima (${profile.minOdds.toFixed(2)}).`);
        }

        if (profile?.maxOdds && odd > profile.maxOdds) {
          profileWarnings.push(`Odd acima da sua máxima (${profile.maxOdds.toFixed(2)}).`);
        }

        if (preferredMarkets.length > 0 && !preferredMarkets.includes(marketType)) {
          profileWarnings.push('Fora dos mercados que você marcou como preferidos.');
        }

        if (edgePercent < 2) {
          profileWarnings.push('Sem margem clara de valor acima da odd justa.');
        }

        const qualifiesForUser = edgePercent >= 2 && profileWarnings.length === 0;

        return {
          ...tip,
          odd_minima: odd.toFixed(2),
          current_odd: currentOdd ? currentOdd.toFixed(2) : null,
          probabilidade_estimada: Number((estimatedProbability * 100).toFixed(1)),
          odd_justa: fairOdd.toFixed(2),
          edge_percentual: edgePercent,
          probabilidade_implicita: impliedProbability,
          value_bet: edgePercent >= 2,
          value_label: getEdgeLabel(edgePercent),
          stake_sugerida: {
            unidades: adjustedUnits,
            percentual_banca: bankrollPercent,
            valor_reais: recommendedAmount,
            rotulo: getStakeLabel(adjustedUnits),
            estrategia: getStrategyLabel(riskProfile),
          },
          compatibilidade_perfil: {
            ok: profileWarnings.length === 0,
            qualifica: qualifiesForUser,
            avisos: profileWarnings,
          },
        };
      })
    : [];

  const stakeUnits = tips.map((tip) => tip?.stake_sugerida?.unidades || 0);
  const strongestStake = stakeUnits.length > 0 ? Math.max(...stakeUnits) : 0;
  const averageStake = stakeUnits.length > 0 ? Number((stakeUnits.reduce((sum, value) => sum + value, 0) / stakeUnits.length).toFixed(1)) : 0;
  const valueBetCount = tips.filter((tip) => tip?.value_bet).length;
  const profileQualifiedCount = tips.filter((tip) => tip?.compatibilidade_perfil?.qualifica).length;
  const bestEdge = tips.length > 0 ? Math.max(...tips.map((tip) => Number(tip?.edge_percentual || 0))) : 0;

  return {
    ...result,
    dicas: tips,
    guidance: {
      confidenceTier,
      riskProfileApplied: riskProfile,
      bankrollManagement: {
        strategy: getStrategyLabel(riskProfile),
        unitPercent: Number((bankrollUnitPercent * 100).toFixed(2)),
        unitValue: bankrollUnitValue,
        strongestStake,
        averageStake,
      },
      valueBetSummary: {
        totalTips: tips.length,
        valueBetCount,
        profileQualifiedCount,
        bestEdge: Number(bestEdge.toFixed(2)),
        recommendedDailyLimit: profile?.maxPicksPerDay || Math.min(3, Math.max(1, profileQualifiedCount || valueBetCount || 1)),
      },
      recommendationNote:
        bankrollEstimate
          ? `Com sua banca atual, 1u vale R$ ${bankrollUnitValue?.toFixed(2)}. Ajustei as stakes para o seu perfil ${riskProfile === 'CONSERVATIVE' ? 'conservador' : riskProfile === 'AGGRESSIVE' ? 'agressivo' : 'moderado'}.`
          : `Defina sua banca no perfil para o COLT transformar as unidades em valores reais e melhorar sua gestão.`,
    },
  };
}
