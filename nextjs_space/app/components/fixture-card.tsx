'use client';

import { Clock, MapPin, TrendingUp } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface FixtureCardProps {
  fixture: any;
}

export default function FixtureCard({ fixture }: FixtureCardProps) {
  const router = useRouter();

  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      'NS': 'Não iniciado',
      '1H': '1º Tempo',
      'HT': 'Intervalo',
      '2H': '2º Tempo',
      'FT': 'Finalizado',
      'LIVE': 'Ao vivo'
    };
    return statusMap[status] || status;
  };

  return (
    <div
      onClick={() => router.push(`/fixture/${fixture?.fixture?.id}`)}
      className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border border-slate-200 cursor-pointer group overflow-hidden"
    >
      {/* League Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="relative w-5 h-5 flex-shrink-0">
              <Image
                src={fixture?.league?.logo || '/favicon.svg'}
                alt={fixture?.league?.name || 'League'}
                fill
                className="object-contain"
                unoptimized
              />
            </div>
            <span className="text-white text-xs font-medium truncate">
              {fixture?.league?.name}
            </span>
          </div>
          <span className="text-white/90 text-xs">
            {fixture?.league?.country}
          </span>
        </div>
      </div>

      {/* Match Info */}
      <div className="p-5">
        {/* Status & Time */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-1 text-sm text-slate-600">
            <Clock className="w-4 h-4" />
            <span>{formatTime(fixture?.fixture?.timestamp)}</span>
          </div>
          <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded">
            {getStatusLabel(fixture?.fixture?.status?.short)}
          </span>
        </div>

        {/* Teams */}
        <div className="space-y-3 mb-4">
          {/* Home Team */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 flex-1">
              <div className="relative w-8 h-8 flex-shrink-0">
                <Image
                  src={fixture?.teams?.home?.logo || '/favicon.svg'}
                  alt={fixture?.teams?.home?.name || 'Home'}
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
              <span className="font-semibold text-slate-900 text-sm truncate">
                {fixture?.teams?.home?.name}
              </span>
            </div>
            {fixture?.goals?.home !== null && (
              <span className="text-2xl font-bold text-slate-900 ml-2">
                {fixture?.goals?.home}
              </span>
            )}
          </div>

          {/* Away Team */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 flex-1">
              <div className="relative w-8 h-8 flex-shrink-0">
                <Image
                  src={fixture?.teams?.away?.logo || '/favicon.svg'}
                  alt={fixture?.teams?.away?.name || 'Away'}
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
              <span className="font-semibold text-slate-900 text-sm truncate">
                {fixture?.teams?.away?.name}
              </span>
            </div>
            {fixture?.goals?.away !== null && (
              <span className="text-2xl font-bold text-slate-900 ml-2">
                {fixture?.goals?.away}
              </span>
            )}
          </div>
        </div>

        {/* Venue */}
        {fixture?.fixture?.venue?.name && (
          <div className="flex items-center space-x-1 text-xs text-slate-500 mb-4">
            <MapPin className="w-3 h-3" />
            <span className="truncate">{fixture?.fixture?.venue?.name}</span>
          </div>
        )}

        {/* CTA */}
        <div className="pt-3 border-t border-slate-100">
          <div
            role="link"
            onClick={() => router.push(`/fixture/${fixture?.fixture?.id}`)}
            className="w-full flex items-center justify-center space-x-2 py-2 bg-emerald-50 text-emerald-700 rounded-lg font-medium text-sm group-hover:bg-emerald-600 group-hover:text-white transition-colors cursor-pointer"
          >
            <TrendingUp className="w-4 h-4" />
            <span>Ver Análise Completa</span>
          </div>
        </div>
      </div>
    </div>
  );
}
