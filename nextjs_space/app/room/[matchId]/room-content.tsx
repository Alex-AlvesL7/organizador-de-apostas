'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import {
  Target, Trophy, TrendingUp, TrendingDown, Clock, CheckCircle, XCircle,
  Minus, Send, MessageSquare, BarChart3, Crosshair, Shield, Flame,
  AlertTriangle, RefreshCw, ChevronDown, ChevronUp, Zap
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import toast, { Toaster } from 'react-hot-toast';

interface RoomContentProps {
  matchId: string;
}

export default function RoomContent({ matchId }: RoomContentProps) {
  const { data: session } = useSession();
  const [fixture, setFixture] = useState<any>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [picks, setPicks] = useState<any[]>([]);
  const [conversation, setConversation] = useState<any[]>([]);
  const [leagueStats, setLeagueStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [sending, setSending] = useState(false);
  const [activeSection, setActiveSection] = useState<'analysis' | 'picks' | 'chat'>('chat');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadRoomData();
    loadFixture();
  }, [matchId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  async function loadFixture() {
    try {
      const res = await fetch(`/api/fixture/${matchId}`);
      if (res.ok) {
        const data = await res.json();
        setFixture(data?.fixture);
      }
    } catch (err) {
      console.error('Error loading fixture:', err);
    }
  }

  async function loadRoomData() {
    setLoading(true);
    try {
      const res = await fetch(`/api/room/${matchId}`);
      if (res.ok) {
        const data = await res.json();
        setAnalysis(data.analysis);
        setPicks(data.picks || []);
        setConversation(data.conversation || []);
        setLeagueStats(data.leagueStats);
      }
    } catch (err) {
      console.error('Error loading room data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function generateAnalysis() {
    if (!fixture) return;
    setLoadingAnalysis(true);
    try {
      // Fetch odds for the analysis
      let odds = null;
      try {
        const oddsRes = await fetch(`/api/odds/${matchId}`);
        if (oddsRes.ok) { const d = await oddsRes.json(); odds = d?.odds; }
      } catch (e) { /* no odds */ }

      let statistics = null;
      try {
        const statsRes = await fetch(`/api/statistics/${matchId}`);
        if (statsRes.ok) { const d = await statsRes.json(); statistics = d?.statistics; }
      } catch (e) { /* no stats */ }

      let h2h = null;
      try {
        const homeId = fixture?.teams?.home?.id;
        const awayId = fixture?.teams?.away?.id;
        if (homeId && awayId) {
          const h2hRes = await fetch(`/api/h2h?team1=${homeId}&team2=${awayId}`);
          if (h2hRes.ok) { const d = await h2hRes.json(); h2h = d?.h2h; }
        }
      } catch (e) { /* no h2h */ }

      const response = await fetch('/api/recommendation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fixtureId: matchId, fixture, odds, statistics, h2h }),
      });

      if (!response.ok) throw new Error('Failed to generate');

      const reader = response?.body?.getReader();
      if (!reader) throw new Error('No reader');
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
            if (data === '[DONE]') { await loadRoomData(); return; }
            try {
              const parsed = JSON.parse(data);
              if (parsed?.status === 'completed') {
                await loadRoomData();
                return;
              }
            } catch (e) { /* skip */ }
          }
        }
      }
      await loadRoomData();
    } catch (err) {
      toast.error('Erro ao gerar an\u00e1lise');
    } finally {
      setLoadingAnalysis(false);
    }
  }

  async function sendMessage() {
    const msg = chatInput.trim();
    if (!msg || sending) return;
    setSending(true);
    setChatInput('');

    // Optimistic update
    const tempMsg = { id: 'temp-' + Date.now(), matchId, role: 'USER', message: msg, createdAt: new Date().toISOString() };
    setConversation(prev => [...prev, tempMsg]);

    try {
      const res = await fetch('/api/room/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, message: msg, userId: session?.user?.id || null }),
      });
      const data = await res.json();
      if (data.message) {
        const assistantMsg = { id: 'asst-' + Date.now(), matchId, role: 'ASSISTANT', message: data.message, createdAt: new Date().toISOString() };
        setConversation(prev => [...prev, assistantMsg]);
      } else {
        toast.error(data.error || 'Erro no chat');
      }
    } catch (err) {
      toast.error('Erro ao enviar mensagem');
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    });
  }

  const getResultBadge = (result: string) => {
    const config: Record<string, { color: string; icon: any; label: string }> = {
      WIN: { color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: CheckCircle, label: 'WIN' },
      LOSS: { color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: XCircle, label: 'LOSS' },
      PUSH: { color: 'bg-slate-500/20 text-slate-400 border-slate-500/30', icon: Minus, label: 'PUSH' },
      VOID: { color: 'bg-slate-500/20 text-slate-400 border-slate-500/30', icon: Minus, label: 'VOID' },
    };
    const c = config[result] || config.VOID;
    const Icon = c.icon;
    return <span className={`px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 border ${c.color}`}><Icon className="w-3 h-3" /> {c.label}</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-emerald-500 border-t-transparent mx-auto mb-4" />
          <p className="text-slate-400">Carregando sala...</p>
        </div>
      </div>
    );
  }

  const homeTeam = fixture?.teams?.home?.name || analysis?.homeTeam || 'Time Casa';
  const awayTeam = fixture?.teams?.away?.name || analysis?.awayTeam || 'Time Fora';
  const league = fixture?.league?.name || analysis?.league || '';
  const rawResult = analysis?.rawResult as any;

  return (
    <div>
      <Toaster position="top-right" />

      {/* Match Header Panel */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 p-5 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {fixture?.teams?.home?.logo && (
              <div className="relative w-12 h-12">
                <Image src={fixture.teams.home.logo} alt={homeTeam} fill className="object-contain" unoptimized />
              </div>
            )}
            <div>
              <div className="text-white font-bold text-lg">{homeTeam} vs {awayTeam}</div>
              <div className="text-slate-400 text-sm">{league} {fixture?.league?.round ? `\u2022 ${fixture.league.round}` : ''}</div>
            </div>
            {fixture?.teams?.away?.logo && (
              <div className="relative w-12 h-12">
                <Image src={fixture.teams.away.logo} alt={awayTeam} fill className="object-contain" unoptimized />
              </div>
            )}
          </div>
          <div className="text-right">
            {fixture?.goals?.home !== null && fixture?.goals?.home !== undefined ? (
              <div className="text-3xl font-black text-white">{fixture.goals.home} - {fixture.goals.away}</div>
            ) : (
              <div className="text-emerald-400 font-bold">VS</div>
            )}
            <div className="text-xs text-slate-500">
              {fixture?.fixture?.status?.short === 'FT' ? 'Finalizado' : fixture?.fixture?.status?.short === 'NS' ? 'N\u00e3o iniciado' : fixture?.fixture?.date ? formatDate(fixture.fixture.date) : ''}
            </div>
          </div>
        </div>

        {/* League Performance Banner */}
        {leagueStats && leagueStats.total > 0 && (
          <div className="mt-4 bg-slate-700/50 rounded-xl p-3 flex items-center gap-4 text-sm">
            <div className="text-slate-400 flex items-center gap-1"><BarChart3 className="w-4 h-4" /> Colt na {leagueStats.league}:</div>
            <div className="text-emerald-400 font-bold">{leagueStats.winRate}% Win Rate</div>
            <div className={`font-bold ${leagueStats.roi >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>ROI: {leagueStats.roi >= 0 ? '+' : ''}{leagueStats.roi}%</div>
            <div className="text-slate-400">{leagueStats.wins}W / {leagueStats.losses}L / {leagueStats.pushes}P</div>
            <div className={`font-bold ${leagueStats.totalProfitUnits >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{leagueStats.totalProfitUnits >= 0 ? '+' : ''}{leagueStats.totalProfitUnits}u</div>
          </div>
        )}
      </div>

      {/* Section Tabs */}
      <div className="flex gap-2 mb-4">
        {[
          { key: 'chat' as const, label: 'Chat com Colt', icon: MessageSquare },
          { key: 'analysis' as const, label: 'An\u00e1lise', icon: Crosshair },
          { key: 'picks' as const, label: `Picks (${picks.length})`, icon: Target },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveSection(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeSection === tab.key
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                  : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-700/60 border border-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* CHAT SECTION */}
      {activeSection === 'chat' && (
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 overflow-hidden flex flex-col" style={{ height: '520px' }}>
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {conversation.length === 0 && (
              <div className="text-center py-12">
                <MessageSquare className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400 font-medium">Sala do Colt</p>
                <p className="text-slate-500 text-sm mt-1">Pergunte sobre o jogo, pe\u00e7a detalhes das picks, discuta estrat\u00e9gias...</p>
                <div className="flex flex-wrap justify-center gap-2 mt-4">
                  {[
                    'Explica melhor a pick principal',
                    'Quais os riscos desse jogo?',
                    'Not\u00edcias recentes dos times',
                    'Vale apostar ao vivo?',
                  ].map((suggestion, i) => (
                    <button
                      key={i}
                      onClick={() => { setChatInput(suggestion); inputRef.current?.focus(); }}
                      className="px-3 py-1.5 bg-slate-700/60 border border-slate-600 rounded-lg text-xs text-slate-300 hover:bg-slate-600/60 hover:text-white transition-all"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {conversation.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'USER' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                  msg.role === 'USER'
                    ? 'bg-emerald-600 text-white rounded-br-md'
                    : 'bg-slate-700/80 text-slate-200 rounded-bl-md border border-slate-600'
                }`}>
                  {msg.role === 'ASSISTANT' && (
                    <div className="flex items-center gap-1.5 mb-1">
                      <Crosshair className="w-3 h-3 text-emerald-400" />
                      <span className="text-xs font-bold text-emerald-400">Colt</span>
                    </div>
                  )}
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                  <p className={`text-xs mt-1 ${msg.role === 'USER' ? 'text-white/50' : 'text-slate-500'}`}>
                    {formatDate(msg.createdAt)}
                  </p>
                </div>
              </div>
            ))}

            {sending && (
              <div className="flex justify-start">
                <div className="bg-slate-700/80 rounded-2xl rounded-bl-md px-4 py-3 border border-slate-600">
                  <div className="flex items-center gap-2">
                    <Crosshair className="w-3 h-3 text-emerald-400 animate-spin" />
                    <span className="text-xs text-emerald-400">Colt est\u00e1 digitando...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input */}
          <div className="border-t border-slate-700 p-3">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Pergunte ao Colt sobre este jogo..."
                className="flex-1 bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                disabled={sending}
              />
              <button
                onClick={sendMessage}
                disabled={sending || !chatInput.trim()}
                className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ANALYSIS SECTION */}
      {activeSection === 'analysis' && (
        <div className="space-y-4">
          {!analysis && !loadingAnalysis && (
            <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-12 text-center">
              <Crosshair className="w-14 h-14 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 font-medium mb-4">An\u00e1lise ainda n\u00e3o gerada para este jogo</p>
              <button
                onClick={generateAnalysis}
                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg"
              >
                <Crosshair className="w-5 h-5" />
                Gerar An\u00e1lise do Colt
              </button>
            </div>
          )}

          {loadingAnalysis && (
            <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-600/20 flex items-center justify-center mx-auto mb-4">
                <Crosshair className="w-8 h-8 text-emerald-400 animate-spin" style={{ animationDuration: '3s' }} />
              </div>
              <p className="text-white font-bold">\ud83c\udfaf O Colt est\u00e1 analisando...</p>
              <p className="text-slate-500 text-sm mt-1">Cruzando estat\u00edsticas, odds e hist\u00f3rico</p>
            </div>
          )}

          {analysis && rawResult && (
            <>
              {/* Veredito */}
              <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-600/30 flex items-center justify-center">
                    <Crosshair className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold">An\u00e1lise do Colt</h3>
                    <p className="text-emerald-400 text-xs">Confian\u00e7a: {analysis.confianca}%</p>
                  </div>
                </div>

                <div className="bg-slate-700/50 rounded-xl p-4 mb-4">
                  <div className="flex items-start gap-2">
                    <Flame className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-emerald-400 uppercase font-semibold mb-1">Veredito</p>
                      <p className="text-white font-bold text-lg">{analysis.veredito}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-slate-700/30 rounded-xl p-3 text-center">
                    <p className="text-xs text-slate-500">Placar Prov\u00e1vel</p>
                    <p className="text-2xl font-black text-white">{analysis.placarProvavel || '-'}</p>
                  </div>
                  <div className="bg-slate-700/30 rounded-xl p-3">
                    <p className="text-xs text-slate-500">Resumo R\u00e1pido</p>
                    <p className="text-sm text-slate-300">{analysis.resumoRapido || '-'}</p>
                  </div>
                </div>

                {/* Dicas */}
                {rawResult?.dicas && (
                  <div className="space-y-3">
                    <h4 className="text-white font-bold flex items-center gap-2"><Target className="w-4 h-4 text-emerald-400" /> Dicas do Colt</h4>
                    {rawResult.dicas.map((dica: any, i: number) => (
                      <div key={i} className="bg-slate-700/40 rounded-xl p-4 border border-slate-600/50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-emerald-400 font-bold text-sm">{dica.mercado}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            dica.risco?.toLowerCase().includes('baix') ? 'bg-green-500/20 text-green-400'
                            : dica.risco?.toLowerCase().includes('alt') ? 'bg-red-500/20 text-red-400'
                            : 'bg-yellow-500/20 text-yellow-400'
                          }`}>Risco {dica.risco}</span>
                        </div>
                        <p className="text-white font-semibold">{dica.aposta}</p>
                        <p className="text-slate-400 text-sm mt-1">{dica.motivo}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <span className="text-emerald-400">Odd m\u00edn: {dica.odd_minima}</span>
                          <span className="text-slate-400">Stake: {dica.stake}/10</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Full analysis text */}
                <div className="mt-4 bg-slate-700/30 rounded-xl p-4">
                  <h4 className="text-white font-bold flex items-center gap-2 mb-2"><Shield className="w-4 h-4 text-emerald-400" /> An\u00e1lise Completa</h4>
                  <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">{analysis.analiseColt}</p>
                </div>

                {analysis.alerta && (
                  <div className="mt-3 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-amber-400 font-bold text-sm">Alerta do Colt</p>
                        <p className="text-amber-300/80 text-sm">{analysis.alerta}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* PICKS SECTION */}
      {activeSection === 'picks' && (
        <div className="space-y-3">
          {picks.length === 0 ? (
            <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-12 text-center">
              <Target className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">Nenhuma pick registrada para este jogo</p>
              <p className="text-slate-500 text-sm mt-1">Gere a an\u00e1lise do Colt para criar picks automaticamente.</p>
            </div>
          ) : (
            picks.map((pick) => (
              <div key={pick.id} className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        pick.riskLevel === 'LOW' ? 'bg-green-500/20 text-green-400'
                        : pick.riskLevel === 'HIGH' ? 'bg-red-500/20 text-red-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                      }`}>{pick.riskLevel}</span>
                      <span className="text-slate-500 text-xs">{pick.marketType}</span>
                    </div>
                    <p className="text-white font-bold">{pick.selection}</p>
                    <div className="flex items-center gap-3 mt-1 text-sm">
                      <span className="text-emerald-400">Odd m\u00edn: {pick.recommendedOddsMin}</span>
                      {pick.currentOddsAtPick && <span className="text-slate-400">Odd real: {pick.currentOddsAtPick}</span>}
                      <span className="text-slate-400">Stake: {pick.stakeUnits}u</span>
                      <span className="text-slate-400">Confian\u00e7a: {pick.confidence}%</span>
                    </div>
                    <p className="text-slate-500 text-xs mt-2">{pick.reasoning}</p>
                  </div>
                  <div className="ml-4 text-right">
                    {pick.status === 'SETTLED' && pick.result ? (
                      <div className="flex flex-col items-end gap-1">
                        {getResultBadge(pick.result.result)}
                        <span className={`text-sm font-bold ${pick.result.profitUnits >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {pick.result.profitUnits >= 0 ? '+' : ''}{pick.result.profitUnits.toFixed(2)}u
                        </span>
                      </div>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {pick.status}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
