import { Suspense } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import RoomContent from './room-content';

export const dynamic = 'force-dynamic';

export default function RoomPage({ params }: { params: { matchId: string } }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900">
      <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href={`/fixture/${params.matchId}`}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-emerald-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar \u00e0 an\u00e1lise
          </Link>
          <h1 className="text-sm font-bold text-emerald-400 tracking-wider">\ud83d\udd12 SALA DO COLT</h1>
          <div className="w-24" />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <Suspense fallback={
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-emerald-500 border-t-transparent" />
          </div>
        }>
          <RoomContent matchId={params.matchId} />
        </Suspense>
      </main>
    </div>
  );
}
