import React, { useState, useCallback } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from '@/components/ui/button'
import { Loader2, Upload, FileDown } from 'lucide-react'
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';

interface OfferGeneratorDialogProps {
  openDialog: boolean;
  setOpenDialog: (open: boolean) => void;
}

interface ProcessedFile {
  filename: string;
  data: string;
}

function OfferGeneratorDialog({ openDialog, setOpenDialog }: OfferGeneratorDialogProps) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState('');
    const [processedFile, setProcessedFile] = useState<ProcessedFile | null>(null);

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (!file) return;

        setIsProcessing(true);
        setError('');
        setProcessedFile(null);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/process-excel', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error processing file');
            }

            const result = await response.json();
            setProcessedFile({
                filename: result.filename,
                data: result.data
            });
            toast.success('Excel fájl sikeresen feldolgozva!');
        } catch (err) {
            console.error('Error processing file:', err);
            setError(err instanceof Error ? err.message : 'Hiba történt a fájl feldolgozása során');
            toast.error('Hiba történt a fájl feldolgozása során');
        } finally {
            setIsProcessing(false);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'application/vnd.ms-excel': ['.xls']
        },
        maxFiles: 1,
        disabled: isProcessing
    });

    const downloadFile = () => {
        if (!processedFile) return;
        
        const link = document.createElement('a');
        link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${processedFile.data}`;
        link.download = processedFile.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    return (
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Excel Fájl Feldolgozó</DialogTitle>
                    <DialogDescription asChild>
                        <div className='mt-2 space-y-4'>
                            <div 
                                {...getRootProps()} 
                                className={`border-2 max-w-md border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                                    isDragActive 
                                        ? 'border-primary bg-primary/5' 
                                        : 'border-border hover:border-primary/50'
                                }`}
                            >
                                <input {...getInputProps()} />
                                <div className='flex flex-col items-center justify-center space-y-2'>
                                    <Upload className='h-10 w-10 text-muted-foreground' />
                                    {isProcessing ? (
                                        <div className='space-y-2'>
                                            <Loader2 className='h-6 w-6 mx-auto animate-spin text-primary' />
                                            <p className='text-sm text-muted-foreground'>Feldolgozás folyamatban...</p>
                                        </div>
                                    ) : isDragActive ? (
                                        <p className='text-sm text-muted-foreground'>Engedje el a fájlt a feltöltéshez</p>
                                    ) : (
                                        <>
                                            <p className='text-sm text-muted-foreground'>
                                                Húzza ide a fájlt, vagy kattintson a tallózáshoz
                                            </p>
                                            <p className='text-xs text-muted-foreground'>
                                                Csak .xlsx és .xls fájlok támogatottak
                                            </p>
                                        </>
                                    )}
                                </div>
                            </div>

                            {error && (
                                <div className='p-4 bg-red-50 text-red-600 rounded-md text-sm'>
                                    {error}
                                </div>
                            )}

                            {processedFile && (
                                <div className='p-4 bg-green-50 max-w-md rounded-md border border-green-200'>
                                    <div className='flex justify-between items-center'>
                                        <div>
                                            <p className='font-medium'>Fájl sikeresen feldolgozva!</p>
                                            <p className='text-sm text-muted-foreground'>{processedFile.filename}</p>
                                        </div>
                                        <Button 
                                            onClick={downloadFile}
                                            variant='outline'
                                            size='sm'
                                            className='gap-2'
                                        >
                                        <FileDown className='h-4 w-4' />
                                         
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button 
                        variant='outline' 
                        onClick={() => setOpenDialog(false)}
                    >
                        Bezárás
                    </Button>
                    <Button 
                        onClick={downloadFile}
                        disabled={!processedFile}
                        className='gap-2'
                    >
                        <FileDown className='h-4 w-4' />
                        Fájl letöltése
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default OfferGeneratorDialog