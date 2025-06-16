"use client";

import { useEffect, useState, useTransition } from "react";
import { getAllEmails } from "../../../actions/server.action";
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { Loader2Icon, Sparkles, FileText, Mail, User, Clock, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// Email type
type Email = {
  id: number;
  gmailId: string;
  from: string;
  subject: string;
  content: string;
  hasAttachment: boolean;
  attachmentFilenames: string[];
  tenantEmail: string;
};

interface AnalysisResult {
  analysis?: {
    sender_intent?: string;
    main_topic?: string;
    key_points?: string[];
    action_required?: boolean;
    priority?: 'high' | 'medium' | 'low';
    deadline?: string;
    related_to?: string;
    sentiment?: 'positive' | 'neutral' | 'negative';
    contact_info?: {
      name?: string;
      email?: string;
      phone?: string;
    };
  };
  summary?: {
    overview?: string;
    next_steps?: string[];
  };
}

function EmailList() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [isPending, startTransition] = useTransition();
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const handleEmailClick = (email: Email) => {
    setSelectedEmail(email);
    setAnalysisResult(null);
    setAnalysisError(null);
  };

  const closeModal = () => {
    setSelectedEmail(null);
    setAnalysisResult(null);
    setAnalysisError(null);
    setIsAnalyzing(false);
  };

  const analyzeEmail = async () => {
    if (!selectedEmail?.content) {
      setAnalysisError('Nincs elemzésre váró tartalom');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);
    const recordId = uuidv4();

    try {
      const formData = new FormData();
      formData.append('emailContent', selectedEmail.content);
      formData.append('recordId', recordId);
      formData.append('emailId', selectedEmail.id.toString());

      await axios.post('/api/email-analyzer', formData);

      const maxRetries = 5;
      let retryCount = 0;
      const result = null;

      while (retryCount < maxRetries && !result) {
        try {
          const response = await axios.get(`/api/email-analyzer/status?eventId=${recordId}`);

          if (response.data && response.data.status === 'Completed' && response.data.result) {
            setAnalysisResult(response.data.result);
            return;
          }
        } catch (error: unknown) {
          console.warn(`Attempt ${retryCount + 1} failed ${(error as Error).message} `);
        }

        const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
        retryCount++;
      }

      if (!result) {
        throw new Error('Nem sikerült letölteni az elemzést. Kérjük, próbálja újra később.');
      }

    }catch (error: unknown) {
      if (error instanceof Error) {
        setAnalysisError(error.message);
      } else {
        setAnalysisError('Ismeretlen hiba');
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    startTransition(async () => {
      const data = await getAllEmails();
      setEmails(data);
    });
  }, []);

  if (isPending && emails.length === 0) return <div>Betöltés...</div>;

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
      <h2 className="text-2xl font-bold mb-4">Kérések lista</h2>
      {emails.length === 0 ? (
        <div className="text-gray-500">Nincs beérkező email.</div>
      ) : (
        <ul className="w-full max-w-[1600px] p-0 m-0 list-none">
          {emails.map((email) => (
            <li
              key={email.id}
              className="mb-2 min-h-[60px] flex items-stretch gap-2 max-w-[1600px] w-full cursor-pointer"
              onClick={() => handleEmailClick(email)}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0 bg-white rounded-lg shadow-sm hover:shadow-lg transition-all duration-200 border border-gray-200 p-3 overflow-hidden">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <Mail className="w-4 h-4 text-blue-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-900 truncate">{email.from}</h3>
                    <span className="text-xs text-gray-500">
                      {new Date().toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 truncate">{email.subject}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {email.content.substring(0, 100)}{email.content.length > 100 ? '…' : ''}
                  </p>
                </div>
                {email.hasAttachment && (
                  <span className="flex-shrink-0 ml-2" title="Mellékletek">
                    <FileText className="w-4 h-4 text-gray-400" />
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={!!selectedEmail} onOpenChange={open => !open && closeModal()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedEmail && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">{selectedEmail.subject}</DialogTitle>
                <DialogDescription className="mt-1">
                  <div className="flex items-center text-sm text-gray-600">
                    <User className="w-4 h-4 mr-1" />
                    <span>{selectedEmail.from}</span>
                  </div>
                  <div className="flex items-center text-xs text-gray-500 mt-1">
                    <Clock className="w-3 h-3 mr-1" />
                    <span>
                      {new Date().toLocaleString('hu-HU', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </DialogDescription>
              </DialogHeader>

              <div className="mt-4 border-t border-gray-200 pt-4">
                <div className="prose max-w-none">
                  <pre className="whitespace-pre-wrap font-sans text-sm">
                    {selectedEmail.content}
                  </pre>
                </div>

                {selectedEmail.hasAttachment && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-medium mb-2 flex items-center">
                      <FileText className="w-4 h-4 mr-1" />
                      Mellékletek
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedEmail.attachmentFilenames.map((filename, index) => (
                        <div
                          key={index}
                          className="px-3 py-2 bg-gray-100 rounded-md text-sm flex items-center"
                        >
                          <FileText className="w-4 h-4 mr-2 text-gray-500" />
                          <span className="truncate max-w-xs">{filename}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-6 pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-sm font-medium">Elemzés</h4>
                    <Button
                      onClick={analyzeEmail}
                      disabled={isAnalyzing}
                      className="flex items-center gap-2"
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2Icon className="w-4 h-4 animate-spin" />
                          Elemzés folyamatban...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Elemzés indítása
                        </>
                      )}
                    </Button>
                  </div>

                  {analysisError && (
                    <div className="p-4 bg-red-50 rounded-md text-red-700 text-sm flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                      <div>{analysisError}</div>
                    </div>
                  )}

                  {analysisResult && (
                    <div className="bg-gray-50 rounded-lg p-4 mt-4">
                      <h5 className="font-medium text-gray-900 mb-3">Eredmények</h5>

                      {analysisResult.analysis?.main_topic && (
                        <div className="mb-4">
                          <h6 className="text-sm font-medium text-gray-700 mb-1">Fő téma</h6>
                          <p className="text-sm">{analysisResult.analysis.main_topic}</p>
                        </div>
                      )}

                      {analysisResult.analysis?.key_points && analysisResult.analysis.key_points.length > 0 && (
                        <div className="mb-4">
                          <h6 className="text-sm font-medium text-gray-700 mb-1">Kulcsfontosságú pontok</h6>
                          <ul className="list-disc pl-5 space-y-1">
                            {analysisResult.analysis.key_points.map((point, i) => (
                              <li key={i}>{point}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {analysisResult.summary?.next_steps && analysisResult.summary.next_steps.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <h6 className="text-sm font-medium text-gray-700 mb-2">Következő lépések</h6>
                          <ul className="list-disc pl-5 space-y-1">
                            {analysisResult.summary.next_steps.map((step, i) => (
                              <li key={i} className="text-sm">{step}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default EmailList;
