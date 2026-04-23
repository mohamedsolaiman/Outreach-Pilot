'use client';

import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { PlaneTakeoff, LogOut, Loader2, LayoutDashboard, Target, Activity, Settings, BarChart2 } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] h-screen w-full overflow-hidden bg-slate-50 text-slate-900 font-sans">
      <aside className="bg-white border-r border-slate-200 p-6 flex-col hidden md:flex">
        <div className="font-extrabold text-[20px] mb-8 text-blue-600 flex items-center cursor-pointer" onClick={() => router.push('/dashboard')}>
           <PlaneTakeoff className="h-5 w-5 mr-2 stroke-[2.5]" />
           CLIENT<span className="text-slate-800">SCRIBE</span>
        </div>
        <nav className="flex flex-col gap-1">
          <div className={`flex items-center gap-3 p-3 rounded-lg font-medium text-sm cursor-pointer ${pathname === '/dashboard' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`} onClick={() => router.push('/dashboard')}>
            <LayoutDashboard className="h-4 w-4" /> Dashboard
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg text-slate-500 font-medium text-sm hover:text-slate-900 hover:bg-slate-50 cursor-not-allowed opacity-70">
            <Target className="h-4 w-4" /> Lead Finder
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg text-slate-500 font-medium text-sm hover:text-slate-900 hover:bg-slate-50 cursor-not-allowed opacity-70">
             <Activity className="h-4 w-4" /> Automation
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg text-slate-500 font-medium text-sm hover:text-slate-900 hover:bg-slate-50 cursor-not-allowed opacity-70">
            <BarChart2 className="h-4 w-4" /> Analytics
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg text-slate-500 font-medium text-sm hover:text-slate-900 hover:bg-slate-50 cursor-pointer overflow-hidden mt-auto mb-2" onClick={logOut}>
             <LogOut className="h-4 w-4" /> Log Out
          </div>
        </nav>
        <div className="mt-auto pt-5 border-t border-slate-100">
          <div className="text-xs text-slate-400 mb-2 font-bold uppercase tracking-wider">QUOTA USAGE</div>
          <div className="h-1 bg-slate-200 rounded-full my-2">
            <div className="w-[65%] h-full bg-blue-600 rounded-full"></div>
          </div>
          <div className="text-[11px] font-semibold text-slate-800">650 / 1000 Leads</div>
        </div>
      </aside>
      
      <main className="p-6 md:p-8 flex flex-col gap-6 overflow-y-auto w-full">
        <header className="flex justify-between items-center shrink-0">
          <div className="md:invisible flex items-center md:hidden h-0 overflow-hidden">
             {/* Mobile space */}
          </div>
          <div className="flex-1 md:hidden">
            <div className="font-extrabold text-lg text-blue-600 flex items-center" onClick={() => router.push('/dashboard')}>
               CLIENT<span className="text-slate-800">SCRIBE</span>
            </div>
          </div>
          <div className="flex gap-3 items-center ml-auto">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-semibold text-slate-900">{user.displayName || user.email?.split('@')[0] || "User"}</div>
              <div className="text-xs text-slate-500">Marketing Pro Plan</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold border border-slate-300">
              {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}
