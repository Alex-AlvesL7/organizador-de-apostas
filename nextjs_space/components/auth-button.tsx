'use client';

import { LogIn, LogOut, UserCircle2 } from 'lucide-react';
import { signIn, signOut, useSession } from 'next-auth/react';

export default function AuthButton() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="h-10 w-28 animate-pulse rounded-xl bg-slate-200" />
    );
  }

  if (!session?.user) {
    return (
      <button
        onClick={() => signIn('google')}
        className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 shadow-sm transition-all hover:bg-emerald-50"
      >
        <LogIn className="h-4 w-4" />
        Entrar
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm sm:flex">
        <UserCircle2 className="h-4 w-4 text-emerald-600" />
        <span className="max-w-36 truncate font-medium">{session.user.name || session.user.email}</span>
      </div>
      <button
        onClick={() => signOut({ callbackUrl: '/' })}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50"
      >
        <LogOut className="h-4 w-4" />
        Sair
      </button>
    </div>
  );
}
