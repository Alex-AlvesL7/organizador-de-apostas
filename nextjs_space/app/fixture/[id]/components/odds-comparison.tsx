'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface OddsComparisonProps {
  odds: any;
}

export default function OddsComparison({ odds }: OddsComparisonProps) {
  if (!odds || odds?.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600">Odds não disponíveis para este jogo.</p>
      </div>
    );
  }

  // Group odds by bookmaker
  const bookmakers = odds?.reduce((acc: any, odd: any) => {
    if (!acc[odd?.bookmaker]) {
      acc[odd?.bookmaker] = [];
    }
    acc[odd?.bookmaker].push(odd);
    return acc;
  }, {});

  // Get match winner odds
  const matchWinnerOdds = Object.entries(bookmakers)?.map(([bookmaker, oddsArr]: [string, any]) => {
    const matchWinner = oddsArr?.find((o: any) => o?.betType === 'Match Winner');
    return {
      bookmaker,
      home: matchWinner?.homeOdd,
      draw: matchWinner?.drawOdd,
      away: matchWinner?.awayOdd,
    };
  })?.filter((o: any) => o?.home || o?.draw || o?.away);

  // Calculate best odds
  const bestHome = Math.max(...matchWinnerOdds?.map((o: any) => o?.home || 0));
  const bestDraw = Math.max(...matchWinnerOdds?.map((o: any) => o?.draw || 0));
  const bestAway = Math.max(...matchWinnerOdds?.map((o: any) => o?.away || 0));

  const getBestOddStyle = (value: number, best: number) => {
    if (value === best) return 'bg-emerald-100 text-emerald-700 font-bold';
    return 'bg-slate-50 text-slate-700';
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          Comparação de Odds - Resultado Final
        </h3>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 font-semibold text-slate-700">Casa de Apostas</th>
                <th className="text-center py-3 px-4 font-semibold text-slate-700">Casa</th>
                <th className="text-center py-3 px-4 font-semibold text-slate-700">Empate</th>
                <th className="text-center py-3 px-4 font-semibold text-slate-700">Fora</th>
              </tr>
            </thead>
            <tbody>
              {matchWinnerOdds?.map((odd: any, index: number) => (
                <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4 font-medium text-slate-900">{odd?.bookmaker}</td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-block px-3 py-1 rounded-lg ${
                        getBestOddStyle(odd?.home, bestHome)
                      }`}
                    >
                      {odd?.home?.toFixed(2) || '-'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-block px-3 py-1 rounded-lg ${
                        getBestOddStyle(odd?.draw, bestDraw)
                      }`}
                    >
                      {odd?.draw?.toFixed(2) || '-'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-block px-3 py-1 rounded-lg ${
                        getBestOddStyle(odd?.away, bestAway)
                      }`}
                    >
                      {odd?.away?.toFixed(2) || '-'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-emerald-100 rounded"></div>
            <span className="text-slate-600">Melhor Odd</span>
          </div>
        </div>
      </div>

      {/* Implied Probabilities */}
      <div className="bg-slate-50 rounded-xl p-6">
        <h4 className="font-semibold text-slate-900 mb-4">Probabilidades Implícitas (Melhores Odds)</h4>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-sm text-slate-600 mb-1">Casa</p>
            <p className="text-2xl font-bold text-slate-900">
              {((1 / bestHome) * 100).toFixed(1)}%
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-slate-600 mb-1">Empate</p>
            <p className="text-2xl font-bold text-slate-900">
              {((1 / bestDraw) * 100).toFixed(1)}%
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-slate-600 mb-1">Fora</p>
            <p className="text-2xl font-bold text-slate-900">
              {((1 / bestAway) * 100).toFixed(1)}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
