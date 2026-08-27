"use client";

import React, { useState, useRef } from "react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Upload, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import axios from "axios";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface UploadOfferDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export default function UploadOfferDialog({
  open,
  setOpen,
}: UploadOfferDialogProps) {
  const { t } = useLocale();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/pdf'
    ];

    if (!validTypes.includes(file.type)) {
      setError(t("uo.onlyExcelPdf"));
      return;
    }

    setSelectedFile(file);
    setError("");
  };

  const clearFile = () => {
    setSelectedFile(null);
    setError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError(t("uo.needFile"));
      return;
    }

    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await axios.post("/api/convert-existing-offer", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const { success, requirementId, offerId } = response.data;

      if (success && requirementId && offerId) {
        toast.success(t("uo.converted"));
        setOpen(false);
        clearFile();
        router.push(`/offers/${requirementId}?offerId=${offerId}`);
      } else {
        throw new Error(t("uo.convertFailed"));
      }
    } catch (err) {
      console.error("Error uploading offer:", err);
      setError(t("td.fileErrorRetry"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[500px]">
        {uploading ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <Loader2 className="w-16 h-16 text-[#FF9900] animate-spin mb-6" />
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              {t("td.processingInProgress")}
            </h3>
            <p className="text-gray-600 max-w-md">
              {t("uo.converting")}
            </p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-900">
                {t("offers.list.uploadExisting")}
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                Töltsd fel meglévő ajánlatodat (Excel vagy PDF formátumban), és
                az AI automatikusan strukturált ajánlattá alakítja.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.pdf"
                onChange={handleFileSelect}
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-[#FF9900] transition-colors"
              >
                {selectedFile ? (
                  <div className="flex flex-col items-center">
                    <FileText className="h-12 w-12 text-green-600 mb-3" />
                    <p className="text-sm font-medium text-gray-900">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {(selectedFile.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <Upload className="h-12 w-12 text-gray-400 mb-3" />
                    <p className="text-sm font-medium text-gray-900 mb-1">
                      {t("uo.clickToChoose")}
                    </p>
                    <p className="text-xs text-gray-500">
                      {t("uo.acceptedTypes")}
                    </p>
                  </div>
                )}
              </div>

              {selectedFile && (
                <div className="mt-3 flex justify-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearFile();
                    }}
                    className="text-gray-600 hover:text-gray-900"
                  >
                    <X className="w-4 h-4 mr-1" />
                    {t("uo.deleteFile")}
                  </Button>
                </div>
              )}

              {error && (
                <div className="mt-3 px-4 py-2 bg-red-50 text-red-600 text-sm rounded-md">
                  {error}
                </div>
              )}

              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Tipp:</strong> Az AI feldolgozza az ajánlatodat és
                  strukturált formátumra alakítja, amit aztán szerkeszthetsz és
                  elküldhetsz az ügyfélnek.
                </p>
              </div>
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-3 mt-4">
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => {
                  setOpen(false);
                  clearFile();
                }}
              >
                {t("common.cancel")}
              </Button>
              <Button
                className="w-full sm:w-auto bg-[#FF9900] hover:bg-[#e68a00] text-white"
                disabled={!selectedFile || uploading}
                onClick={handleUpload}
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("od.processing")}
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    {t("uo.uploadAndConvert")}
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
