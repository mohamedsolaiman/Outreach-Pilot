'use client';

import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { db } from '@/lib/firebase';
import { handleFirestoreError } from '@/lib/firestore-error';
import { GoogleGenAI, Type } from '@google/genai';
import { collection, doc, onSnapshot, query, where, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Flame, Target, Search, Loader2, Link as LinkIcon, Mail, Wand2, Copy, Check } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });

interface Lead {
  id: string;
  name: string;
  website?: string;
  email?: string;
  socials?: string;
  personalizedPitch?: string;
  status: string;
}

export default function CampaignDetailsPage() {
  const { id } = useParams() as { id: string };
  const { user } = useAuth();
  const router = useRouter();
  
  const [campaign, setCampaign] = useState<any>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [findingLeads, setFindingLeads] = useState(false);
  const [generatingPitch, setGeneratingPitch] = useState<string | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !id) return;

    const unsubCamp = onSnapshot(doc(db, 'campaigns', id), (docSnapshot) => {
      if (docSnapshot.exists() && docSnapshot.data().ownerId === user.uid) {
        setCampaign({ id: docSnapshot.id, ...docSnapshot.data() });
      } else {
        router.push('/dashboard');
      }
    }, (error) => handleFirestoreError(error, 'get', `campaigns/${id}`, { currentUser: user }));

    const q = query(collection(db, 'campaigns', id, 'leads'), where('ownerId', '==', user.uid));
    const unsubLeads = onSnapshot(q, (snapshot) => {
      const ls: Lead[] = [];
      snapshot.forEach(d => ls.push({ id: d.id, ...d.data() } as Lead));
      setLeads(ls);
      setLoading(false);
    }, (error) => handleFirestoreError(error, 'list', `campaigns/${id}/leads`, { currentUser: user }));

    return () => {
      unsubCamp();
      unsubLeads();
    };
  }, [user, id, router]);
  
  const selectedLead = leads.find(l => l.id === selectedLeadId) || leads[0];

  const handleFindLeads = async () => {
    if (!campaign || findingLeads || !user) return;
    setFindingLeads(true);
    try {
      const existingNames = leads.map(l => l.name).join(', ');
      
      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: `Find 5 potential business leads for the niche: "${campaign.niche}". We are pitching this service: "${campaign.targetService}".
${existingNames ? `Do not include these businesses we already found: ${existingNames}.` : ''}
Use Google Search if necessary to find their real official website and a potential contact email or social media link. Do not make up fake websites or fake emails.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING, description: "Official business name" },
                website: { type: Type.STRING, description: "URL to their official website" },
                email: { type: Type.STRING, description: "Contact email or leave blank if truly unknown" },
                socials: { type: Type.STRING, description: "Instagram or LinkedIn or Twitter link if found" }
              },
              required: ["name"]
            }
          },
          tools: [{ googleSearch: {} }],
          toolConfig: { includeServerSideToolInvocations: true }
        }
      });

      const jsonStr = response.text?.trim() || "[]";
      let newLeads: any[] = [];
      try {
        newLeads = JSON.parse(jsonStr);
      } catch(e) {
        console.error("Failed to parse Gemini output", jsonStr);
        throw new Error("Failed to parse Gemini results");
      }

      for (const ld of newLeads) {
        const cleanName = (ld.name || "Unknown").slice(0, 200);
        const cleanWeb = (ld.website || "").slice(0, 500);
        const cleanEmail = (ld.email || "").slice(0, 200);
        const cleanSocials = (ld.socials || "").slice(0, 500);

        try {
          await addDoc(collection(db, 'campaigns', id, 'leads'), {
            ownerId: user.uid,
            campaignId: id,
            name: cleanName,
            status: 'new',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            ...(cleanWeb ? { website: cleanWeb } : {}),
            ...(cleanEmail ? { email: cleanEmail } : {}),
            ...(cleanSocials ? { socials: cleanSocials } : {}),
          });
        } catch(err) {
          console.error("Failed adding lead", ld, err);
        }
      }
      toast.success(`Found ${newLeads.length} new leads!`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to find leads');
      console.error(error);
    } finally {
      setFindingLeads(false);
    }
  };

  const handleGeneratePitch = async (lead: Lead) => {
    if (generatingPitch || !user) return;
    setGeneratingPitch(lead.id);

    try {
      let websiteContent = "Website unavailable.";
      let fetchedEmails = lead.email ? [lead.email] : [];

      if (lead.website) {
        toast.info("Scraping website for context...");
        try {
          const apiRes = await fetch('/api/scrape', {
            method: 'POST',
            body: JSON.stringify({ url: lead.website })
          });
          const scrapeData = await apiRes.json();
          if (scrapeData.success && scrapeData.text) {
            websiteContent = scrapeData.text;
            if (scrapeData.emails?.length > 0 && !lead.email) {
               fetchedEmails = scrapeData.emails;
               toast.info(`Found internal emails: ${fetchedEmails.join(', ')}`);
            }
          }
        } catch (e) {
          console.warn("Could not scrape website", e);
        }
      }

      toast.info("Generating personalized pitch...");

      const prompt = `You are an expert SDR writing a cold email.
Target Business: ${lead.name}
Campaign Niche: ${campaign.niche}
Service Offered: ${campaign.targetService}
Website info: ${websiteContent.substring(0, 5000)}

Write a highly personalized, compelling, short cold outreach email to pitch our service. Look closely at the website info to find something specific to compliment or reference to prove we aren't a template. Keep it direct and professional. Return only the email body. NEVER surround the body with code blocks. Write it as plaintext.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: prompt
      });

      const pitch = (response.text || "Failed to generate pitch.").slice(0, 5000).replace(/```(\w+)?/g, '').trim();

      const updates: any = {
        personalizedPitch: pitch,
        updatedAt: serverTimestamp()
      };
      
      if (!lead.email && fetchedEmails.length > 0) {
        updates.email = fetchedEmails[0].slice(0, 200);
      }

      await updateDoc(doc(db, 'campaigns', id, 'leads', lead.id), updates);
      toast.success("Pitch generated!");
    } catch (e: any) {
      toast.error(e.message || "Failed to generate pitch");
    } finally {
      setGeneratingPitch(null);
    }
  };

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const handleCopyPitch = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success("Copied to clipboard!");
  };

  if (loading || !campaign) return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>;

  return (
    <div className="space-y-6 flex flex-col h-full">
      <header className="flex justify-between items-center bg-white p-5 rounded-xl border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
        <div>
          <h1 className="text-2xl font-bold m-0 text-slate-900">{campaign.title}</h1>
          <p className="text-[14px] text-slate-500 mt-1">Niche: <span className="font-semibold text-slate-700">{campaign.niche}</span> • Pitch: <span className="font-semibold text-slate-700">{campaign.targetService}</span></p>
        </div>
        <div className="flex gap-3">
          <Button 
            onClick={handleFindLeads} 
            disabled={findingLeads}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-md font-semibold text-[14px] border-none shadow-sm hover:bg-blue-700"
          >
            {findingLeads ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
            {findingLeads ? 'Searching...' : 'Search & Extract Leads'}
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6 flex-grow pb-8">
        
        {/* Left Panel: Queue */}
        <div className="bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden h-full min-h-[500px]">
          <div className="p-4 border-b border-slate-200 text-[12px] uppercase font-bold tracking-wider text-slate-500">
            Extraction Queue ({leads.length} Results Found)
          </div>
          <div className="overflow-y-auto w-full">
            <div className="grid grid-cols-[40px_1.5fr_1fr_1fr] p-4 border-b border-slate-100 font-semibold text-[13px] bg-slate-50/80 text-slate-700 items-center">
              <div>#</div>
              <div>Entity Name</div>
              <div>Contact Info</div>
              <div>AI Status</div>
            </div>
            {leads.length > 0 ? leads.map((lead, i) => (
              <div 
                key={lead.id} 
                className={`grid grid-cols-[40px_1.5fr_1fr_1fr] p-4 border-b border-slate-100 text-[13px] items-center cursor-pointer transition-colors ${selectedLeadId === lead.id ? 'bg-slate-100' : 'hover:bg-slate-50'}`}
                onClick={() => setSelectedLeadId(lead.id)}
              >
                <div className="font-mono text-[12px] text-slate-400">{(i + 1).toString().padStart(2, '0')}</div>
                <div className="font-medium text-slate-900 truncate pr-4">{lead.name}</div>
                <div className="font-mono text-[12px] text-slate-400 truncate pr-4">
                  {lead.email ? lead.email : (lead.website || <span className="opacity-50">Unknown</span>)}
                </div>
                <div>
                  <Badge variant={lead.personalizedPitch ? "default" : "secondary"} className={`font-semibold text-[11px] px-2 py-1 rounded-[4px] border-0 hover:bg-opacity-90 ${lead.personalizedPitch ? 'bg-[#dcfce7] text-[#166534]' : 'bg-slate-200 text-slate-700'}`}>
                    {lead.personalizedPitch ? 'Ready' : (generatingPitch === lead.id ? 'Scraping...' : lead.status)}
                  </Badge>
                </div>
              </div>
            )) : (
              <div className="flex flex-col items-center justify-center p-16 text-center h-48">
                <Target className="h-8 w-8 text-slate-300 mb-2" />
                <p className="text-slate-500 font-medium text-sm">No leads discovered yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Selected Draft */}
        <div className="bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden h-full min-h-[500px]">
          <div className="p-4 border-b border-slate-200 text-[12px] uppercase font-bold tracking-wider text-slate-500">
            Personalized Draft: {selectedLead?.name || 'Nothing selected'}
          </div>
          
          {selectedLead ? (
            <>
              <div className="p-4 border-b border-slate-100 text-[12px] text-slate-500">
                AI Target: <span className="text-blue-600 font-medium">{selectedLead.website || selectedLead.name}</span><br />
                Method: Deep specific website analysis and precise niche targeting.
              </div>
              <div className="flex-grow p-4 flex flex-col bg-slate-50">
                {selectedLead.personalizedPitch ? (
                  <div className="bg-slate-800 text-slate-50 p-5 rounded-lg text-[14px] leading-relaxed flex-grow font-serif italic shadow-inner whitespace-pre-wrap overflow-y-auto">
                    "{selectedLead.personalizedPitch}"
                  </div>
                ) : (
                  <div className="flex-grow flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-lg p-6 bg-white text-center">
                     <Wand2 className="h-8 w-8 text-slate-300 mb-2" />
                     <p className="text-slate-500 text-sm font-medium mb-4">No AI pitch generated for this lead yet.</p>
                     <Button 
                        onClick={() => handleGeneratePitch(selectedLead)}
                        disabled={generatingPitch === selectedLead.id}
                        className="bg-blue-600 text-white rounded-md font-semibold text-sm hover:bg-blue-700"
                      >
                       {generatingPitch === selectedLead.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
                       Generate Pitch Now
                     </Button>
                  </div>
                )}
              </div>
              {selectedLead.personalizedPitch && (
                <div className="p-4 flex gap-2 justify-end bg-white border-t border-slate-100">
                  <Button 
                    variant="ghost" 
                    className="bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-md font-semibold text-[13px] border-none px-4 py-2"
                    onClick={() => handleCopyPitch(selectedLead.id, selectedLead.personalizedPitch!)}
                  >
                    {copiedId === selectedLead.id ? <Check className="mr-2 h-4 w-4 text-green-600" /> : <Copy className="mr-2 h-4 w-4" />}
                    {copiedId === selectedLead.id ? 'Copied!' : 'Copy'}
                  </Button>
                  <Button 
                     onClick={() => handleGeneratePitch(selectedLead)}
                     disabled={generatingPitch === selectedLead.id}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-md font-semibold text-[13px] border-none px-5 py-2 flex items-center"
                  >
                     {generatingPitch === selectedLead.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />} 
                     {generatingPitch === selectedLead.id ? 'Regenerating' : 'Regenerate'}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center flex-grow p-8 text-center text-slate-500">
              Select a lead from the queue to view or generate their personalized pitch.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
