'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface StatisticsProps {
  statistics: any;
  fixture: any;
}

export default function Statistics({ statistics, fixture }: StatisticsProps) {
  if (!statistics || statistics?.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600">Estatísticas não disponíveis para este jogo.</p>
      </div>
    );
  }

  const homeStats = statistics?.[0];
  const awayStats = statistics?.[1];

  const statsToCompare = [
    { key: 'Shots on Goal', label: 'Finalizações no gol' },
    { key: 'Shots off Goal', label: 'Finalizações fora' },
    { key: 'Total Shots', label: 'Total de finalizações' },
    { key: 'Ball Possession', label: 'Posse de bola' },
    { key: 'Passes accurate', label: 'Passes certos' },
    { key: 'Fouls', label: 'Faltas' },
    { key: 'Yellow Cards', label: 'Cartões amarelos' },
    { key: 'Red Cards', label: 'Cartões vermelhos' },
    { key: 'Offsides', label: 'Impedimentos' },
    { key: 'Corner Kicks', label: 'Escanteios' },
  ];

  const findStat = (teamStats: any, key: string) => {
    const stat = teamStats?.statistics?.find((s: any) => s?.type === key);
    const value = stat?.value;
    
    if (value === null || value === undefined) return 0;
    
    // Handle percentage values
    if (typeof value === 'string' && value?.includes('%')) {
      return parseFloat(value.replace('%', ''));
    }
    
    return typeof value === 'number' ? value : parseFloat(value) || 0;
  };

  const chartData = statsToCompare?.map((stat: any) => ({
    name: stat?.label,
    [fixture?.teams?.home?.name]: findStat(homeStats, stat?.key),
    [fixture?.teams?.away?.name]: findStat(awayStats, stat?.key),
  }))?.filter((d: any) => d?.[fixture?.teams?.home?.name] > 0 || d?.[fixture?.teams?.away?.name] > 0);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          Comparação de Estatísticas
        </h3>

        {chartData?.length > 0 ? (
          <div className="bg-slate-50 rounded-xl p-6">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '11px'
                  }}
                />
                <Legend
                  verticalAlign="top"
                  wrapperStyle={{ fontSize: 11 }}
                />
                <Bar
                  dataKey={fixture?.teams?.home?.name}
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey={fixture?.teams?.away?.name}
                  fill="#14b8a6"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-center text-slate-600 py-12">
            Estatísticas detalhadas não disponíveis.
          </p>
        )}
      </div>

      {/* Detailed Stats Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="py-3 px-4 text-left font-semibold text-slate-700">
                {fixture?.teams?.home?.name}
              </th>
              <th className="py-3 px-4 text-center font-semibold text-slate-700">Estatística</th>
              <th className="py-3 px-4 text-right font-semibold text-slate-700">
                {fixture?.teams?.away?.name}
              </th>
            </tr>
          </thead>
          <tbody>
            {statsToCompare?.map((stat: any, index: number) => {
              const homeValue = findStat(homeStats, stat?.key);
              const awayValue = findStat(awayStats, stat?.key);
              
              if (homeValue === 0 && awayValue === 0) return null;
              
              return (
                <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4 text-left font-semibold text-slate-900">
                    {homeValue || '-'}
                  </td>
                  <td className="py-3 px-4 text-center text-sm text-slate-600">
                    {stat?.label}
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-slate-900">
                    {awayValue || '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
