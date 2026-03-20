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

export function decorateRecommendationResult(
  result: RecommendationResult,
  profile?: RecommendationUserProfile | null
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
        const baseStake = clamp(Number(tip?.stake || 5), 1, 10);
        const adjustedUnits = clamp(
          Math.round(
            baseStake +
              getProfileAdjustment(riskProfile) +
              getConfidenceAdjustment(confidence) +
              getRiskPenalty(String(tip?.risco || '')) +
              getOddsAdjustment(odd) +
              (preferredMarkets.includes(marketType) ? 1 : 0)
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

        return {
          ...tip,
          odd_minima: odd.toFixed(2),
          stake_sugerida: {
            unidades: adjustedUnits,
            percentual_banca: bankrollPercent,
            valor_reais: recommendedAmount,
            rotulo: getStakeLabel(adjustedUnits),
            estrategia: getStrategyLabel(riskProfile),
          },
          compatibilidade_perfil: {
            ok: profileWarnings.length === 0,
            avisos: profileWarnings,
          },
        };
      })
    : [];

  const stakeUnits = tips.map((tip) => tip?.stake_sugerida?.unidades || 0);
  const strongestStake = stakeUnits.length > 0 ? Math.max(...stakeUnits) : 0;
  const averageStake = stakeUnits.length > 0 ? Number((stakeUnits.reduce((sum, value) => sum + value, 0) / stakeUnits.length).toFixed(1)) : 0;

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
      recommendationNote:
        bankrollEstimate
          ? `Com sua banca atual, 1u vale R$ ${bankrollUnitValue?.toFixed(2)}. Ajustei as stakes para o seu perfil ${riskProfile === 'CONSERVATIVE' ? 'conservador' : riskProfile === 'AGGRESSIVE' ? 'agressivo' : 'moderado'}.`
          : `Defina sua banca no perfil para o COLT transformar as unidades em valores reais e melhorar sua gestão.`,
    },
  };
}
