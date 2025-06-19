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
import { useOfferLetterStore } from '@/store/offerLetterStore';

interface TextInputDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  toolPath: string;
}

export default function TextInputDialog({ open, setOpen, toolPath }: TextInputDialogProps) {
  const { offerText, setOfferText } = useOfferLetterStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const onAnalyze = async () => {
    if (!offerText.trim()) {
      setError('Kérjük adj meg egy szöveget az elemzéshez!');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const recordId = uuidv4();
      const formData = new FormData();
      formData.append('recordId', recordId);
      formData.append('textContent', offerText);
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
      <DialogContent>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
            <span className="text-lg font-semibold text-blue-700">Analízis folyamatban...</span>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Szöveg beillesztése</DialogTitle>
              <DialogDescription>
                <div className="mt-4">
                  <Textarea 
                    placeholder="Illessze be ide az elemzendő szöveget..."
                    className="min-h-[200px]"
                    value={offerText}
                    onChange={(e) => {
                      setOfferText(e.target.value);
                      setError('');
                    }}
                  />
                  {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
                </div>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Mégse</Button>
              <Button 
                disabled={!offerText.trim() || loading} 
                onClick={onAnalyze}
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Elemzés
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
