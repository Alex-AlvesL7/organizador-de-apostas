'use client';

import { useState, useEffect, useMemo } from 'react';
import { Filter, Calendar, RefreshCw, Zap, CheckCircle2, Clock } from 'lucide-react';
import FixtureCard from './fixture-card';
import { MAJOR_LEAGUES } from '@/lib/api-football';
import toast from 'react-hot-toast';

interface Fixture {
  fixture: {
    id: number;
    date: string;
    timestamp: number;
    venue: { name: string | null };
    status: { short: string; elapsed: number | null };
  };
  league: {
    id: number;
    name: string;
    country: string;
    logo: string;
    flag: string;
    season: number;
    round: string;
  };
  teams: {
    home: { id: number; name: string; logo: string };
    away: { id: number; name: string; logo: string };
  };
  goals: {
    home: number | null;
    away: number | null;
  };
}

const FINISHED_STATUSES = ['FT', 'AET', 'PEN', 'WO', 'AWD', 'CANC', 'ABD'];
const LIVE_STATUSES = ['1H', '2H', 'HT', 'ET', 'BT', 'P', 'LIVE', 'INT'];

type TabId = 'upcoming' | 'finished';

export default function FixturesList() {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLeague, setSelectedLeague] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [todayStr, setTodayStr] = useState('');
  const [activeTab, setActiveTab] = useState<TabId>('upcoming');

  useEffect(() => {
    setTodayStr(new Date().toLocaleDateString('pt-BR', { dateStyle: 'full' }));
  }, []);

  const fetchFixtures = async () => {
    try {
      setLoading(true);
      // Use local date (not UTC) so timezone-shifted matches appear correctly
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const response = await fetch(`/api/fixtures?date=${today}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch fixtures');
      }

      const data = await response.json();
      setFixtures(data?.fixtures || []);
    } catch (error: any) {
      console.error('Error fetching fixtures:', error);
      toast.error('Erro ao carregar jogos. Tente novamente.');
      setFixtures([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFixtures();
  }, []);

  // Separate fixtures into categories
  const { upcomingFixtures, finishedFixtures } = useMemo(() => {
    let filtered = fixtures;
    if (selectedLeague) {
      filtered = fixtures.filter((f) => f?.league?.id === selectedLeague);
    }

    const finished: Fixture[] = [];
    const upcoming: Fixture[] = [];

    for (const f of filtered) {
      const status = f?.fixture?.status?.short;
      if (FINISHED_STATUSES.includes(status)) {
        finished.push(f);
      } else {
        upcoming.push(f);
      }
    }

    // Sort upcoming: live first, then by timestamp
    upcoming.sort((a, b) => {
      const aLive = LIVE_STATUSES.includes(a?.fixture?.status?.short);
      const bLive = LIVE_STATUSES.includes(b?.fixture?.status?.short);
      if (aLive && !bLive) return -1;
      if (!aLive && bLive) return 1;
      return (a?.fixture?.timestamp || 0) - (b?.fixture?.timestamp || 0);
    });

    // Sort finished: most recent first
    finished.sort((a, b) => (b?.fixture?.timestamp || 0) - (a?.fixture?.timestamp || 0));

    // Prioritize major leagues within each group
    const sortByMajorLeague = (arr: Fixture[]) => {
      const major = arr.filter((f) => MAJOR_LEAGUES.some((l) => l.id === f?.league?.id));
      const other = arr.filter((f) => !MAJOR_LEAGUES.some((l) => l.id === f?.league?.id));
      return [...major, ...other];
    };

    return {
      upcomingFixtures: selectedLeague ? upcoming : sortByMajorLeague(upcoming),
      finishedFixtures: selectedLeague ? finished : sortByMajorLeague(finished),
    };
  }, [fixtures, selectedLeague]);

  if (loading) {
    return (
      <div className="text-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-600" />
        <p className="text-slate-600 mt-4">Carregando jogos de hoje...</p>
      </div>
    );
  }

  const currentFixtures = activeTab === 'upcoming' ? upcomingFixtures : finishedFixtures;

  return (
    <div>
      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all ${
            activeTab === 'upcoming'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Ao Vivo & Próximos</span>
          {upcomingFixtures.length > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              activeTab === 'upcoming' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'
            }`}>
              {upcomingFixtures.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('finished')}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all ${
            activeTab === 'finished'
              ? 'bg-slate-700 text-white shadow-lg shadow-slate-200'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Finalizados</span>
          {finishedFixtures.length > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              activeTab === 'finished' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              {finishedFixtures.length}
            </span>
          )}
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 bg-white rounded-xl shadow-sm p-4 border border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-slate-600" />
            <h2 className="text-lg font-semibold text-slate-900">Filtros</h2>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
          >
            {showFilters ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>

        {showFilters && (
          <div className="space-y-3 mt-4">
            <div className="flex items-center space-x-2 text-sm text-slate-600">
              <Calendar className="w-4 h-4" />
              <span>Data: {todayStr}</span>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedLeague(null)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedLeague === null
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Todas as Ligas
              </button>
              {MAJOR_LEAGUES?.map((league: any) => (
                <button
                  key={league?.id}
                  onClick={() => setSelectedLeague(league?.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedLeague === league?.id
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {league?.flag} {league?.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Fixtures Grid */}
      {currentFixtures.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-slate-200">
          {activeTab === 'upcoming' ? (
            <>
              <Clock className="w-12 h-12 mx-auto text-slate-400 mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Nenhum jogo ao vivo ou próximo
              </h3>
              <p className="text-slate-600">
                {selectedLeague
                  ? 'Todos os jogos desta liga já foram finalizados hoje.'
                  : 'Todos os jogos de hoje já foram finalizados.'}
              </p>
              {finishedFixtures.length > 0 && (
                <button
                  onClick={() => setActiveTab('finished')}
                  className="mt-4 px-5 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium text-sm hover:bg-slate-200 transition-colors"
                >
                  Ver jogos finalizados ({finishedFixtures.length})
                </button>
              )}
            </>
          ) : (
            <>
              <CheckCircle2 className="w-12 h-12 mx-auto text-slate-400 mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Nenhum jogo finalizado
              </h3>
              <p className="text-slate-600">
                {selectedLeague
                  ? 'Ainda não há jogos finalizados para esta liga hoje.'
                  : 'Ainda não há jogos finalizados hoje.'}
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {currentFixtures.map((fixture: Fixture) => (
            <FixtureCard key={fixture?.fixture?.id} fixture={fixture} />
          ))}
        </div>
      )}
    </div>
  );
}
