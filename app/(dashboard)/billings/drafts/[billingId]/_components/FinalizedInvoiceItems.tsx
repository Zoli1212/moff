"use client";

import { OfferItem } from "@/types/offer.types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface FinalizedInvoiceItemsProps {
  items: OfferItem[];
}

const parseCurrency = (value: string | number): number => {
  if (typeof value === 'number') return value;
  const numericValue = String(value).replace(/[^0-9,-]+/g, "").replace(",", ".");
  return parseFloat(numericValue) || 0;
};

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("hu-HU", { style: 'currency', currency: 'HUF', maximumFractionDigits: 0 }).format(value);
};

export function FinalizedInvoiceItems({ items }: FinalizedInvoiceItemsProps) {
  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Kiszámlázott tételek</h3>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead>Megnevezés</TableHead>
              <TableHead className="text-right">Mennyiség</TableHead>
              <TableHead>Egység</TableHead>
              <TableHead className="text-right">Anyag egységár</TableHead>
              <TableHead className="text-right">Díj egységár</TableHead>
              <TableHead className="text-right">Anyag összesen</TableHead>
              <TableHead className="text-right">Díj összesen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell className="text-right">{item.quantity}</TableCell>
                <TableCell>{item.unit}</TableCell>
                <TableCell className="text-right">{formatCurrency(parseCurrency(item.materialUnitPrice || '0'))}</TableCell>
                <TableCell className="text-right">{formatCurrency(parseCurrency(item.unitPrice || '0'))}</TableCell>
                <TableCell className="text-right font-semibold">{formatCurrency(parseCurrency(item.materialTotal || '0'))}</TableCell>
                <TableCell className="text-right font-semibold">{formatCurrency(parseCurrency(item.workTotal || '0'))}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
