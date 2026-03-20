'use client';

import { useState, useEffect } from 'react';
import {
  Trophy, Target, TrendingUp, TrendingDown, AlertTriangle, Clock,
  CheckCircle, XCircle, Minus, BarChart3, Bell, User, RefreshCw,
  ChevronDown, ChevronUp, Zap, Shield, Flame, Eye, EyeOff, LogIn
} from 'lucide-react';
import { signIn, useSession } from 'next-auth/react';
import toast, { Toaster } from 'react-hot-toast';

interface PickStats {
  total: number;
  pending: number;
  settled: number;
  wins: number;
  losses: number;
  pushes: number;
  winRate: number;
  totalProfitUnits: number;
}

interface ColtPick {
  id: string;
  matchId: string;
  createdAt: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  kickoff: string;
  marketType: string;
  selection: string;
  recommendedOddsMin: number;
  currentOddsAtPick: number | null;
  bookmaker: string | null;
  stakeUnits: number;
  riskLevel: string;
  confidence: number;
  reasoning: string;
  status: string;
  result: {
    id: string;
    result: string;
    finalOdds: number | null;
    profitUnits: number;
    settledAt: string;
  } | null;
}

interface Alert {
  id: string;
  matchId: string;
  createdAt: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  kickoff: string;
  marketType: string;
  selection: string;
  currentOdds: number;
  bookmaker: string;
  fairOdds: number;
  edgePercent: number;
  confidence: number;
  riskLevel: string;
  status: string;
}

export default function TrackingDashboard() {
  const { status: sessionStatus } = useSession();
  const [activeTab, setActiveTab] = useState<'picks' | 'alerts' | 'profile'>('picks');
  const [picks, setPicks] = useState<ColtPick[]>([]);
  const [stats, setStats] = useState<PickStats | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [expandedPick, setExpandedPick] = useState<string | null>(null);
  const [settlingPick, setSettlingPick] = useState<string | null>(null);
  const [scanningAlerts, setScanningAlerts] = useState(false);
  const [autoSettling, setAutoSettling] = useState(false);

  useEffect(() => {
    fetchAlerts();
  }, []);

  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      fetchPicks();
      return;
    }

    if (sessionStatus === 'unauthenticated') {
      setPicks([]);
      setStats(null);
      setLoading(false);
    }
  }, [filterStatus, sessionStatus]);

  async function fetchPicks() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set('status', filterStatus);
      const res = await fetch(`/api/user-picks?${params.toString()}`);
      if (res.status === 401) {
        setPicks([]);
        setStats(null);
        return;
      }
      const data = await res.json();
      setPicks(data.picks || []);
      setStats(data.stats || null);
    } catch (err) {
      console.error('Error fetching picks:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchAlerts() {
    try {
      const res = await fetch('/api/alerts?status=ACTIVE');
      const data = await res.json();
      setAlerts(data.alerts || []);
    } catch (err) {
      console.error('Error fetching alerts:', err);
    }
  }

  async function handleSettle(pickId: string, result: string) {
    setSettlingPick(pickId);
    try {
      const res = await fetch('/api/colt-picks/settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pickId, result }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Pick resolvida: ${result}`);
        fetchPicks();
      } else {
        toast.error(data.error || 'Erro ao resolver pick');
      }
    } catch (err) {
      toast.error('Erro ao resolver pick');
    } finally {
      setSettlingPick(null);
    }
  }

  async function handleAutoSettle() {
    setAutoSettling(true);
    try {
      const res = await fetch('/api/colt-picks/settle', { method: 'PUT' });
      const data = await res.json();
      if (data.settled > 0) {
        toast.success(`${data.settled} pick(s) resolvida(s) automaticamente!`);
        fetchPicks();
      } else {
        toast.success('Nenhuma pick pendente para resolver');
      }
    } catch (err) {
      toast.error('Erro no auto-settlement');
    } finally {
      setAutoSettling(false);
    }
  }

  async function handleScanAlerts() {
    setScanningAlerts(true);
    try {
      const res = await fetch('/api/alerts/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minEdge: 5 }),
      });
      const data = await res.json();
      if (data.alertsCreated > 0) {
        toast.success(`${data.alertsCreated} alerta(s) de valor encontrado(s)!`);
        fetchAlerts();
      } else {
        toast.success('Nenhum value bet encontrado no momento');
      }
    } catch (err) {
      toast.error('Erro ao escanear alertas');
    } finally {
      setScanningAlerts(false);
    }
  }

  async function handleDismissAlert(alertId: string) {
    try {
      await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId, action: 'DISMISS' }),
      });
      setAlerts(prev => prev.filter(a => a.id !== alertId));
      toast.success('Alerta descartado');
    } catch (err) {
      toast.error('Erro ao descartar alerta');
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  }

  const getRiskBadge = (risk: string) => {
    const colors: Record<string, string> = {
      LOW: 'bg-green-100 text-green-700 border-green-200',
      MEDIUM: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      HIGH: 'bg-red-100 text-red-700 border-red-200',
    };
    const labels: Record<string, string> = { LOW: 'Baixo', MEDIUM: 'M\u00e9dio', HIGH: 'Alto' };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${colors[risk] || colors.MEDIUM}`}>
        {labels[risk] || risk}
      </span>
    );
  };

  const getResultBadge = (result: string) => {
    const config: Record<string, { color: string; icon: any; label: string }> = {
      WIN: { color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle, label: 'WIN' },
      LOSS: { color: 'bg-red-100 text-red-700', icon: XCircle, label: 'LOSS' },
      PUSH: { color: 'bg-slate-100 text-slate-600', icon: Minus, label: 'PUSH' },
      VOID: { color: 'bg-slate-100 text-slate-500', icon: Minus, label: 'VOID' },
    };
    const c = config[result] || config.VOID;
    const Icon = c.icon;
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${c.color}`}>
        <Icon className="w-3.5 h-3.5" /> {c.label}
      </span>
    );
  };

  return (
    <div>
      <Toaster position="top-right" />

      {/* Stats Cards */}
      {sessionStatus === 'authenticated' && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
              <Target className="w-4 h-4" /> Total Picks
            </div>
            <div className="text-2xl font-bold text-slate-800">{stats.total}</div>
            <div className="text-xs text-slate-400">{stats.pending} pendente(s)</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 text-emerald-600 text-sm mb-1">
              <Trophy className="w-4 h-4" /> Win Rate
            </div>
            <div className="text-2xl font-bold text-emerald-600">{stats.winRate}%</div>
            <div className="text-xs text-slate-400">{stats.wins}W / {stats.losses}L / {stats.pushes}P</div>
          </div>
          <div className={`bg-white rounded-xl p-4 shadow-sm border ${stats.totalProfitUnits >= 0 ? 'border-emerald-100' : 'border-red-100'}`}>
            <div className={`flex items-center gap-2 text-sm mb-1 ${stats.totalProfitUnits >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {stats.totalProfitUnits >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              Lucro (unidades)
            </div>
            <div className={`text-2xl font-bold ${stats.totalProfitUnits >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {stats.totalProfitUnits >= 0 ? '+' : ''}{stats.totalProfitUnits.toFixed(2)}
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 text-amber-600 text-sm mb-1">
              <Bell className="w-4 h-4" /> Alertas Ativos
            </div>
            <div className="text-2xl font-bold text-amber-600">{alerts.length}</div>
            <div className="text-xs text-slate-400">value bets detectadas</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-white rounded-xl p-1 shadow-sm border border-slate-100">
        {[
          { key: 'picks' as const, label: 'Picks do Colt', icon: Target },
          { key: 'alerts' as const, label: 'Alertas de Valor', icon: Bell },
          { key: 'profile' as const, label: 'Perfil', icon: User },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === tab.key
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* PICKS TAB */}
      {activeTab === 'picks' && (
        <div>
          {sessionStatus === 'unauthenticated' ? (
            <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-slate-100">
              <LogIn className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-900 mb-2">Entre para salvar suas apostas</h3>
              <p className="text-slate-600 max-w-md mx-auto mb-5">
                Faça login com Google para manter seu histórico de picks e acompanhar os acertos e erros do Colt na sua conta.
              </p>
              <button
                onClick={() => signIn('google', { callbackUrl: '/tracking' })}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition-all hover:bg-emerald-700"
              >
                <LogIn className="w-4 h-4" />
                Entrar com Google
              </button>
            </div>
          ) : (
            <>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white text-slate-700"
            >
              <option value="">Todas as picks</option>
              <option value="PENDING">Pendentes</option>
              <option value="SETTLED">Resolvidas</option>
              <option value="CANCELLED">Canceladas</option>
            </select>

            <button
              onClick={handleAutoSettle}
              disabled={autoSettling}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${autoSettling ? 'animate-spin' : ''}`} />
              {autoSettling ? 'Resolvendo...' : 'Auto-Resolver'}
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-emerald-500 border-t-transparent" />
            </div>
          ) : picks.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-slate-100">
              <Target className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">Nenhuma pick encontrada</p>
              <p className="text-slate-400 text-sm mt-1">As picks ser\u00e3o registradas automaticamente quando o Colt analisar um jogo.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {picks.map((pick) => (
                <div
                  key={pick.id}
                  className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div
                    className="p-4 cursor-pointer"
                    onClick={() => setExpandedPick(expandedPick === pick.id ? null : pick.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                            {pick.league}
                          </span>
                          <span className="text-xs text-slate-400">{formatDate(pick.kickoff)}</span>
                          {getRiskBadge(pick.riskLevel)}
                        </div>
                        <div className="font-bold text-slate-800 text-sm">
                          {pick.homeTeam} vs {pick.awayTeam}
                        </div>
                        <div className="text-sm text-slate-600 mt-1">
                          <span className="font-semibold text-emerald-700">{pick.selection}</span>
                          <span className="text-slate-400 mx-2">|</span>
                          <span>Odd m\u00edn: {pick.recommendedOddsMin}</span>
                          {pick.currentOddsAtPick && (
                            <><span className="text-slate-400 mx-2">|</span><span>Odd real: {pick.currentOddsAtPick}</span></>
                          )}
                          <span className="text-slate-400 mx-2">|</span>
                          <span>Stake: {pick.stakeUnits}u</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {pick.status === 'SETTLED' && pick.result ? (
                          <div className="flex flex-col items-end gap-1">
                            {getResultBadge(pick.result.result)}
                            <span className={`text-sm font-bold ${pick.result.profitUnits >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                              {pick.result.profitUnits >= 0 ? '+' : ''}{pick.result.profitUnits.toFixed(2)}u
                            </span>
                          </div>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> {pick.status}
                          </span>
                        )}
                        {expandedPick === pick.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </div>
                    </div>
                  </div>

                  {expandedPick === pick.id && (
                    <div className="border-t border-slate-100 px-4 py-3 bg-slate-50">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
                        <div>
                          <span className="text-slate-400 text-xs">Mercado</span>
                          <div className="font-semibold text-slate-700">{pick.marketType}</div>
                        </div>
                        <div>
                          <span className="text-slate-400 text-xs">Confian\u00e7a</span>
                          <div className="font-semibold text-slate-700">{pick.confidence}%</div>
                        </div>
                        <div>
                          <span className="text-slate-400 text-xs">Casa</span>
                          <div className="font-semibold text-slate-700">{pick.bookmaker || 'N/A'}</div>
                        </div>
                        <div>
                          <span className="text-slate-400 text-xs">Criada em</span>
                          <div className="font-semibold text-slate-700">{formatDate(pick.createdAt)}</div>
                        </div>
                      </div>
                      <div className="text-sm text-slate-600 bg-white rounded-lg p-3 border border-slate-100">
                        <span className="text-xs font-semibold text-slate-400 uppercase">Racioc\u00ednio</span>
                        <p className="mt-1">{pick.reasoning}</p>
                      </div>

                      {pick.status === 'PENDING' && (
                        <div className="flex items-center gap-2 mt-3">
                          <span className="text-xs text-slate-400 mr-2">Resolver manualmente:</span>
                          {['WIN', 'LOSS', 'PUSH', 'VOID'].map(r => (
                            <button
                              key={r}
                              onClick={(e) => { e.stopPropagation(); handleSettle(pick.id, r); }}
                              disabled={settlingPick === pick.id}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 ${
                                r === 'WIN' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                  : r === 'LOSS' ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              {r}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
            </>
          )}
        </div>
      )}

      {/* ALERTS TAB */}
      {activeTab === 'alerts' && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={handleScanAlerts}
              disabled={scanningAlerts}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-semibold hover:bg-amber-600 disabled:opacity-50 transition-all"
            >
              <Zap className={`w-4 h-4 ${scanningAlerts ? 'animate-pulse' : ''}`} />
              {scanningAlerts ? 'Escaneando...' : 'Escanear Value Bets'}
            </button>
          </div>

          {alerts.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-slate-100">
              <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">Nenhum alerta ativo</p>
              <p className="text-slate-400 text-sm mt-1">Clique em &quot;Escanear Value Bets&quot; para detectar oportunidades.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div key={alert.id} className="bg-white rounded-xl shadow-sm border border-amber-100 p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                          {alert.league}
                        </span>
                        <span className="text-xs text-slate-400">{formatDate(alert.kickoff)}</span>
                        {getRiskBadge(alert.riskLevel)}
                      </div>
                      <div className="font-bold text-slate-800 text-sm">
                        {alert.homeTeam} vs {alert.awayTeam}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5">
                          <span className="text-xs text-slate-500">Sele\u00e7\u00e3o: </span>
                          <span className="font-bold text-emerald-700 text-sm">{alert.selection}</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-slate-400">Odd atual: </span>
                          <span className="font-bold text-slate-700">{alert.currentOdds}</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-slate-400">Odd justa: </span>
                          <span className="font-bold text-slate-700">{alert.fairOdds}</span>
                        </div>
                        <div className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          alert.edgePercent >= 10 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          Edge: +{alert.edgePercent}%
                        </div>
                        <div className="text-xs text-slate-400">
                          {alert.bookmaker}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDismissAlert(alert.id)}
                      className="text-slate-400 hover:text-red-500 transition-colors ml-2"
                      title="Descartar alerta"
                    >
                      <EyeOff className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PROFILE TAB */}
      {activeTab === 'profile' && <UserProfileTab />}
    </div>
  );
}

// ============================================================
// USER PROFILE TAB
// ============================================================
function UserProfileTab() {
  const { status: sessionStatus } = useSession();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [bankroll, setBankroll] = useState('');
  const [riskProfile, setRiskProfile] = useState('MODERATE');
  const [minOdds, setMinOdds] = useState('');
  const [maxOdds, setMaxOdds] = useState('');
  const [maxPicks, setMaxPicks] = useState('');
  const [favoriteLeagues, setFavoriteLeagues] = useState<string[]>([]);
  const [preferredMarkets, setPreferredMarkets] = useState<string[]>([]);

  const leagues = [
    'BRA_SERIE_A', 'ENG_PREMIER_LEAGUE', 'ESP_LA_LIGA',
    'GER_BUNDESLIGA', 'ITA_SERIE_A', 'FRA_LIGUE_1', 'UEFA_CHAMPIONS_LEAGUE'
  ];
  const markets = ['1X2', 'OVER_UNDER', 'BTTS', 'HANDICAP'];

  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      fetchProfile();
      return;
    }

    if (sessionStatus === 'unauthenticated') {
      setLoading(false);
    }
  }, [sessionStatus]);

  async function fetchProfile() {
    try {
      const res = await fetch('/api/user-profile');
      const data = await res.json();
      if (data.profile) {
        setProfile(data.profile);
        setBankroll(data.profile.bankrollEstimate?.toString() || '');
        setRiskProfile(data.profile.riskProfile || 'MODERATE');
        setMinOdds(data.profile.minOdds?.toString() || '');
        setMaxOdds(data.profile.maxOdds?.toString() || '');
        setMaxPicks(data.profile.maxPicksPerDay?.toString() || '');
        setFavoriteLeagues(data.profile.favoriteLeagues || []);
        setPreferredMarkets(data.profile.preferredMarkets || []);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/user-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankrollEstimate: bankroll ? parseFloat(bankroll) : null,
          riskProfile,
          minOdds: minOdds ? parseFloat(minOdds) : null,
          maxOdds: maxOdds ? parseFloat(maxOdds) : null,
          maxPicksPerDay: maxPicks ? parseInt(maxPicks) : null,
          favoriteLeagues,
          preferredMarkets,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Perfil atualizado!');
      }
    } catch (err) {
      toast.error('Erro ao salvar perfil');
    } finally {
      setSaving(false);
    }
  }

  function toggleItem(arr: string[], setArr: (v: string[]) => void, item: string) {
    setArr(arr.includes(item) ? arr.filter(a => a !== item) : [...arr, item]);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (sessionStatus === 'unauthenticated') {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-10 text-center">
        <User className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-slate-900 mb-2">Entre para salvar seu perfil</h3>
        <p className="text-slate-600 mb-5">
          Seu perfil de banca e preferências ficará salvo na sua conta Google.
        </p>
        <button
          onClick={() => signIn('google', { callbackUrl: '/tracking' })}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition-all hover:bg-emerald-700"
        >
          <LogIn className="w-4 h-4" />
          Entrar com Google
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
      <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6">
        <User className="w-5 h-5 text-emerald-600" />
        Perfil do Apostador
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-1">Banca estimada (R$)</label>
          <input
            type="number"
            value={bankroll}
            onChange={(e) => setBankroll(e.target.value)}
            placeholder="Ex: 1000.00"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-1">Perfil de risco</label>
          <select
            value={riskProfile}
            onChange={(e) => setRiskProfile(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="CONSERVATIVE">Conservador</option>
            <option value="MODERATE">Moderado</option>
            <option value="AGGRESSIVE">Agressivo</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-1">Odd m\u00ednima</label>
          <input
            type="number"
            step="0.01"
            value={minOdds}
            onChange={(e) => setMinOdds(e.target.value)}
            placeholder="Ex: 1.50"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-1">Odd m\u00e1xima</label>
          <input
            type="number"
            step="0.01"
            value={maxOdds}
            onChange={(e) => setMaxOdds(e.target.value)}
            placeholder="Ex: 5.00"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-1">M\u00e1x. picks por dia</label>
          <input
            type="number"
            value={maxPicks}
            onChange={(e) => setMaxPicks(e.target.value)}
            placeholder="Ex: 5"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      <div className="mt-6">
        <label className="block text-sm font-semibold text-slate-600 mb-2">Ligas favoritas</label>
        <div className="flex flex-wrap gap-2">
          {leagues.map(league => (
            <button
              key={league}
              onClick={() => toggleItem(favoriteLeagues, setFavoriteLeagues, league)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                favoriteLeagues.includes(league)
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'
              }`}
            >
              {league.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <label className="block text-sm font-semibold text-slate-600 mb-2">Mercados preferidos</label>
        <div className="flex flex-wrap gap-2">
          {markets.map(market => (
            <button
              key={market}
              onClick={() => toggleItem(preferredMarkets, setPreferredMarkets, market)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                preferredMarkets.includes(market)
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'
              }`}
            >
              {market.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 transition-all"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
          {saving ? 'Salvando...' : 'Salvar Perfil'}
        </button>
      </div>
    </div>
  );
}
