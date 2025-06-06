"use client"
import axios from 'axios';
import { useParams } from 'next/navigation'
import React, { useEffect, useState } from 'react'
import Report from './_components/Report';

function AiDemandAnalzyer() {
    const { recordid } = useParams();
    const [pdfUrl, setPdfUrl] = useState();
    const [aiReport, setAiReport] = useState();
    useEffect(() => {
        recordid && GetDemandAnalyzerRecord();
    }, [recordid])
    const GetDemandAnalyzerRecord = async () => {
        const result = await axios.get('/api/history?recordId=' + recordid);
        console.log(result.data);
        setPdfUrl(result.data?.metaData);
        setAiReport(result.data?.content)
    }

    return (
        <div className="grid lg:grid-cols-4 grid-cols-1 h-[83vh]">
            {/* Report Section */}
            <div className="col-span-2 overflow-y-auto  border-r h-full">
                <Report aiReport={aiReport} />
            </div>

            {/* Resume Preview Section */}
            <div className="col-span-2 p-4 h-full">
                <h2 className="font-bold text-2xl mb-5">Igény leírás eredeti</h2>
                {pdfUrl ? (
                    <div className="w-full flex justify-center">
                        <iframe
                            src={pdfUrl + '#toolbar=0&navpanes=0&scrollbar=0'}
                            className="bg-white"
                            style={{
                                border: 'none',
                                background: 'white',
                                width: 'fit-content',
                                minWidth: '800px',
                                maxWidth: '100%',
                                minHeight: '1000px',
                                display: 'block',
                            }}
                            width="800"
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