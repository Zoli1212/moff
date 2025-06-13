"use client"
import axios from 'axios';
import { useParams } from 'next/navigation'
import React, { useEffect, useState } from 'react'
import Report from './_components/Report';
import { Proposal } from '@/types/proposal';

function AiDemandAnalzyer() {
    const { recordid } = useParams();
    const [fileUrl, setFileUrl] = useState<string>();
    const [fileType, setFileType] = useState<string>();
    const [fileName, setFileName] = useState<string>();
    const [aiReport, setAiReport] = useState<{ [key: string]: unknown; proposal?: Proposal }>({});
    useEffect(() => {
        if (recordid) {
          GetDemandAnalyzerRecord();
        }
      }, [recordid]);
      
    const GetDemandAnalyzerRecord = async () => {
        try {
            const result = await axios.get('/api/history?recordId=' + recordid);
            console.log('API Response:', result.data);
            
            // Handle both old and new metadata formats
            let fileUrl = '';
            let fileType = '';
            let fileName = '';

            console.log('metaData type:', typeof result.data?.metaData);
            console.log('metaData content:', result.data?.metaData);
            
            // Try to parse metaData if it's a string
            let parsedMetaData = null;
            if (typeof result.data?.metaData === 'string') {
                try {
                    parsedMetaData = JSON.parse(result.data.metaData);
                    console.log('Parsed metaData:', parsedMetaData);
                } catch (e) {
                    console.log('metaData is not a JSON string, treating as direct URL');
                    // Old format - direct URL string
                    fileUrl = result.data.metaData;
                    // Try to guess file type from URL
                    if (fileUrl.toLowerCase().endsWith('.pdf')) {
                        fileType = 'application/pdf';
                    }
                }
            } else if (result.data?.metaData && typeof result.data.metaData === 'object') {
                parsedMetaData = result.data.metaData;
            }
            
            // If we have parsed metadata, extract the values
            if (parsedMetaData) {
                console.log('Using parsed metadata');
                fileUrl = parsedMetaData.fileUrl || '';
                fileType = parsedMetaData.fileType || '';
                fileName = parsedMetaData.fileName || '';
                console.log('Extracted from metaData:', { fileUrl, fileType, fileName });
            } else if (result.data?.fileUrl) {
                // Direct fields in the response as fallback
                console.log('Using direct fields from response');
                fileUrl = result.data.fileUrl;
                fileType = result.data.fileType || '';
                fileName = result.data.fileName || '';
            }

            console.log('Final values before setting state:', { fileUrl, fileType, fileName });
            
            setFileUrl(fileUrl);
            setFileType(fileType || '');
            setFileName(fileName || '');
            setAiReport(result.data?.content || {});
            
            // Log the current state after setting
            setTimeout(() => {
                console.log('Current state after setState:', { fileUrl, fileType, fileName });
            }, 0);
        } catch (error) {
            console.error('Error in GetDemandAnalyzerRecord:', error);
        }
    }

    return (
        <div className="grid lg:grid-cols-4 grid-cols-1 h-[83vh] gap-8">
            {/* Report Section */}
            <div className="col-span-2 overflow-y-auto  border-r h-full">
                <Report aiReport={aiReport} />
            </div>

            {/* File Preview Section */}
            <div className="col-span-2 p-4">
                <h2 className="font-bold text-2xl mb-5">Igény leírás eredeti</h2>
                {fileUrl ? (
                    <div className="w-full">
                        {fileType?.includes('pdf') ? (
                            <iframe
                                src={`${fileUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
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
                                title={fileName || 'Dokumentum megtekintő'}
                            />
                        ) : (
                            <div className="bg-white p-6 rounded-lg shadow-md">
                                <h3 className="text-lg font-semibold mb-4">Fájl előnézet: {fileName}</h3>
                                <p className="mb-4">Ez a fájltípus nem tekinthető meg közvetlenül az oldalon.</p>
                                <a 
                                    href={fileUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline"
                                    download
                                >
                                    Fájl letöltése
                                </a>
                            </div>
                        )}
                    </div>
                ) : (
                    <p className="text-gray-500">Nincs megjeleníthető fájl.</p>
                )}
            </div>
        </div>

    )
}

export default AiDemandAnalzyer