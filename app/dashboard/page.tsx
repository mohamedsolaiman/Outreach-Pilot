'use client';

import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { Plus, Target, Users, Play, Loader2, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { handleFirestoreError } from '@/lib/firestore-error';
import { toast } from 'sonner';

interface Campaign {
  id: string;
  title: string;
  niche: string;
  targetService: string;
  status: string;
  createdAt: any;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newNiche, setNewNiche] = useState('');
  const [newService, setNewService] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'campaigns'),
      where('ownerId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const camps: Campaign[] = [];
      snapshot.forEach((doc) => {
        camps.push({ id: doc.id, ...doc.data() } as Campaign);
      });
      // Sort in memory because Firestore requires index for complex orders
      camps.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setCampaigns(camps);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, 'list', 'campaigns', { currentUser: user });
    });

    return () => unsubscribe();
  }, [user]);

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newTitle || !newNiche || !newService) return;
    setIsCreating(true);

    try {
      const docRef = await addDoc(collection(db, 'campaigns'), {
        ownerId: user.uid,
        title: newTitle,
        niche: newNiche,
        targetService: newService,
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      toast.success('Campaign created!');
      setIsDialogOpen(false);
      setNewTitle('');
      setNewNiche('');
      setNewService('');
      router.push(`/dashboard/campaigns/${docRef.id}`);
    } catch (e) {
      toast.error('Failed to create campaign');
      console.error(e);
    } finally {
      setIsCreating(false);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Campaigns</h1>
          <p className="text-sm text-slate-500 mt-1">Targeting high-intent leads with AI precision.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger render={<Button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-md shadow-sm border-0" />}>
              <Plus className="h-4 w-4 mr-2" /> New Campaign
          </DialogTrigger>
          <DialogContent className="rounded-xl border border-slate-200 shadow-lg">
            <DialogHeader>
              <DialogTitle className="font-bold text-slate-900 text-lg">Create New Campaign</DialogTitle>
              <DialogDescription className="text-sm text-slate-500">Define your target niche and service pitch to start sourcing leads.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateCampaign} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Campaign Name</Label>
                <Input id="title" className="bg-slate-50 border-slate-300 rounded-md py-2 px-4 shadow-sm" placeholder="e.g. Dubai Restaurants Q3" value={newTitle} onChange={e => setNewTitle(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="niche" className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Target Niche</Label>
                <Input id="niche" className="bg-slate-50 border-slate-300 rounded-md py-2 px-4 shadow-sm" placeholder="e.g. Restaurants in Dubai Marina" value={newNiche} onChange={e => setNewNiche(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="service" className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Service Pitch</Label>
                <Input id="service" className="bg-slate-50 border-slate-300 rounded-md py-2 px-4 shadow-sm" placeholder="e.g. Web Development and SEO" value={newService} onChange={e => setNewService(e.target.value)} required />
              </div>
              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" className="border-slate-300 rounded-md" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isCreating} className="bg-blue-600 hover:bg-blue-700 rounded-md font-semibold text-white">
                  {isCreating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />} Get Started
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {campaigns.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-slate-200 shadow-sm border-dashed">
          <Target className="h-10 w-10 mx-auto text-slate-300 mb-4" />
          <h3 className="text-base font-bold text-slate-900">No campaigns yet</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1 mb-6">Create your first campaign to find leads and generate personalized pitches.</p>
          <Button onClick={() => setIsDialogOpen(true)} variant="outline" className="border-slate-300 rounded-md font-semibold text-slate-700">
            <Plus className="h-4 w-4 mr-2" /> Create Campaign
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map(campaign => (
            <Card key={campaign.id} className="cursor-pointer hover:-translate-y-1 hover:shadow-md transition-all bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm" onClick={() => router.push(`/dashboard/campaigns/${campaign.id}`)}>
              <CardHeader className="p-4 border-b border-slate-100 pb-3">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Campaign</div>
                <CardTitle className="truncate text-base font-bold text-slate-900">{campaign.title}</CardTitle>
                <CardDescription className="line-clamp-1 text-sm text-slate-500">{campaign.niche}</CardDescription>
              </CardHeader>
              <CardContent className="p-4 py-3">
                <div className="text-xs font-semibold text-slate-600 bg-slate-50 inline-flex items-center px-2 py-1 rounded border border-slate-200">
                  Pitch: <span className="ml-1 text-slate-900">{campaign.targetService}</span>
                </div>
              </CardContent>
              <CardFooter className="p-4 pt-3 flex justify-between items-center text-xs text-slate-500 border-t border-slate-100 bg-slate-50/50">
                <span className="capitalize font-medium">{campaign.status}</span>
                <span className="flex items-center text-blue-600 font-semibold">View Leads <ArrowRight className="h-3 w-3 ml-1" /></span>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
