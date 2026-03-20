'use client';

import { useState, useEffect } from 'react';
import { Flame, Target, AlertTriangle, Shield, RefreshCw, Crosshair, BookmarkPlus, CheckCircle2, LogIn, Wallet, BarChart3, TrendingUp, Filter } from 'lucide-react';
import { signIn, useSession } from 'next-auth/react';
import toast from 'react-hot-toast';

interface AIRecommendationProps {
  fixtureId: string;
  fixture: any;
  odds: any;
  statistics: any;
  h2h: any;
}

export default function AIRecommendation({
  fixtureId,
  fixture,
  odds,
  statistics,
  h2h,
}: AIRecommendationProps) {
  const { data: session, status: sessionStatus } = useSession();
  const [recommendation, setRecommendation] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [autoLoaded, setAutoLoaded] = useState(false);
  const [checkingCache, setCheckingCache] = useState(false);
  const [savingToHistory, setSavingToHistory] = useState(false);
  const [savedToHistory, setSavedToHistory] = useState(false);
  const [showOnlyValueBets, setShowOnlyValueBets] = useState(false);
  const [showOnlyQualified, setShowOnlyQualified] = useState(false);

  useEffect(() => {
    if (!autoLoaded && fixture && fixtureId) {
      setAutoLoaded(true);
      void loadExistingRecommendation();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fixture, fixtureId]);

  useEffect(() => {
    if (sessionStatus !== 'authenticated' || !fixtureId || !recommendation) {
      setSavedToHistory(false);
      return;
    }

    void checkSavedStatus();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionStatus, fixtureId, recommendation]);

  const loadExistingRecommendation = async () => {
    try {
      setCheckingCache(true);
      const response = await fetch(`/api/recommendation?fixtureId=${fixtureId}`);

      if (response.ok) {
        const data = await response.json();
        if (data?.result) {
          setRecommendation(data.result);
          return;
        }
      }

      await generateRecommendation();
    } catch (error) {
      console.error('Error loading cached recommendation:', error);
      await generateRecommendation();
    } finally {
      setCheckingCache(false);
    }
  };

  const checkSavedStatus = async () => {
    try {
      const response = await fetch(`/api/user-picks?matchId=${fixtureId}`);
      if (!response.ok) {
        setSavedToHistory(false);
        return;
      }

      const data = await response.json();
      setSavedToHistory(Boolean(data?.saved));
    } catch (error) {
      console.error('Error checking saved picks:', error);
      setSavedToHistory(false);
    }
  };

  const generateRecommendation = async (forceNew = false) => {
    try {
      setLoading(true);
      setProgress(0);
      if (forceNew || !recommendation) {
        setRecommendation(null);
      }

      const response = await fetch('/api/recommendation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fixtureId,
          fixture,
          odds,
          statistics,
          h2h,
          forceNew,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate recommendation');
      }

      const reader = response?.body?.getReader();
      if (!reader) throw new Error('No reader available');

      const decoder = new TextDecoder();
      let partialRead = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        partialRead += decoder.decode(value, { stream: true });
        let lines = partialRead.split('\n');
        partialRead = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              return;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed?.status === 'processing') {
                setProgress((prev: number) => Math.min(prev + 2, 95));
              } else if (parsed?.status === 'completed') {
                setRecommendation(parsed?.result);
                setProgress(100);
                return;
              } else if (parsed?.status === 'error') {
                throw new Error(parsed?.message || 'Generation failed');
              }
            } catch (e: any) {
              if (e?.message?.includes('Generation failed') || e?.message?.includes('Erro')) throw e;
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Error generating recommendation:', error);
      toast.error('Erro ao gerar análise do Colt. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const savePicksToHistory = async () => {
    if (sessionStatus !== 'authenticated') {
      await signIn('google', { callbackUrl: `/fixture/${fixtureId}` });
      return;
    }

    try {
      setSavingToHistory(true);
      const response = await fetch('/api/user-picks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId: fixtureId }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Não foi possível salvar suas apostas');
      }

      setSavedToHistory(true);

      if (data.savedCount > 0) {
        toast.success(`${data.savedCount} aposta(s) salva(s) no seu histórico.`);
      } else {
        toast.success('Essas apostas já estavam salvas no seu histórico.');
      }
    } catch (error: any) {
      console.error('Error saving picks:', error);
      toast.error(error?.message || 'Erro ao salvar apostas no histórico.');
    } finally {
      setSavingToHistory(false);
    }
  };

  const getConfidenceColor = (conf: number) => {
    if (conf >= 80) return 'from-emerald-500 to-green-600';
    if (conf >= 60) return 'from-yellow-500 to-orange-500';
    return 'from-red-500 to-rose-600';
  };

  const getConfidenceLabel = (conf: number) => {
    if (conf >= 80) return '🔥 Alta Confiança';
    if (conf >= 60) return '⚠️ Confiança Média';
    return '⛔ Baixa Confiança';
  };

  const getRiskColor = (risco: string) => {
    const r = risco?.toLowerCase();
    if (r?.includes('baix')) return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    if (r?.includes('méd') || r?.includes('med')) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-red-100 text-red-800 border-red-300';
  };

  const getStakeBar = (stake: number) => {
    return Math.min(Math.max(stake, 1), 10) * 10;
  };

  const getRiskProfileLabel = (profile: string) => {
    if (profile === 'CONSERVATIVE') return 'Conservador';
    if (profile === 'AGGRESSIVE') return 'Agressivo';
    return 'Moderado';
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (typeof value !== 'number' || Number.isNaN(value)) return null;
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const visibleTips = (recommendation?.dicas || []).filter((dica: any) => {
    if (showOnlyQualified && !dica?.compatibilidade_perfil?.qualifica) {
      return false;
    }

    if (showOnlyValueBets && !dica?.value_bet) {
      return false;
    }

    return true;
  });

  // Loading state
  if (loading || checkingCache) {
    return (
      <div className="py-12">
        <div className="max-w-md mx-auto text-center">
          <div className="relative inline-block mb-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center animate-pulse">
              <Crosshair className="w-10 h-10 text-white animate-spin" style={{ animationDuration: '3s' }} />
            </div>
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">
            {checkingCache ? '🧠 Buscando análise salva...' : '🎯 O Colt está analisando...'}
          </h3>
          <p className="text-slate-500 text-sm mb-6">
            {checkingCache ? 'Verificando se este jogo já foi analisado anteriormente.' : 'Cruzando estatísticas, odds, histórico e tendências'}
          </p>
          <div className="h-3 bg-slate-200 rounded-full overflow-hidden mb-2">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-slate-400">{progress}% concluído</p>
        </div>
      </div>
    );
  }

  // No recommendation yet (fallback - shouldn't happen with auto-load)
  if (!recommendation && !loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full mb-6">
          <Crosshair className="w-10 h-10 text-white" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">
          🎯 Análise do Colt
        </h3>
        <p className="text-slate-600 mb-6 max-w-md mx-auto">
          O Colt vai analisar tudo e te dar as melhores dicas de apostas para este jogo.
        </p>
        <button
          onClick={() => generateRecommendation()}
          className="inline-flex items-center space-x-2 px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-bold text-lg hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg hover:shadow-xl"
        >
          <Crosshair className="w-6 h-6" />
          <span>Gerar Análise do Colt</span>
        </button>
      </div>
    );
  }

  if (!recommendation) return null;

  return (
    <div className="space-y-6">
      {/* Colt Header + Veredito */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 rounded-2xl p-6 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="relative">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
              <Crosshair className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Análise do Colt</h3>
              <p className="text-emerald-300 text-xs">Consultor Especialista em Apostas</p>
            </div>
            <div className="ml-auto">
              <div className={`px-4 py-2 rounded-full bg-gradient-to-r ${getConfidenceColor(recommendation?.confianca || 0)} font-bold text-sm`}>
                {getConfidenceLabel(recommendation?.confianca || 0)} • {recommendation?.confianca}%
              </div>
            </div>
          </div>

          {/* Veredito */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 mb-4">
            <div className="flex items-start space-x-3">
              <Flame className="w-7 h-7 text-orange-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-emerald-300 uppercase tracking-wider font-semibold mb-1">Veredito</p>
                <p className="text-xl font-bold leading-tight">{recommendation?.veredito}</p>
              </div>
            </div>
          </div>

          {/* Placar Provável + Resumo Rápido */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 rounded-xl p-4 text-center">
              <p className="text-xs text-slate-400 mb-1">Placar Provável</p>
              <p className="text-3xl font-black">{recommendation?.placar_provavel || '-'}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-xs text-slate-400 mb-1">💡 Resumo Rápido</p>
              <p className="text-sm font-medium leading-snug">{recommendation?.resumo_rapido}</p>
            </div>
          </div>
        </div>
      </div>

      {recommendation?.guidance && (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <div className="mb-3 flex items-center gap-2 text-emerald-700">
              <Shield className="h-5 w-5" />
              <h4 className="font-bold">Score do jogo</h4>
            </div>
            <p className="text-2xl font-black text-emerald-800">{recommendation?.confianca || 0}/100</p>
            <p className="mt-1 text-sm font-semibold text-emerald-700">
              {recommendation?.guidance?.confidenceTier?.label || 'Boa'}
            </p>
            <p className="mt-2 text-sm text-emerald-800/80">
              {recommendation?.guidance?.confidenceTier?.summary}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-3 flex items-center gap-2 text-slate-700">
              <Wallet className="h-5 w-5" />
              <h4 className="font-bold">Gestão de banca</h4>
            </div>
            <p className="text-sm font-semibold text-slate-900">
              Perfil {getRiskProfileLabel(recommendation?.guidance?.riskProfileApplied)}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              1u = {recommendation?.guidance?.bankrollManagement?.unitPercent || 0}% da banca
              {recommendation?.guidance?.bankrollManagement?.unitValue
                ? ` (${formatCurrency(recommendation?.guidance?.bankrollManagement?.unitValue)})`
                : ''}
            </p>
            <p className="mt-2 text-sm text-slate-600">{recommendation?.guidance?.recommendationNote}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-3 flex items-center gap-2 text-slate-700">
              <BarChart3 className="h-5 w-5" />
              <h4 className="font-bold">Plano sugerido</h4>
            </div>
            <div className="space-y-2 text-sm text-slate-700">
              <p>
                <span className="font-semibold text-slate-900">Estratégia:</span>{' '}
                {recommendation?.guidance?.bankrollManagement?.strategy}
              </p>
              <p>
                <span className="font-semibold text-slate-900">Maior stake:</span>{' '}
                {recommendation?.guidance?.bankrollManagement?.strongestStake || 0}u
              </p>
              <p>
                <span className="font-semibold text-slate-900">Média das picks:</span>{' '}
                {recommendation?.guidance?.bankrollManagement?.averageStake || 0}u
              </p>
            </div>
          </div>
        </div>
      )}

      {recommendation?.guidance?.valueBetSummary && (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-emerald-200 bg-white p-5">
            <div className="mb-3 flex items-center gap-2 text-emerald-700">
              <TrendingUp className="h-5 w-5" />
              <h4 className="font-bold">Value bets</h4>
            </div>
            <p className="text-2xl font-black text-slate-900">
              {recommendation.guidance.valueBetSummary.valueBetCount}/{recommendation.guidance.valueBetSummary.totalTips}
            </p>
            <p className="mt-1 text-sm text-slate-600">Picks com edge positivo acima da odd justa.</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-3 flex items-center gap-2 text-slate-700">
              <Filter className="h-5 w-5" />
              <h4 className="font-bold">Seu filtro</h4>
            </div>
            <p className="text-2xl font-black text-slate-900">
              {recommendation.guidance.valueBetSummary.profileQualifiedCount}
            </p>
            <p className="mt-1 text-sm text-slate-600">Picks que estão com valor e batem no seu perfil.</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-3 flex items-center gap-2 text-slate-700">
              <BarChart3 className="h-5 w-5" />
              <h4 className="font-bold">Melhor edge</h4>
            </div>
            <p className="text-2xl font-black text-slate-900">
              {recommendation.guidance.valueBetSummary.bestEdge > 0 ? '+' : ''}{recommendation.guidance.valueBetSummary.bestEdge}%
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Máximo ideal hoje: {recommendation.guidance.valueBetSummary.recommendedDailyLimit} entrada(s).
            </p>
          </div>
        </div>
      )}

      {/* Dicas de Apostas */}
      <div>
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center space-x-2">
            <Target className="w-5 h-5 text-emerald-600" />
            <h3 className="text-lg font-bold text-slate-900">
              Dicas do Colt ({visibleTips.length}/{recommendation?.dicas?.length || 0} apostas)
            </h3>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowOnlyValueBets((prev) => !prev)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                showOnlyValueBets ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 border border-slate-200'
              }`}
            >
              Só value bets
            </button>
            <button
              onClick={() => setShowOnlyQualified((prev) => !prev)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                showOnlyQualified ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200'
              }`}
            >
              Só no meu perfil
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {visibleTips.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <p className="font-semibold text-slate-800">Nenhuma pick bate com o filtro atual.</p>
              <p className="mt-1 text-sm text-slate-600">Tente liberar o filtro ou gerar uma nova análise.</p>
            </div>
          )}

          {visibleTips.map((dica: any, index: number) => (
            <div
              key={index}
              className="bg-white border-2 border-slate-200 rounded-xl overflow-hidden hover:border-emerald-300 hover:shadow-lg transition-all"
            >
              {/* Dica Header */}
              <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-3 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {index + 1}
                  </span>
                  <span className="text-white font-bold">{dica?.mercado}</span>
                </div>
                <div className="flex items-center gap-2">
                  {dica?.value_label && (
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${dica?.value_bet ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-slate-100 text-slate-700 border-slate-300'}`}>
                      {dica?.value_label}
                    </span>
                  )}
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getRiskColor(dica?.risco)}`}>
                    Risco {dica?.risco}
                  </span>
                </div>
              </div>

              {/* Dica Body */}
              <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <p className="text-lg font-bold text-slate-900 mb-1">{dica?.aposta}</p>
                    <p className="text-slate-600 text-sm">{dica?.motivo}</p>
                  </div>
                </div>

                {/* Odd + Stake */}
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                  <div className="bg-emerald-50 rounded-xl p-4 text-center">
                    <p className="text-xs text-emerald-700 font-semibold mb-1">ODD MÍNIMA</p>
                    <p className="text-3xl font-black text-emerald-700">{dica?.odd_minima}</p>
                  </div>
                  <div className="bg-sky-50 rounded-xl p-4 text-center">
                    <p className="text-xs text-sky-700 font-semibold mb-1">ODD ATUAL</p>
                    <p className="text-3xl font-black text-sky-700">{dica?.current_odd || '-'}</p>
                  </div>
                  <div className="bg-violet-50 rounded-xl p-4 text-center">
                    <p className="text-xs text-violet-700 font-semibold mb-1">ODD JUSTA</p>
                    <p className="text-3xl font-black text-violet-700">{dica?.odd_justa || '-'}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-xs text-slate-600 font-semibold mb-2">STAKE ({dica?.stake}/10)</p>
                    <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          (dica?.stake || 0) >= 7 ? 'bg-emerald-500' : (dica?.stake || 0) >= 4 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${getStakeBar(dica?.stake || 0)}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {(dica?.stake || 0) >= 7 ? 'Apostar forte' : (dica?.stake || 0) >= 4 ? 'Aposta moderada' : 'Aposta conservadora'}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className={`rounded-xl border p-4 ${dica?.edge_percentual >= 2 ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Edge real</p>
                    <p className={`mt-1 text-2xl font-black ${dica?.edge_percentual >= 2 ? 'text-emerald-700' : 'text-slate-800'}`}>
                      {dica?.edge_percentual > 0 ? '+' : ''}{dica?.edge_percentual}%
                    </p>
                    <p className="mt-1 text-xs text-slate-600">Comparação entre odd atual e odd justa.</p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Probabilidade estimada</p>
                    <p className="mt-1 text-2xl font-black text-slate-900">{dica?.probabilidade_estimada}%</p>
                    <p className="mt-1 text-xs text-slate-600">Mercado precifica {dica?.probabilidade_implicita}% nesta odd.</p>
                  </div>

                  <div className={`rounded-xl border p-4 ${dica?.compatibilidade_perfil?.qualifica ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status no seu perfil</p>
                    <p className={`mt-1 text-sm font-bold ${dica?.compatibilidade_perfil?.qualifica ? 'text-emerald-700' : 'text-amber-800'}`}>
                      {dica?.compatibilidade_perfil?.qualifica ? 'Aprovada para entrada' : 'Precisa de cautela'}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      {dica?.compatibilidade_perfil?.qualifica ? 'Combina valor e seus filtros pessoais.' : 'Veja os avisos antes de entrar.'}
                    </p>
                  </div>
                </div>

                {dica?.stake_sugerida && (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Stake sugerida para você
                        </p>
                        <p className="mt-1 text-lg font-bold text-slate-900">
                          {dica?.stake_sugerida?.unidades}u • {dica?.stake_sugerida?.rotulo}
                        </p>
                        <p className="text-sm text-slate-600">
                          Exposição de {dica?.stake_sugerida?.percentual_banca}% da banca
                          {dica?.stake_sugerida?.valor_reais
                            ? ` • ${formatCurrency(dica?.stake_sugerida?.valor_reais)}`
                            : ''}
                        </p>
                      </div>
                      <div className="rounded-lg bg-white px-3 py-2 text-sm text-slate-600 border border-slate-200">
                        {dica?.stake_sugerida?.estrategia}
                      </div>
                    </div>

                    {dica?.compatibilidade_perfil?.avisos?.length > 0 && (
                      <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 mb-1">
                          Ajuste ao seu perfil
                        </p>
                        <ul className="space-y-1 text-sm text-amber-800">
                          {dica.compatibilidade_perfil.avisos.map((aviso: string, avisoIndex: number) => (
                            <li key={avisoIndex}>• {aviso}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h4 className="font-bold text-slate-900">Salvar apostas no seu histórico</h4>
            <p className="text-sm text-slate-600">
              Entre com Google para acompanhar os acertos e erros das picks do Colt na sua conta.
            </p>
          </div>
          <button
            onClick={savePicksToHistory}
            disabled={savingToHistory || savedToHistory}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
              savedToHistory
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-slate-900 text-white hover:bg-slate-800'
            } disabled:cursor-not-allowed disabled:opacity-70`}
          >
            {savedToHistory ? <CheckCircle2 className="h-4 w-4" /> : sessionStatus === 'authenticated' ? <BookmarkPlus className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
            <span>
              {savedToHistory
                ? 'Apostas já salvas'
                : savingToHistory
                ? 'Salvando...'
                : sessionStatus === 'authenticated'
                ? 'Salvar picks no meu histórico'
                : 'Entrar com Google'}
            </span>
          </button>
        </div>
      </div>

      {/* Análise Completa do Colt */}
      <div className="bg-gradient-to-br from-slate-50 to-emerald-50/50 rounded-2xl p-6 border border-slate-200">
        <div className="flex items-center space-x-2 mb-4">
          <Shield className="w-5 h-5 text-emerald-600" />
          <h3 className="text-lg font-bold text-slate-900">Análise Completa do Colt</h3>
        </div>
        <p className="text-slate-700 leading-relaxed whitespace-pre-line">
          {recommendation?.analise_colt}
        </p>
      </div>

      {/* Alerta */}
      {recommendation?.alerta && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-5">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-amber-900 mb-1">⚠️ Alerta do Colt</h4>
              <p className="text-amber-800 text-sm">{recommendation?.alerta}</p>
            </div>
          </div>
        </div>
      )}

      {/* Refresh */}
      <div className="text-center pt-2">
        <button
          onClick={() => generateRecommendation(true)}
          className="inline-flex items-center space-x-2 px-5 py-2.5 bg-slate-100 text-slate-700 rounded-lg font-medium text-sm hover:bg-slate-200 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Gerar nova análise</span>
        </button>
        <p className="text-xs text-slate-400 mt-2">Aposte com responsabilidade. Estas são análises baseadas em dados e IA.</p>
      </div>
    </div>
  );
}
