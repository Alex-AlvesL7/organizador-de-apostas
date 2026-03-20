'use client';

import { Trophy } from 'lucide-react';
import { signIn } from 'next-auth/react';

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-100 px-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl shadow-emerald-100/40">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-200">
            <Trophy className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Entrar no Colt</h1>
          <p className="mt-2 text-sm text-slate-600">
            Faça login com Google para salvar suas apostas e acompanhar os acertos do Colt.
          </p>
        </div>

        <button
          onClick={() => signIn('google', { callbackUrl: '/tracking' })}
          className="flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-emerald-200 hover:bg-emerald-50"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
            <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.4 14.6 2.5 12 2.5A9.5 9.5 0 0 0 2.5 12 9.5 9.5 0 0 0 12 21.5c5.5 0 9.1-3.9 9.1-9.3 0-.6-.1-1.1-.2-1.6H12Z" />
            <path fill="#34A853" d="M3.6 7.5l3.2 2.4A6 6 0 0 1 12 6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.4 14.6 2.5 12 2.5c-3.7 0-6.9 2.1-8.4 5Z" />
            <path fill="#4A90E2" d="M12 21.5c2.5 0 4.6-.8 6.1-2.2l-2.8-2.3c-.8.6-1.8 1-3.3 1-4 0-5.3-2.6-5.5-3.9l-3.1 2.4c1.4 2.9 4.4 5 8.6 5Z" />
            <path fill="#FBBC05" d="M3.6 16.5 6.7 14A6 6 0 0 1 6 12c0-.7.1-1.4.4-2.1L3.2 7.5A9.5 9.5 0 0 0 2.5 12c0 1.6.4 3.1 1.1 4.5Z" />
          </svg>
          Continuar com Google
        </button>
      </div>
    </div>
  );
}
