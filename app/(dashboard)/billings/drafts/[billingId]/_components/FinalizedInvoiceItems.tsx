"use client";

import { OfferItem } from "@/types/offer.types";
import { useLocale } from "@/components/i18n/LocaleProvider";
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
  const { t } = useLocale();

  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">{t("x.billedItems")}</h3>
      
      {/* Desktop Table */}
      <div className="hidden sm:block border rounded-lg overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead>{t("od.name")}</TableHead>
              <TableHead className="text-right">{t("od.quantity")}</TableHead>
              <TableHead>{t("od.unit")}</TableHead>
              <TableHead className="text-right">{t("od.materialUnitPrice")}</TableHead>
              <TableHead className="text-right">{t("od.feeUnitPrice")}</TableHead>
              <TableHead className="text-right">{t("od.materialTotal")}</TableHead>
              <TableHead className="text-right">{t("od.feeTotal")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, index) => (
              <TableRow key={`desktop-${index}`}>
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

      {/* Mobile View */}
      <div className="sm:hidden space-y-4">
        {items.map((item, index) => (
          <div key={`mobile-${index}`} className="border rounded-lg p-4 bg-white shadow-sm">
            <div className="font-medium text-gray-900 mb-2">{item.name}</div>
            
            <div className="grid grid-cols-2 gap-4 mt-3">
              <div>
                <div className="text-sm text-gray-500">{t("od.quantity")}</div>
                <div className="font-medium">{item.quantity} {item.unit}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">{t("offers.unitPrice")}</div>
                <div className="font-medium">{formatCurrency(parseCurrency(item.unitPrice || '0'))}</div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-500">ANYAG</div>
                  <div className="text-sm text-gray-600">{formatCurrency(parseCurrency(item.materialUnitPrice || '0'))}/db</div>
                  <div className="font-semibold text-gray-900">{formatCurrency(parseCurrency(item.materialTotal || '0'))}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">{t("x.labourUpper")}</div>
                  <div className="text-sm text-gray-600">{formatCurrency(parseCurrency(item.unitPrice || '0'))}/db</div>
                  <div className="font-semibold text-gray-900">{formatCurrency(parseCurrency(item.workTotal || '0'))}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
