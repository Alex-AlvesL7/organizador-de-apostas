'use client';

import { useState, useEffect } from 'react';
import { Clock, MapPin, Users, TrendingUp, BarChart3, History, Lightbulb, MessageSquare } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import toast from 'react-hot-toast';
import OddsComparison from './components/odds-comparison';
import TeamForm from './components/team-form';
import H2HHistory from './components/h2h-history';
import AIRecommendation from './components/ai-recommendation';
import Statistics from './components/statistics';

interface FixtureDetailsProps {
  fixtureId: string;
}

export default function FixtureDetails({ fixtureId }: FixtureDetailsProps) {
  const [fixture, setFixture] = useState<any>(null);
  const [odds, setOdds] = useState<any>(null);
  const [statistics, setStatistics] = useState<any>(null);
  const [h2h, setH2h] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('recommendation');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch fixture details
        const fixtureRes = await fetch(`/api/fixture/${fixtureId}`);
        if (!fixtureRes.ok) throw new Error('Failed to fetch fixture');
        const fixtureData = await fixtureRes.json();
        setFixture(fixtureData?.fixture);

        // Fetch odds
        const oddsRes = await fetch(`/api/odds/${fixtureId}`);
        if (oddsRes.ok) {
          const oddsData = await oddsRes.json();
          setOdds(oddsData?.odds);
        }

        // Fetch statistics
        const statsRes = await fetch(`/api/statistics/${fixtureId}`);
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStatistics(statsData?.statistics);
        }

        // Fetch H2H
        if (fixtureData?.fixture) {
          const homeId = fixtureData?.fixture?.teams?.home?.id;
          const awayId = fixtureData?.fixture?.teams?.away?.id;
          const h2hRes = await fetch(`/api/h2h?team1=${homeId}&team2=${awayId}`);
          if (h2hRes.ok) {
            const h2hData = await h2hRes.json();
            setH2h(h2hData?.h2h);
          }
        }
      } catch (error: any) {
        console.error('Error fetching data:', error);
        toast.error('Erro ao carregar dados do jogo.');
      } finally {
        setLoading(false);
      }
    };

    if (fixtureId) {
      fetchData();
    }
  }, [fixtureId]);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-600 mt-4">Carregando análise completa...</p>
      </div>
    );
  }

  if (!fixture) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600">Jogo não encontrado.</p>
      </div>
    );
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString('pt-BR', {
      dateStyle: 'full',
      timeStyle: 'short'
    });
  };

  const tabs = [
    { id: 'recommendation', label: 'Recomendação IA', icon: Lightbulb },
    { id: 'odds', label: 'Odds', icon: TrendingUp },
    { id: 'statistics', label: 'Estatísticas', icon: BarChart3 },
    { id: 'form', label: 'Forma Recente', icon: Users },
    { id: 'h2h', label: 'Histórico H2H', icon: History },
  ];

  return (
    <div className="space-y-6">
      {/* Match Header */}
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6">
          <div className="flex items-center justify-center space-x-4 mb-4">
            <div className="relative w-8 h-8">
              <Image
                src={fixture?.league?.logo || '/favicon.svg'}
                alt={fixture?.league?.name || 'League'}
                fill
                className="object-contain"
                unoptimized
              />
            </div>
            <h2 className="text-white font-semibold text-lg">
              {fixture?.league?.name} - {fixture?.league?.country}
            </h2>
          </div>
          <p className="text-white/90 text-center text-sm">{fixture?.league?.round}</p>
        </div>

        <div className="p-8">
          {/* Teams */}
          <div className="grid md:grid-cols-3 gap-6 items-center mb-6">
            {/* Home Team */}
            <div className="text-center">
              <div className="relative w-24 h-24 mx-auto mb-4">
                <Image
                  src={fixture?.teams?.home?.logo || '/favicon.svg'}
                  alt={fixture?.teams?.home?.name || 'Home'}
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
              <h3 className="text-xl font-bold text-slate-900">
                {fixture?.teams?.home?.name}
              </h3>
            </div>

            {/* Score/Time */}
            <div className="text-center">
              {fixture?.goals?.home !== null ? (
                <div className="text-5xl font-bold text-slate-900">
                  {fixture?.goals?.home} - {fixture?.goals?.away}
                </div>
              ) : (
                <div className="text-3xl font-bold text-emerald-600">VS</div>
              )}
              <p className="text-slate-600 mt-2">
                {fixture?.fixture?.status?.short === 'FT'
                  ? 'Finalizado'
                  : fixture?.fixture?.status?.short === 'LIVE'
                  ? `Ao vivo - ${fixture?.fixture?.status?.elapsed}'`
                  : formatTime(fixture?.fixture?.timestamp)}
              </p>
            </div>

            {/* Away Team */}
            <div className="text-center">
              <div className="relative w-24 h-24 mx-auto mb-4">
                <Image
                  src={fixture?.teams?.away?.logo || '/favicon.svg'}
                  alt={fixture?.teams?.away?.name || 'Away'}
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
              <h3 className="text-xl font-bold text-slate-900">
                {fixture?.teams?.away?.name}
              </h3>
            </div>
          </div>

          {/* Match Info */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-600 pt-6 border-t border-slate-200">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4" />
              <span>{formatTime(fixture?.fixture?.timestamp)}</span>
            </div>
            {fixture?.fixture?.venue?.name && (
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4" />
                <span>{fixture?.fixture?.venue?.name}</span>
              </div>
            )}
          </div>

          {/* Room CTA */}
          <div className="mt-6 text-center">
            <Link
              href={`/room/${fixtureId}`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-slate-800 to-emerald-800 text-white rounded-xl font-bold text-sm hover:from-slate-900 hover:to-emerald-900 transition-all shadow-lg hover:shadow-xl"
            >
              <MessageSquare className="w-5 h-5" />
              Abrir Sala do Colt para este jogo
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex overflow-x-auto border-b border-slate-200">
          {tabs?.map((tab: any) => {
            const Icon = tab?.icon;
            return (
              <button
                key={tab?.id}
                onClick={() => setActiveTab(tab?.id)}
                className={`flex items-center space-x-2 px-6 py-4 font-medium text-sm whitespace-nowrap transition-colors ${
                  activeTab === tab?.id
                    ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50/50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab?.label}</span>
              </button>
            );
          })}
        </div>

        <div className="p-6">
          {activeTab === 'recommendation' && (
            <AIRecommendation
              fixtureId={fixtureId}
              fixture={fixture}
              odds={odds}
              statistics={statistics}
              h2h={h2h}
            />
          )}
          {activeTab === 'odds' && <OddsComparison odds={odds} />}
          {activeTab === 'statistics' && (
            <Statistics statistics={statistics} fixture={fixture} />
          )}
          {activeTab === 'form' && (
            <TeamForm
              homeTeamId={fixture?.teams?.home?.id}
              awayTeamId={fixture?.teams?.away?.id}
              homeTeamName={fixture?.teams?.home?.name}
              awayTeamName={fixture?.teams?.away?.name}
              season={fixture?.league?.season}
              leagueId={fixture?.league?.id}
            />
          )}
          {activeTab === 'h2h' && <H2HHistory h2h={h2h} fixture={fixture} />}
        </div>
      </div>
    </div>
  );
}
