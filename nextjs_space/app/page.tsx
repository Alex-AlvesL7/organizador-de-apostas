import { Suspense } from 'react';
import Header from './components/header';
import FixturesList from './components/fixtures-list';
import LoadingSkeleton from './components/loading-skeleton';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/20 to-slate-100">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="text-center mb-12 mt-8">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
            Análise Inteligente de <span className="text-emerald-600">Apostas Esportivas</span>
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Recomendações baseadas em IA com estatísticas detalhadas, comparação de odds e análise de value bets
          </p>
        </div>

        {/* Fixtures List */}
        <Suspense fallback={<LoadingSkeleton />}>
          <FixturesList />
        </Suspense>
      </main>

      <footer className="bg-slate-900 text-slate-300 py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm">
            © 2026 Bet Analysis Pro. Análise profissional de apostas esportivas.
          </p>
          <p className="text-xs mt-2 text-slate-400">
            Aposte com responsabilidade. Este site é apenas para fins informativos.
          </p>
        </div>
      </footer>
    </div>
  );
}
