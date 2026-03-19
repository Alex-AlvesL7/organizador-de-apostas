'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Minus } from 'lucide-react';
import toast from 'react-hot-toast';

interface TeamFormProps {
  homeTeamId: number;
  awayTeamId: number;
  homeTeamName: string;
  awayTeamName: string;
  season?: number;
  leagueId?: number;
}

export default function TeamForm({
  homeTeamId,
  awayTeamId,
  homeTeamName,
  awayTeamName,
}: TeamFormProps) {
  const [homeForm, setHomeForm] = useState<any>(null);
  const [awayForm, setAwayForm] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchForm = async () => {
      try {
        setLoading(true);

        const [homeRes, awayRes] = await Promise.all([
          fetch(`/api/team-form?teamId=${homeTeamId}`),
          fetch(`/api/team-form?teamId=${awayTeamId}`),
        ]);

        if (homeRes.ok) {
          const homeData = await homeRes.json();
          setHomeForm(homeData?.form);
        }

        if (awayRes.ok) {
          const awayData = await awayRes.json();
          setAwayForm(awayData?.form);
        }
      } catch (error: any) {
        console.error('Error fetching team form:', error);
        toast.error('Erro ao carregar forma dos times.');
      } finally {
        setLoading(false);
      }
    };

    fetchForm();
  }, [homeTeamId, awayTeamId]);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block w-6 h-6 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-600 mt-4">Carregando forma dos times...</p>
      </div>
    );
  }

  const renderFormIndicator = (result: string) => {
    if (result === 'W') {
      return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
    } else if (result === 'L') {
      return <XCircle className="w-5 h-5 text-red-600" />;
    } else {
      return <Minus className="w-5 h-5 text-yellow-600" />;
    }
  };

  const getFormLabel = (result: string) => {
    if (result === 'W') return 'Vitória';
    if (result === 'L') return 'Derrota';
    return 'Empate';
  };

  const renderTeamForm = (form: any, teamName: string) => {
    if (!form) {
      return (
        <div className="text-center py-8">
          <p className="text-slate-600">Forma não disponível</p>
        </div>
      );
    }

    return (
      <div>
        <h4 className="font-semibold text-slate-900 mb-4">{teamName}</h4>
        
        {/* Form String */}
        <div className="flex items-center space-x-2 mb-4">
          <span className="text-sm text-slate-600">Forma:</span>
          <div className="flex space-x-1">
            {form?.form?.split('')?.map((result: string, index: number) => (
              <div
                key={index}
                className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm ${
                  result === 'W'
                    ? 'bg-emerald-100 text-emerald-700'
                    : result === 'L'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-yellow-100 text-yellow-700'
                }`}
              >
                {result}
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-sm text-slate-600 mb-1">Jogos</p>
            <p className="text-2xl font-bold text-slate-900">
              {form?.fixtures?.played?.total || 0}
            </p>
          </div>
          <div className="bg-emerald-50 rounded-lg p-4">
            <p className="text-sm text-slate-600 mb-1">Vitórias</p>
            <p className="text-2xl font-bold text-emerald-700">
              {form?.fixtures?.wins?.total || 0}
            </p>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4">
            <p className="text-sm text-slate-600 mb-1">Empates</p>
            <p className="text-2xl font-bold text-yellow-700">
              {form?.fixtures?.draws?.total || 0}
            </p>
          </div>
          <div className="bg-red-50 rounded-lg p-4">
            <p className="text-sm text-slate-600 mb-1">Derrotas</p>
            <p className="text-2xl font-bold text-red-700">
              {form?.fixtures?.loses?.total || 0}
            </p>
          </div>
        </div>

        {/* Goals */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-sm text-slate-600 mb-1">Gols marcados</p>
            <p className="text-xl font-bold text-slate-900">
              {form?.goals?.for?.total?.total || 0}
            </p>
            <p className="text-xs text-slate-500">
              Média: {(form?.goals?.for?.average?.total || 0)} por jogo
            </p>
          </div>
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-sm text-slate-600 mb-1">Gols sofridos</p>
            <p className="text-xl font-bold text-slate-900">
              {form?.goals?.against?.total?.total || 0}
            </p>
            <p className="text-xs text-slate-500">
              Média: {(form?.goals?.against?.average?.total || 0)} por jogo
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        {renderTeamForm(homeForm, homeTeamName)}
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        {renderTeamForm(awayForm, awayTeamName)}
      </div>
    </div>
  );
}
