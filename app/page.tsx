'use client';

import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { ArrowRight, PlaneTakeoff, Search, Zap, Target } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const { user, signIn, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && !loading) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 overflow-hidden relative">
      {/* Background gradients */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-100/50 blur-3xl"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-100/50 blur-3xl"></div>
      </div>

      <div className="max-w-4xl w-full text-center space-y-8 mt-24">
        <div className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm text-blue-600 mb-4">
          <PlaneTakeoff className="mr-2 h-4 w-4" />
          <span className="font-semibold" style={{ letterSpacing: '0.05em' }}>OUTREACH PILOT</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-slate-900 leading-tight">
          Automate Leads.<br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Personalize Pitch.</span>
        </h1>
        
        <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Find businesses in your niche, discover their details, and let AI craft the perfect cold email to win them over instantly.
        </p>

        <div className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button size="lg" className="h-14 px-8 text-lg rounded-full w-full sm:w-auto" onClick={signIn}>
            Start Free Trial <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-24 pb-24 text-left">
          <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm transition-all hover:shadow-md">
            <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center mb-4 text-blue-600">
              <Search className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-lg text-slate-900 mb-2">Find Businesses</h3>
            <p className="text-slate-600 text-sm">Input any niche like "Dubai Restaurants" and our AI tracks down potential clients automatically.</p>
          </div>
          <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm transition-all hover:shadow-md">
            <div className="h-12 w-12 rounded-full bg-indigo-50 flex items-center justify-center mb-4 text-indigo-600">
              <Target className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-lg text-slate-900 mb-2">Extract Details</h3>
            <p className="text-slate-600 text-sm">We automatically pull the name, website, and attempt to fetch the best contact channels.</p>
          </div>
          <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm transition-all hover:shadow-md">
            <div className="h-12 w-12 rounded-full bg-purple-50 flex items-center justify-center mb-4 text-purple-600">
              <Zap className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-lg text-slate-900 mb-2">AI Personalization</h3>
            <p className="text-slate-600 text-sm">Generates killer, highly-specific cold messages tailored to each lead based on their exact profile.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
