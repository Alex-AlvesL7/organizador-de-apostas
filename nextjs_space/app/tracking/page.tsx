import { Suspense } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import TrackingDashboard from './tracking-dashboard';

export const dynamic = 'force-dynamic';

export default function TrackingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/20 to-slate-100">
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-emerald-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar aos jogos
          </Link>
          <h1 className="text-lg font-bold text-slate-800">Tracking do Colt</h1>
          <div className="w-24" />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <Suspense fallback={
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-emerald-500 border-t-transparent" />
          </div>
        }>
          <TrackingDashboard />
        </Suspense>
      </main>
    </div>
  );
}
