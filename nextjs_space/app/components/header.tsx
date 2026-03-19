'use client';

import { Trophy, Target, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center space-x-3">
            <div className="bg-emerald-600 p-2 rounded-lg">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Colt de Apostas</h1>
              <p className="text-xs text-slate-500">Powered by AI</p>
            </div>
          </Link>

          <div className="flex items-center space-x-3">
            <Link
              href="/"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                pathname === '/'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Jogos</span>
            </Link>
            <Link
              href="/tracking"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                pathname === '/tracking'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Target className="w-4 h-4" />
              <span className="hidden sm:inline">Tracking</span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
