'use client';

import React from "react";
import { usePDF } from "react-to-pdf";

interface PdfDownloadButtonProps {
  fileName?: string;
  children?: React.ReactNode;
}

const PdfDownloadButton: React.FC<PdfDownloadButtonProps> = ({ fileName = "ajanlat.pdf", children }) => {
  const { toPDF, targetRef } = usePDF({ filename: fileName });

  return (
    <div>
      <button
        type="button"
        onClick={() => toPDF()}
        className="bg-blue-600 hover:bg-blue-800 text-white font-bold py-2 px-4 rounded shadow mb-4"
      >
        Ajánlat letöltése PDF-ben
      </button>
      <div ref={targetRef}>
        {children}
      </div>
    </div>
  );
};

export default PdfDownloadButton;
