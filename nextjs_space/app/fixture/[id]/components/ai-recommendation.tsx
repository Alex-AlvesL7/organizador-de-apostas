'use client';

import { useState, useEffect } from 'react';
import { Flame, Target, AlertTriangle, Shield, RefreshCw, Crosshair, BookmarkPlus, CheckCircle2, LogIn } from 'lucide-react';
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

      {/* Dicas de Apostas */}
      <div>
        <div className="flex items-center space-x-2 mb-4">
          <Target className="w-5 h-5 text-emerald-600" />
          <h3 className="text-lg font-bold text-slate-900">
            Dicas do Colt ({recommendation?.dicas?.length || 0} apostas)
          </h3>
        </div>

        <div className="space-y-4">
          {recommendation?.dicas?.map((dica: any, index: number) => (
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
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getRiskColor(dica?.risco)}`}>
                  Risco {dica?.risco}
                </span>
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-emerald-50 rounded-xl p-4 text-center">
                    <p className="text-xs text-emerald-700 font-semibold mb-1">ODD MÍNIMA</p>
                    <p className="text-3xl font-black text-emerald-700">{dica?.odd_minima}</p>
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
