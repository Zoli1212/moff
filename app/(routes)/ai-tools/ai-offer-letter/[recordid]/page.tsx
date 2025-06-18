"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";
import axios from "axios";

interface OutputItem {
  role: string;
  type: string;
  content: string;
}

interface OfferContent {
  output?: OutputItem[];
  text?: string;
}

interface OfferData {
  id: string;
  recordId: string;
  content: string | OfferContent;
  output?: OutputItem[];
  createdAt: string;
  metaData?: {
    title?: string;
    description?: string;
  };
}

const parseContent = (content: string | OfferContent): OfferContent | null => {
  if (!content) return null;
  if (typeof content === "string") {
    try {
      return JSON.parse(content);
    } catch {
      return { output: [{ role: "assistant", type: "text", content }] };
    }
  }
  return content;
};

const parseOfferTable = (text: string) => {
  const items: any[] = [];
  const lines = text.split("\n");

  for (const line of lines) {
    const trimmed = line.trim().replace(/^\*+/, "");

    const match = trimmed.match(
      /^(.*?)[:\-–—\s]*([\d\s,.]+)\s*(m²|fm|db)\s*[xX×]\s*([\d\s,.]+)\s*Ft\/(m²|fm|db).*?=\s*([\d\s,.]+)\s*Ft/i
    );

    if (match) {
      const [, name, qty, unit, unitPrice, unit2, total] = match;
      items.push({
        name: name.trim(),
        quantity: qty.trim(),
        unit: unit.trim(),
        materialUnitPrice: "0 Ft",
        workUnitPrice: parseInt(unitPrice.replace(/\s|,/g, ""), 10).toLocaleString("hu-HU") + " Ft",
        materialTotal: "0 Ft",
        workTotal: total.trim() + " Ft",
      });
    }
  }

  return items;
};

export default function OfferLetterResult() {
  const params = useParams();
  const router = useRouter();
  const [offer, setOffer] = useState<OfferData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [content, setContent] = useState<OfferContent | null>(null);

  useEffect(() => {
    if (offer) {
      const parsed = parseContent(offer.content);
      setContent(parsed);
    }
  }, [offer]);

  useEffect(() => {
    const fetchOffer = async () => {
      try {
        const response = await axios.get(
          `/api/ai-offer-letter/${params.recordid}`
        );
        setOffer(response.data);
      } catch {
        console.error("Error fetching offer");
        setError(
          "Nem sikerült betölteni az ajánlatot. Kérjük próbáld újra később."
        );
      } finally {
        setIsLoading(false);
      }
    };

    if (params.recordid) {
      fetchOffer();
    }
  }, [params.recordid]);

  const rawText = content?.output?.[0]?.content || "";
  const items = rawText ? parseOfferTable(rawText) : [];

  const totalMatch = rawText.match(/\*\*Összesített nettó költség:\*\*\s*([\d\s.]+)\s*Ft/i);
const timeMatch = rawText.match(/\*\*Becsült kivitelezési idő:\*\*\s*([^\n\\]+)/i);


console.log("Nettó költség:", totalMatch?.[1]?.trim());
console.log("Időtartam:", timeMatch?.[1]?.trim());

 

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Button
        variant="outline"
        className="mb-6"
        onClick={() => router.push("/ai-tools/ai-offer-letter")}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Vissza
      </Button>

      <div className="bg-white p-6 rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-6">Generált Ajánlat</h1>

        {offer && content ? (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="border-b pb-4 mb-6">
                <h1 className="text-xl font-semibold">Ajánlat generálás</h1>
                {offer.metaData?.description && (
                  <p className="text-gray-600 mt-1 truncate">
                    Tárgy: {offer.metaData.description}
                  </p>
                )}
              </div>

              <pre className="whitespace-pre-wrap text-sm mb-4 bg-gray-50 p-4 rounded">
                {rawText}
              </pre>

              <table className="w-full text-sm border">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="text-left p-2 border">Tétel megnevezése</th>
                    <th className="text-left p-2 border">Mennyiség</th>
                    <th className="text-left p-2 border">Egység</th>
                    <th className="text-left p-2 border">Anyag egységár</th>
                    <th className="text-left p-2 border">Díj egységár</th>
                    <th className="text-left p-2 border">Anyag összesen</th>
                    <th className="text-left p-2 border">Díj összesen</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="p-2 border break-words whitespace-pre-wrap">{item.name}</td>
                      <td className="p-2 border">{item.quantity}</td>
                      <td className="p-2 border">{item.unit}</td>
                      <td className="p-2 border">{item.materialUnitPrice}</td>
                      <td className="p-2 border">{item.workUnitPrice}</td>
                      <td className="p-2 border">{item.materialTotal}</td>
                      <td className="p-2 border">{item.workTotal}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {totalMatch && (
                <p className="mt-4 text-base font-medium">
                  Összesített nettó költség: {totalMatch[1].trim() + " Ft"}
                </p>
              )}
              {timeMatch && (
                <p className="text-base font-medium">
                  Becsült kivitelezési idő: {timeMatch[1].trim()}
                </p>
              )}

              <p className="mt-4 text-sm text-gray-500">
                Létrehozva: {new Date(offer.createdAt).toLocaleString("hu-HU")}
              </p>
              <p className="text-sm text-gray-500">
                Ajánlat azonosító: <span className="font-mono">{offer.recordId}</span>
              </p>
            </div>

            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-2">
                JSON Riport (nyers visszatérési érték):
              </h3>
              <pre className="bg-gray-100 p-4 rounded text-xs overflow-x-auto max-h-96">
                {JSON.stringify(offer.content, null, 2)}
              </pre>
            </div>
          </div>
        ) : (
          <p>{error || "Nincs megjeleníthető adat."}</p>
        )}
      </div>
    </div>
  );
}
