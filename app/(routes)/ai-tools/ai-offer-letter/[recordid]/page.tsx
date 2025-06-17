'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft } from 'lucide-react';
import axios from 'axios';

interface OfferData {
  id: string;
  recordId: string;
  content: any;
  output?: Array<{
    role: string;
    type: string;
    content: string;
  }>;
  createdAt: string;
  metaData?: {
    title?: string;
    description?: string;
  };
}

// Helper function to safely parse JSON content
const parseContent = (content: any): any => {
  if (!content) return null;
  if (typeof content === 'string') {
    try {
      return JSON.parse(content);
    } catch (e) {
      return { output: [{ role: 'assistant', type: 'text', content }] };
    }
  }
  return content;
};

export default function OfferLetterResult() {
  const params = useParams();
  const router = useRouter();
  const [offer, setOffer] = useState<OfferData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [content, setContent] = useState<any>(null);

  // Parse content when offer changes
  useEffect(() => {
    if (offer) {
      setContent(parseContent(offer.content));
    }
  }, [offer]);

  useEffect(() => {
    const fetchOffer = async () => {
      try {
        const response = await axios.get(`/api/ai-offer-letter/${params.recordid}`);
        setOffer(response.data);
      } catch (err) {
        console.error('Error fetching offer:', err);
        setError('Nem sikerült betölteni az ajánlatot. Kérjük próbáld újra később.');
      } finally {
        setIsLoading(false);
      }
    };

    if (params.recordid) {
      fetchOffer();
    }
  }, [params.recordid]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2">Ajánlat betöltése...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-600 bg-red-50 rounded-lg">
        <p>{error}</p>
        <Button 
          variant="outline" 
          className="mt-4"
          onClick={() => router.push('/ai-tools/ai-offer-letter')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Vissza a kezdőlapra
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Button 
        variant="outline" 
        className="mb-6"
        onClick={() => router.push('/ai-tools/ai-offer-letter')}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Vissza
      </Button>

      <div className="bg-white p-6 rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-6">Generált Ajánlat</h1>
        
        {offer && content ? (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-md p-6">
              {/* Header */}
              <div className="border-b pb-4 mb-6">
                <h1 className="text-2xl font-bold text-gray-800">
                  {offer.metaData?.title || 'Generált Ajánlat'}
                </h1>
                {offer.metaData?.description && (
                  <p className="text-gray-600 mt-2">{offer.metaData.description}</p>
                )}
              </div>

              {/* Main Content */}
              <div className="prose max-w-none">
                {content.output?.map((item: any, index: number) => (
                  <div key={index} className="mb-6">
                    {item.role === 'assistant' && (
                      <div className="bg-gray-50 p-5 rounded-lg">
                        <div 
                          className="prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none"
                          dangerouslySetInnerHTML={{
                            __html: (
                              (item.content || '')
                                .replace(/\n\n/g, '</p><p>')
                                .replace(/\n/g, '<br />')
                                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                            )
                          }}
                        />
                      </div>
                    )}
                  </div>
                ))}

                {!content.output?.length && content.text && (
                  <div className="whitespace-pre-wrap">
                    {content.text}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="mt-8 pt-4 border-t text-sm text-gray-500">
                <p>Létrehozva: {new Date(offer.createdAt).toLocaleString('hu-HU')}</p>
                <p className="mt-1">
                  Ajánlat azonosító: <span className="font-mono">{offer.recordId}</span>
                </p>
              </div>
            </div>
          </div>
        ) : (
          <p>Nincs megjeleníthető adat.</p>
        )}
      </div>
    </div>
  );
}
