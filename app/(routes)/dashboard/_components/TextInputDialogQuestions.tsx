'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { useDemandStore } from '@/store/offerLetterStore';

interface TextInputDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  toolPath: string;
}

export default function TextInputDialogQuestions({ open, setOpen, toolPath }: TextInputDialogProps) {
  const { demandText, setDemandText } = useDemandStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  console.log('opened')

  const onAnalyze = async () => {
    if (!demandText.trim()) {
      setError('Kérjük adj meg egy szöveget az elemzéshez!');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const recordId = uuidv4();
      const formData = new FormData();
      formData.append('recordId', recordId);
      formData.append('textContent', demandText);
      formData.append('type', 'offer-letter');
      
      const result = await axios.post('/api/ai-demand-agent', formData);
      const { eventId } = result.data;
      console.log('Event queued:', eventId);

      let attempts = 0;
      const maxAttempts = 60;

      const poll = async () => {
        try {
          const res = await axios.get(`/api/ai-demand-agent/status?eventId=${eventId}`);
          const { status } = res.data;
          console.log('Status:', status);

          if (status === 'Completed') {
            setLoading(false);
            setOpen(false);
            // History will be created by the backend
            router.push(`${toolPath}/${recordId}`);
            return;
          }


          if (status === 'Cancelled' || attempts >= maxAttempts) {
            setLoading(false);
            alert("Az elemzés nem sikerült vagy túl sokáig tartott.");
            return;
          }

          attempts++;
          setTimeout(poll, 2000);
        } catch (err) {
          console.error('Error polling status:', err);
          setLoading(false);
          alert("Hiba történt az állapot lekérdezése során.");
        }
      };

      poll();
    } catch (err) {
      console.error('Error processing text:', err);
      setError('Hiba történt a feldolgozás során. Kérjük próbáld újra később.');
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[600px] h-[90vh] max-h-[800px] flex flex-col">
        {loading ? (
          <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
            <Loader2 className="w-16 h-16 text-blue-500 animate-spin mb-6" />
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Feldolgozás folyamatban</h3>
            <p className="text-gray-600 max-w-md">Az Ön kérése feldolgozás alatt áll, kérjük várjon...</p>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <DialogHeader className="px-1">
              <DialogTitle className="text-xl font-bold text-gray-900">Kérdések megválaszolása</DialogTitle>
              <DialogDescription className="text-gray-600">
                Válaszolja meg az ajánlatkérésre felmerült kérdéseket
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex-1 mt-4 overflow-hidden">
              <div className="h-full flex flex-col">
                <Textarea 
                  placeholder="Például: 50m²-es lakás felújítása, burkolással, festéssel és villanyszereléssel..."
                  className="flex-1 min-h-[200px] text-base p-4 resize-none"
                  value={demandText}
                  onChange={(e) => {
                    setDemandText(e.target.value);
                    setError('');
                  }}
                />
                {error && (
                  <div className="mt-2 px-4 py-2 bg-red-50 text-red-600 text-sm rounded-md">
                    {error}
                  </div>
                )}
                
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="text-sm text-gray-500 mb-3">Tippek:</div>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      <span>Minden fontos információt írjon le</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      <span>Adja meg a röviden a válaszokat</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      <span>Adja meg a határidőket és mértékegységeket</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            
            <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-4 mt-auto">
              <Button 
                variant="outline" 
                className="w-full h-14 text-base font-medium"
                onClick={() => setOpen(false)}
              >
                Mégse
              </Button>
              <Button 
                className="w-full h-14 text-base font-medium bg-[#FF9900] hover:bg-[#e68a00] text-white"
                disabled={!demandText.trim() || loading} 
                onClick={onAnalyze}
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Folyamatban...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5" />
                    Ajánlat frissítése
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
