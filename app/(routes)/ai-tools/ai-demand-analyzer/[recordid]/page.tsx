"use client"
import axios from 'axios';
import { useParams } from 'next/navigation'
import React, { useEffect, useState } from 'react'
import Report from './_components/Report';
import { Proposal } from '@/types/proposal';

function AiDemandAnalzyer() {
    const { recordid } = useParams();
    const [pdfUrl, setPdfUrl] = useState();
    const [aiReport, setAiReport] = useState<{ [key: string]: unknown; proposal?: Proposal }>({});
    useEffect(() => {
        if (recordid) {
          GetDemandAnalyzerRecord();
        }
      }, [recordid]);
      
    const GetDemandAnalyzerRecord = async () => {
        const result = await axios.get('/api/history?recordId=' + recordid);
        console.log(result.data);
        setPdfUrl(result.data?.metaData);
        setAiReport(result.data?.content || {})
    }

    return (
        <div className="grid lg:grid-cols-4 grid-cols-1 h-[83vh] gap-8">
            {/* Report Section */}
            <div className="col-span-2 overflow-y-auto  border-r h-full">
                <Report aiReport={aiReport} />
            </div>

            {/* Resume Preview Section */}
            <div className="col-span-2 p-4">
                <h2 className="font-bold text-2xl mb-5">Igény leírás eredeti</h2>
                {pdfUrl ? (
                    <div className="w-full">
                        <iframe
                            src={pdfUrl + '#toolbar=0&navpanes=0&scrollbar=0&view=FitH'}
                            className="bg-white w-full max-w-full"
                            style={{
                                border: 'none',
                                background: 'white',
                                width: '100%',
                                maxWidth: '100%',
                                minHeight: '1000px',
                                display: 'block',
                            }}
                            height="1200"
                            loading="lazy"
                        />
                    </div>
                ) : null}
            </div>
        </div>

    )
}

export default AiDemandAnalzyer