import React, { useEffect, useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { File, Loader2Icon, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { useRouter } from 'next/navigation';


interface DemandUploadDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

function DemandUploadDialog({ open, setOpen }: DemandUploadDialogProps) {

    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
   
    useEffect(() => {
        setFile(null)
    }, [open])

    console.log(open, 'open')

    const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv', 'application/vnd.ms-excel'];
            if (!validTypes.includes(file.type)) {
                alert('Kérjük csak PDF, DOCX, XLSX vagy CSV fájlokat töltsön fel!');
                return;
            }
            console.log(file.name, file.type);
            setFile(file);
        }
    }

    const onUploadAndAnalyze = async () => {
        setLoading(true);
        const recordId = uuidv4();
        const formData = new FormData();
        formData.append('recordId', recordId);
        if (file) {
          formData.append('demandFile', file);
        }
      
        try {
          const result = await axios.post('/api/ai-demand-agent', formData);
          const { eventId } = result.data;
          console.log('Event queued:', eventId);
      
          let attempts = 0;
          const maxAttempts = 60;
      
          const poll = async () => {
            const res = await axios.get(`/api/ai-demand-agent/status?eventId=${eventId}`);
            const { status } = res.data;
      
            console.log('Status:', status);
      
            if (status === 'Completed') {
              setLoading(false);
              setOpen(false);
              router.push(`/ai-tools/ai-demand-analyzer/${recordId}`);
              return;
            }
      
            if (status === 'Cancelled' || attempts >= maxAttempts) {
              setLoading(false);
              alert("Az elemzés nem sikerült vagy túl sokáig tartott.");
              return;
            }
      
            attempts++;
            setTimeout(poll, 2000);
          };
      
          poll();
        } catch (err) {
          console.error('Hiba történt:', err);
          setLoading(false);
          alert("Nem sikerült elindítani az elemzést.");
        }
      };
      
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <Loader2Icon className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                        <span className="text-lg font-semibold text-blue-700">Analízis...</span>
                    </div>
                ) : (
                    <>
                        <DialogHeader>
                            <DialogTitle>Töltsd fel az Igénylést</DialogTitle>
                            <DialogDescription>
                                <div>
                                    <label htmlFor='resumeUpload' className='flex items-center flex-col 
                                    justify-center p-7 border border-dashed 
                                    rounded-xl hover:bg-slate-100 cursor-pointer'>
                                        <File className='h-10 w-10' />
                                        {file ?
                                            <h2 className='mt-3 text-blue-600'>{file?.name}</h2> :
                                            <h2 className='mt-3'>Kattintson ide a fájl feltöltéséhez (PDF, DOCX, XLSX, CSV)</h2>}
                                    </label>
                                    <input 
                                        type='file' 
                                        id='resumeUpload' 
                                        accept=".pdf,.docx,.xlsx,.csv,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,application/vnd.ms-excel"
                                        className='hidden' 
                                        onChange={onFileChange} 
                                    />
                                </div>
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button variant={'outline'} onClick={() => setOpen(false)}>Cancel</Button>
                            <Button disabled={!file || loading} onClick={onUploadAndAnalyze}>
                                {loading ? <Loader2Icon className='animate-spin' /> : <Sparkles />} Upload & Analyze</Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    )
}

export default DemandUploadDialog   