'use client';

import Image from 'next/image';
import { Calendar, MapPin } from 'lucide-react';

interface H2HHistoryProps {
  h2h: any;
  fixture: any;
}

export default function H2HHistory({ h2h, fixture }: H2HHistoryProps) {
  if (!h2h || h2h?.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600">Histórico de confrontos não disponível.</p>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Calculate H2H stats
  const homeTeamId = fixture?.teams?.home?.id;
  const awayTeamId = fixture?.teams?.away?.id;

  let homeWins = 0;
  let awayWins = 0;
  let draws = 0;

  h2h?.forEach((match: any) => {
    const homeGoals = match?.goals?.home;
    const awayGoals = match?.goals?.away;
    const homeId = match?.teams?.home?.id;

    if (homeGoals === awayGoals) {
      draws++;
    } else if (homeGoals > awayGoals) {
      if (homeId === homeTeamId) homeWins++;
      else awayWins++;
    } else {
      if (homeId === awayTeamId) awayWins++;
      else homeWins++;
    }
  });

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          Resumo do Histórico (H2H)
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-emerald-600">{homeWins}</p>
            <p className="text-sm text-slate-600 mt-1">
              Vitórias {fixture?.teams?.home?.name}
            </p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-slate-600">{draws}</p>
            <p className="text-sm text-slate-600 mt-1">Empates</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-teal-600">{awayWins}</p>
            <p className="text-sm text-slate-600 mt-1">
              Vitórias {fixture?.teams?.away?.name}
            </p>
          </div>
        </div>
      </div>

      {/* Match History */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          Últimos Confrontos ({h2h?.length})
        </h3>
        <div className="space-y-3">
          {h2h?.map((match: any, index: number) => {
            const homeIsFixtureHome = match?.teams?.home?.id === homeTeamId;
            
            return (
              <div
                key={index}
                className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2 text-sm text-slate-600">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(match?.fixture?.date)}</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    {match?.league?.name}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 items-center">
                  {/* Home Team */}
                  <div className="flex items-center space-x-2">
                    <div className="relative w-6 h-6 flex-shrink-0">
                      <Image
                        src={match?.teams?.home?.logo || '/favicon.svg'}
                        alt={match?.teams?.home?.name || 'Home'}
                        fill
                        className="object-contain"
                        unoptimized
                      />
                    </div>
                    <span className="text-sm font-medium text-slate-900 truncate">
                      {match?.teams?.home?.name}
                    </span>
                  </div>

                  {/* Score */}
                  <div className="text-center">
                    <span className="text-xl font-bold text-slate-900">
                      {match?.goals?.home} - {match?.goals?.away}
                    </span>
                  </div>

                  {/* Away Team */}
                  <div className="flex items-center justify-end space-x-2">
                    <span className="text-sm font-medium text-slate-900 truncate">
                      {match?.teams?.away?.name}
                    </span>
                    <div className="relative w-6 h-6 flex-shrink-0">
                      <Image
                        src={match?.teams?.away?.logo || '/favicon.svg'}
                        alt={match?.teams?.away?.name || 'Away'}
                        fill
                        className="object-contain"
                        unoptimized
                      />
                    </div>
                  </div>
                </div>

                {match?.fixture?.venue?.name && (
                  <div className="flex items-center space-x-1 text-xs text-slate-500 mt-3">
                    <MapPin className="w-3 h-3" />
                    <span>{match?.fixture?.venue?.name}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
