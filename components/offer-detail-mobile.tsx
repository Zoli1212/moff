"use client";

import { useEffect, useState, useCallback } from "react";
import {
  updateOfferItems,
  updateOfferStatus,
  updateOfferValidUntil
} from "@/actions/offer-actions";
import { deleteOffer } from "@/actions/delete-offer";
import { toast } from "sonner";
import { RequirementDetail } from "./requirement-detail";
import { format } from "date-fns";
import { hu } from "date-fns/locale";
import { OfferItem, OfferWithItems } from "@/types/offer.types";
import { useDemandStore } from "@/store/offerLetterStore";
import { useOfferItemCheckStore } from "@/store/offerItemCheckStore";
import dynamic from "next/dynamic";
import ConfirmationDialog from "./ConfirmationDialog";
import DeleteConfirmModal from "@/components/ui/delete-confirm-modal";

// Dynamically import the email sender component to avoid SSR issues
const OfferLetterEmailSender = dynamic(
  () =>
    import(
      "@/app/(routes)/ai-tools/ai-offer-letter/[recordid]/_components/OfferLetterEmailSender"
    ),
  { ssr: false }
);
import {
  FileText,
  List,
  Clock,
  Tag,
  Calendar,
  ChevronRight,
  Pencil,
  Plus,
  Trash2,
  Mail,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { AddOfferItemModal } from "./AddOfferItemModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

import TextInputDialogQuestions from "@/app/(routes)/dashboard/_components/TextInputDialogQuestions";
import SocialShareButtonsExcel from "./SocialShareButtonsExcel";

// Helper function to extract questions from description
function extractQuestions(description: string): string[] {
  if (!description) return [];

  // Először soronként vizsgálunk, minden kérdőjellel végződő sort felveszünk
  const lines = description.split(/\r?\n/);
  const questions: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.endsWith("?")) {
      // Ha szám+pont/zárójel van elöl, azt levágjuk
      const match = trimmed.match(/^(\d+[.)]?\s*)(.*\?)$/);
      if (match) {
        questions.push(match[2].trim());
      } else {
        questions.push(trimmed);
      }
    }
  }

  // Ha így nincs kérdés, próbáljuk mondatonként is, hátha egy sorban több kérdés van
  if (questions.length === 0) {
    const sentences = description.split(/(?<=[.!?])\s+/);
    sentences.forEach((sentence) => {
      const trimmed = sentence.trim();
      if (trimmed.endsWith("?")) {
        questions.push(trimmed);
      }
    });
  }

  return questions;
}

interface OfferDetailViewProps {
  offer: OfferWithItems;
  onBack: () => void;
  onStatusChange?: (newStatus: string) => void;
  onOfferDeleted?: (offerId: number) => void;
  onOfferUpdated?: (updatedOffer: Partial<OfferWithItems>) => void;
}

export function OfferDetailView({
  offer,
  onBack,
  onStatusChange,
  onOfferDeleted,
  onOfferUpdated,
}: OfferDetailViewProps) {
  const [showRequirementDetail, setShowRequirementDetail] = useState(false);
  const [editableItems, setEditableItems] = useState<OfferItem[]>([]);
  const [editingItem, setEditingItem] = useState<{
    index: number;
    item: OfferItem;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [originalItems, setOriginalItems] = useState<OfferItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isEmailExpanded, setIsEmailExpanded] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showOfferDeleteModal, setShowOfferDeleteModal] = useState(false);
  const [isOfferDeleting, setIsOfferDeleting] = useState(false);
  const [isUpdatingValidUntil, setIsUpdatingValidUntil] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [isUpdatingTitle, setIsUpdatingTitle] = useState(false);
  const [saveTenantPriceChecked, setSaveTenantPriceChecked] = useState(true); // Default: bejelölve
  const [saveGlobalPriceChecked, setSaveGlobalPriceChecked] = useState(false); // Default: nincs bejelölve
  const [isSuperUser, setIsSuperUser] = useState(false);
  const [showCustomItemModal, setShowCustomItemModal] = useState(false);
  const [selectedCustomItem, setSelectedCustomItem] = useState<OfferItem | null>(null);
  const [isSavingGlobalPrice, setIsSavingGlobalPrice] = useState(false);
  const { setDemandText } = useDemandStore();
  const { setOfferItems } = useOfferItemCheckStore();

  // Update the store whenever editableItems changes
  useEffect(() => {
    setOfferItems(editableItems);
  }, [editableItems, setOfferItems]);

  // Initialize items
  useEffect(() => {
    if (offer.items) {
      const items = Array.isArray(offer.items) ? offer.items : [];
      // Ensure all items have the required fields

      const validatedItems = items.map((item, index) => ({
        id: index, // Add unique id for each item
        name: item.name || "",
        quantity: item.quantity || "1",
        unit: item.unit || "db",
        materialUnitPrice: item.materialUnitPrice || "0 Ft",
        unitPrice: item.unitPrice || "0 Ft",
        materialTotal: item.materialTotal || "0 Ft",
        workTotal: item.workTotal || "0 Ft",
        new: item.new || false, // Preserve the new field for custom items
      }));
      setEditableItems(validatedItems);
      // Store original items with their indices
      setOriginalItems(validatedItems);
    }
  }, [offer.items]);

  // Check if user is super user
  useEffect(() => {
    const checkSuperUser = async () => {
      try {
        const { checkIsSuperUser } = await import("@/actions/user-management-actions");
        const result = await checkIsSuperUser();
        setIsSuperUser(result.isSuperUser || false);
      } catch (error) {
        console.error("Error checking super user status:", error);
        setIsSuperUser(false);
      }
    };
    checkSuperUser();
  }, []);

  console.log(originalItems);

  // Parse currency values
  const parseCurrency = (value: string | null | undefined): number => {
    if (!value) return 0;
    const stringValue = String(value);
    const numericValue = stringValue
      .replace(/[^0-9,-]+/g, "")
      .replace(",", ".");
    return parseFloat(numericValue) || 0;
  };

  // Format currency
  const formatCurrency = (value: number): string => {
    return value.toLocaleString("hu-HU") + " Ft";
  };

  // Format number with space as thousand separator
  const formatNumberWithSpace = (
    value: string | number | null | undefined
  ): string => {
    if (value === null || value === undefined) return "";
    const num =
      typeof value === "string"
        ? parseFloat(value.replace(/\s+/g, "").replace(",", ".")) || 0
        : value;
    return num.toLocaleString("hu-HU", {
      useGrouping: true,
      maximumFractionDigits: 0,
    });
  };

  // // Handle item field change
  // const handleItemChange = (index: number, field: string, value: string) => {
  //   const newItems = [...editableItems];
  //   const item = { ...newItems[index], [field]: value };

  //   // Recalculate totals if quantity or prices change
  //   if (["quantity", "materialUnitPrice", "workUnitPrice"].includes(field)) {
  //     const quantity = parseFloat(item.quantity) || 0;
  //     const materialUnitPrice = parseCurrency(item.materialUnitPrice);
  //     const workUnitPrice = parseCurrency(item.workUnitPrice);

  //     item.materialTotal = formatCurrency(quantity * materialUnitPrice);
  //     item.workTotal = formatCurrency(quantity * workUnitPrice);
  //   }

  //   newItems[index] = item;
  //   setEditableItems(newItems);
  // };

  // Add new item - now opens modal
  const handleAddItem = () => {
    setShowAddModal(true);
  };

  // Handle saving new item from modal
  const handleSaveNewItem = async (newItemData: {
    name: string;
    quantity: string;
    unit: string;
    materialUnitPrice: string;
    unitPrice: string;
  }) => {
    const newItem = {
      id: Date.now(),
      name: newItemData.name,
      quantity: newItemData.quantity,
      unit: newItemData.unit,
      materialUnitPrice: newItemData.materialUnitPrice,
      unitPrice: newItemData.unitPrice,
      materialTotal: calculateTotal(
        newItemData.quantity,
        newItemData.materialUnitPrice
      ),
      workTotal: calculateTotal(newItemData.quantity, newItemData.unitPrice),
    };

    // Add the new item at the FIRST position
    const updatedItems = [newItem, ...editableItems];

    setIsSaving(true);
    try {
      const result = await updateOfferItems(
        parseInt(offer.id.toString()),
        updatedItems
      );

      if (result.success) {
        toast.success("Az új tétel sikeresen hozzáadva");
        setEditableItems(updatedItems);
        setOriginalItems(updatedItems.map((item) => ({ ...item })));
      } else {
        toast.error(result.error || "Hiba történt a mentés során");
      }
    } catch (error) {
      console.error("Error saving new item:", error);
      toast.error("Hiba történt a mentés során");
    } finally {
      setIsSaving(false);
    }
  };

  // Helper function to calculate totals
  const calculateTotal = (quantity: string, unitPrice: string) => {
    const qty = parseFloat(quantity) || 0;
    const price = parseFloat(unitPrice.replace(/[^\d.-]/g, "")) || 0;
    const total = qty * price;
    return `${total.toLocaleString("hu-HU")} Ft`;
  };

  // Show delete confirmation
  const showDeleteConfirmation = (index: number) => {
    setItemToDelete(index);
    setShowDeleteConfirm(true);
  };

  // Remove item
  const handleRemoveItem = async () => {
    if (itemToDelete === null) return;

    // Ha az ajánlat munkában van, ne engedjük törölni
    if (offer.status === "work") {
      toast.error("Munkába állított ajánlatból nem lehet tételt törölni!");
      setShowDeleteConfirm(false);
      setItemToDelete(null);
      return;
    }

    const newItems = [...editableItems];
    newItems.splice(itemToDelete, 1);

    setIsSaving(true);
    try {
      const result = await updateOfferItems(
        parseInt(offer.id.toString()),
        newItems
      );

      if (result.success) {
        toast.success("A tétel sikeresen törölve");
        setEditableItems(newItems);
        setOriginalItems(newItems.map((item) => ({ ...item })));
      } else {
        toast.error(result.error || "Hiba történt a törlés során");
        // Restore original state on error
        setEditableItems([...editableItems]);
      }
    } catch (error) {
      console.error("Error deleting item:", error);
      toast.error("Hiba történt a törlés során");
      // Restore original state on error
      setEditableItems([...editableItems]);
    } finally {
      setIsSaving(false);
      setShowDeleteConfirm(false);
      setItemToDelete(null);
    }
  };

  // Start editing an item in modal
  const startEditing = (index: number) => {
    setEditingItem({ index, item: { ...editableItems[index] } });
    setIsModalOpen(true);
  };

  // Handle modal input changes
  const handleModalChange = (field: string, value: string) => {
    if (!editingItem) return;

    const updatedItem = { ...editingItem.item, [field]: value };

    // Recalculate totals if quantity or prices change
    if (["quantity", "materialUnitPrice", "unitPrice"].includes(field)) {
      const quantity = parseFloat(updatedItem.quantity) || 0;
      const materialUnitPrice = parseCurrency(
        updatedItem.materialUnitPrice || "0"
      );
      const workUnitPrice = parseCurrency(updatedItem.unitPrice || "0");

      updatedItem.materialTotal = formatCurrency(quantity * materialUnitPrice);
      updatedItem.workTotal = formatCurrency(quantity * workUnitPrice);
    }

    setEditingItem({ ...editingItem, item: updatedItem });
  };

  // Save the item from modal
  const saveItem = async () => {
    if (!editingItem) return;

    const { index, item } = editingItem;

    if (!item.name || !item.quantity || !item.unit) {
      toast.error("Kérem töltse ki az összes kötelező mezőt");
      return;
    }

    setIsSaving(true);
    try {
      const newItems = [...editableItems];
      newItems[index] = item;

      const result = await updateOfferItems(
        parseInt(offer.id.toString()),
        newItems
      );

      if (result.success) {
        const laborCost = parseCurrency(item.unitPrice || "0");
        const materialCost = parseCurrency(item.materialUnitPrice || "0");

        // Ha a checkbox be van jelölve, mentjük a vállalkozói szintű árakat is
        if (saveTenantPriceChecked) {
          console.log("Vállalkozói szintű ár mentése...", {
            name: item.name,
            unit: item.unit,
            unitPrice: item.unitPrice,
            materialUnitPrice: item.materialUnitPrice,
          });

          console.log("Parsed costs:", { laborCost, materialCost });

          const { saveTenantPrice } = await import("@/actions/offer-actions");
          const priceResult = await saveTenantPrice(
            item.name,
            null, // category - nem szükséges a modal-ból
            null, // technology - nem szükséges a modal-ból
            item.unit,
            laborCost,
            materialCost
          );

          console.log("Vállalkozói szintű ár mentés eredménye:", priceResult);

          if (!priceResult.success) {
            console.warn(
              "Vállalkozói szintű ár mentése sikertelen:",
              priceResult.message
            );
            // Nem jelezzük hibát, mert az offer már mentve van
          } else {
            console.log("Vállalkozói szintű ár sikeresen mentve");
          }
        }

        // Ha a checkbox be van jelölve, mentjük a globális árakat is
        if (saveGlobalPriceChecked) {
          console.log("Globális ár mentése...", {
            name: item.name,
            unit: item.unit,
            unitPrice: item.unitPrice,
            materialUnitPrice: item.materialUnitPrice,
          });

          const { saveGlobalPrice } = await import("@/actions/offer-actions");
          const globalPriceResult = await saveGlobalPrice(
            item.name,
            null, // category - nem szükséges a modal-ból
            null, // technology - nem szükséges a modal-ból
            item.unit,
            laborCost,
            materialCost
          );

          console.log("Globális ár mentés eredménye:", globalPriceResult);

          if (!globalPriceResult.success) {
            console.warn(
              "Globális ár mentése sikertelen:",
              globalPriceResult.message
            );
            // Nem jelezzük hibát, mert az offer már mentve van
          } else {
            console.log("Globális ár sikeresen mentve");
          }
        }

        toast.success("A tétel sikeresen mentve");
        setEditableItems(newItems);
        setOriginalItems(newItems.map((item) => ({ ...item })));
        setIsModalOpen(false);
      } else {
        toast.error(result.error || "Hiba történt a mentés során");
      }
    } catch (error) {
      console.error("Error saving item:", error);
      toast.error("Hiba történt a mentés során");
    } finally {
      setIsSaving(false);
    }
  };

  // Cancel editing in modal
  const cancelEditing = () => {
    setIsModalOpen(false);
  };

  // Handle saving custom item to global price list
  const handleSaveCustomItemToGlobal = async () => {
    if (!selectedCustomItem) return;

    setIsSavingGlobalPrice(true);
    try {
      const { saveGlobalPrice } = await import("@/actions/offer-actions");
      const laborCost = parseCurrency(selectedCustomItem.unitPrice || "0");
      const materialCost = parseCurrency(selectedCustomItem.materialUnitPrice || "0");

      const result = await saveGlobalPrice(
        selectedCustomItem.name,
        null, // category
        null, // technology
        selectedCustomItem.unit,
        laborCost,
        materialCost
      );

      if (result.success) {
        toast.success("Az egyedi tétel sikeresen mentve a globális árlistához!");
        setShowCustomItemModal(false);
        setSelectedCustomItem(null);
      } else {
        toast.error(result.message || "Hiba történt a mentés során");
      }
    } catch (error) {
      console.error("Error saving custom item to global price list:", error);
      toast.error("Hiba történt a mentés során");
    } finally {
      setIsSavingGlobalPrice(false);
    }
  };

  // Handle offer deletion
  const handleOfferDeleteClick = () => {
    setShowOfferDeleteModal(true);
  };

  // Handle validUntil editing - trigger date input click
  const handleValidUntilEdit = () => {
    const dateInput = document.getElementById(
      "validUntil-date-input"
    ) as HTMLInputElement;
    if (dateInput) {
      // Try focus first, then click
      dateInput.focus();
      // Small delay to ensure focus is set
      setTimeout(() => {
        if (typeof dateInput.showPicker === "function") {
          try {
            dateInput.showPicker();
          } catch (e) {
            console.log(e);
            dateInput.click();
          }
        } else {
          dateInput.click();
        }
      }, 100);
    }
  };

  const handleValidUntilChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    if (!value) return;

    const selectedDate = new Date(value);
    if (isNaN(selectedDate.getTime())) {
      toast.error("Kérem adjon meg egy érvényes dátumot");
      return;
    }

    setIsUpdatingValidUntil(true);
    try {
      const result = await updateOfferValidUntil(offer.id, selectedDate);

      if (result.success) {
        toast.success("Az érvényességi dátum sikeresen frissítve");
        // Update the offer object in the parent component
        if (onOfferUpdated && result.offer) {
          onOfferUpdated({ validUntil: result.offer.validUntil });
        }
      } else {
        toast.error(result.error || "Hiba történt a dátum frissítésekor");
      }
    } catch (error) {
      console.error("Error updating validUntil:", error);
      toast.error("Hiba történt a dátum frissítésekor");
    } finally {
      setIsUpdatingValidUntil(false);
    }
  };

  // Handle title editing
  const handleTitleEdit = () => {
    setTitleValue(offer.title || "");
    setIsEditingTitle(true);
  };

  const handleTitleSave = async () => {
    if (!titleValue.trim()) {
      toast.error("Kérem adjon meg egy címet");
      return;
    }

    setIsUpdatingTitle(true);
    try {
      const { updateOfferTitle } = await import("@/actions/offer-actions");
      const result = await updateOfferTitle(offer.id, titleValue);

      if (result.success) {
        toast.success("A cím sikeresen frissítve");
        setIsEditingTitle(false);
        if (onOfferUpdated && result.offer) {
          onOfferUpdated({ title: result.offer.title });
        }
      } else {
        toast.error(result.error || "Hiba történt a cím frissítésekor");
      }
    } catch (error) {
      console.error("Error updating title:", error);
      toast.error("Hiba történt a cím frissítésekor");
    } finally {
      setIsUpdatingTitle(false);
    }
  };

  const handleTitleCancel = () => {
    setIsEditingTitle(false);
    setTitleValue("");
  };

  const handleOfferDeleteConfirm = async () => {
    setIsOfferDeleting(true);
    try {
      const result = await deleteOffer(offer.id);

      if (result.success) {
        toast.success("Ajánlat sikeresen törölve");

        // Notify parent component about deletion
        if (onOfferDeleted) {
          onOfferDeleted(offer.id);
        }

        // Navigate back to offers list
        if (onBack) {
          onBack();
        }
      } else {
        toast.error(result.error || "Hiba történt a törlés során");
      }
    } catch (error) {
      console.error("❌ [OFFER-DETAIL] Error deleting offer:", error);
      toast.error("Hiba történt a törlés során");
    } finally {
      setIsOfferDeleting(false);
      setShowOfferDeleteModal(false);
    }
  };

  const handleOfferDeleteCancel = () => {
    setShowOfferDeleteModal(false);
  };

  // Calculate totals
  const calculateTotals = useCallback(() => {
    return editableItems.reduce(
      (totals, item) => {
        return {
          material: totals.material + parseCurrency(item.materialTotal),
          work: totals.work + parseCurrency(item.workTotal),
          total:
            totals.total +
            parseCurrency(item.materialTotal) +
            parseCurrency(item.workTotal),
        };
      },
      { material: 0, work: 0, total: 0 }
    );
  }, [editableItems]);

  const {
    material: materialTotal,
    work: workTotal,
    total: grandTotal,
  } = calculateTotals();

  // Helper functions to extract name and email from title and description
  const extractName = (title?: string | null): string => {
    if (!title) return "";
    // Try to find a name in the title (assuming format like "Ajánlat - John Doe")
    const nameMatch = title.match(/[-:]\s*([^\n,]+)/);
    return nameMatch ? nameMatch[1].trim() : title;
  };

  const extractEmail = (description?: string | null): string => {
    if (!description) return "";
    // Try to find an email in the description
    const emailMatch = description.match(
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/
    );
    return emailMatch ? emailMatch[0] : "";
  };

  // Always use editableItems
  const items = editableItems;

  // Format price with Hungarian locale
  const formatPrice = (price: number | string) => {
    if (typeof price === "string") {
      return price;
    }
    return price.toLocaleString("hu-HU") + " Ft";
  };

  // Format date with Hungarian locale
  const formatDate = (dateString: string | Date | null) => {
    if (!dateString) return "Nincs megadva";
    try {
      const date = new Date(dateString);
      return isNaN(date.getTime())
        ? "Érvénytelen dátum"
        : format(date, "PPP", { locale: hu });
    } catch (e) {
      return `Érvénytelen dátum: ${(e as Error).message}`;
    }
  };

  // Handle status update - toggles between 'work' and 'draft' statuses
  const handleStatusUpdate = async () => {
    try {
      setIsUpdatingStatus(true);
      const newStatus = offer.status === "draft" ? "work" : "draft";
      const result = await updateOfferStatus(offer.id, newStatus);

      if (result.success) {
        toast.success(
          `Az ajánlat sikeresen áthelyezve a ${newStatus === "work" ? "munkálatok" : "piszkozatok"} közé!`
        );

        // Ha munkába állítottuk, indítsuk el az AI feldolgozást
        if (newStatus === "work" && result.workId) {
          console.log("🚀 AI feldolgozás indítása munkába állítás után...");
          // Háttérben futtatjuk, nem várunk rá
          fetch("/api/start-work", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              location: offer.title || "",
              offerDescription: offer.description || "",
              estimatedDuration: "0",
              offerItems: editableItems || [],
            }),
          })
            .then((res) => res.json())
            .then(async (aiResult) => {
              if (aiResult && !aiResult.error) {
                // Frissítjük a work-öt az AI eredménnyel
                const { updateWorkWithAIResult } = await import(
                  "@/actions/work-actions"
                );
                await updateWorkWithAIResult(result.workId!, aiResult);
                console.log("✅ AI feldolgozás sikeres");

                // Frissítjük a processingByAI flag-et false-ra server action-nel
                const { setWorkProcessingFlag } = await import(
                  "@/actions/work-actions"
                );
                await setWorkProcessingFlag(result.workId!, false);
              } else {
                console.error("❌ AI feldolgozási hiba:", aiResult?.error);
                // Hiba esetén is állítsuk false-ra a flag-et
                const { setWorkProcessingFlag } = await import(
                  "@/actions/work-actions"
                );
                await setWorkProcessingFlag(result.workId!, false);
              }
            })
            .catch(async (err) => {
              console.error("❌ AI feldolgozási hiba:", err);
              // Hiba esetén is állítsuk false-ra a flag-et
              try {
                const { setWorkProcessingFlag } = await import(
                  "@/actions/work-actions"
                );
                await setWorkProcessingFlag(result.workId!, false);
              } catch (dbErr) {
                console.error("❌ DB frissítési hiba:", dbErr);
              }
            });
        }

        // Notify parent component about the status change
        if (onStatusChange) {
          onStatusChange(newStatus);
        }
        // Close the dialog after successful update
        setIsStatusDialogOpen(false);
      } else {
        toast.error(result.message || "Hiba történt az állapot frissítésekor");
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Hiba történt az állapot frissítésekor");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Get status display text
  function getStatusDisplay(status: string) {
    const statusMap: Record<string, string> = {
      draft: "Ajánlattevés",
      work: "Munka",
      sent: "Elküldve",
      accepted: "Elfogadva",
      rejected: "Elutasítva",
      expired: "Lejárt",
    };

    return statusMap[status] || status;
  }

  if (showRequirementDetail && offer.requirement) {
    return (
      <RequirementDetail
        requirement={offer.requirement}
        onBack={() => setShowRequirementDetail(false)}
      />
    );
  }

  // Add print styles
  const printStyles = `
    @page {
      size: A4;
      margin: 10mm;
    }
    @media print {
      body * {
        visibility: hidden;
      }
      #printable-area, #printable-area * {
        visibility: visible;
      }
      #printable-area {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        padding: 10mm;
      }
      .no-print {
        display: none !important;
      }
      .print-only {
        display: block !important;
      }
      .print-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 10px;
        margin-bottom: 20px;
      }
      .print-table th, 
      .print-table td {
        border: 1px solid #e2e8f0;
        padding: 3px 5px;
        vertical-align: top;
      }
      .print-table th {
        background-color: #f8fafc;
        font-weight: 600;
        text-align: center;
      }
      .text-right {
        text-align: right !important;
      }
      .text-center {
        text-align: center !important;
      }
      .print-header {
        margin-bottom: 20px;
      }
      .print-title {
        font-size: 18px;
        font-weight: bold;
        margin-bottom: 10px;
      }
      .print-meta {
        font-size: 12px;
        margin-bottom: 15px;
      }
      .print-section {
        margin-bottom: 20px;
      }
      .print-section-title {
        font-size: 14px;
        font-weight: bold;
        margin: 15px 0 10px 0;
        border-bottom: 1px solid #e2e8f0;
        padding-bottom: 5px;
      }
    }
  `;

  // Function to handle print
  // const handlePrint = () => {
  //   const printWindow = window.open("", "", "width=1000,height=800");
  //   if (!printWindow) return;

  //   // Get the HTML for the print view
  //   const printContent = `
  //     <!DOCTYPE html>
  //     <html>
  //     <head>
  //       <title>${offer.title || "Ajánlat"}</title>
  //       <meta charset="utf-8">
  //       <style>${printStyles}</style>
  //     </head>
  //     <body>
  //       <div id="printable-area">
  //         <div class="print-header">
  //           <div class="print-title">${offer.title || "Ajánlat"}</div>
  //           <div class="print-meta">
  //             <div><strong>Státusz:</strong> ${getStatusDisplay(offer.status || "draft")}</div>
  //             <div><strong>Létrehozva:</strong> ${formatDate(offer.createdAt)}</div>
  //             ${offer.validUntil ? `<div><strong>Érvényes:</strong> ${formatDate(offer.validUntil)}</div>` : ""}
  //           </div>
  //         </div>

  //         ${
  //           offer.description
  //             ? `
  //           <div class="print-section">
  //             <div class="print-section-title">Leírás</div>
  //             <div>${offer.description.replace(/\n/g, "<br>")}</div>
  //           </div>
  //         `
  //             : ""
  //         }

  //         ${
  //           items.length > 0
  //             ? `
  //           <div class="print-section">
  //             <div class="print-section-title">Tételek</div>
  //             <table class="print-table">
  //               <thead>
  //                 <tr>
  //                   <th style="width: 5%;">#</th>
  //                   <th style="width: 25%;">Tétel megnevezése</th>
  //                   <th style="width: 8%;">Mennyiség</th>
  //                   <th style="width: 8%;">Egység</th>
  //                   <th style="width: 15%;">Anyag egységár</th>
  //                   <th style="width: 15%;">Díj egységár</th>
  //                   <th style="width: 12%;">Anyag összesen</th>
  //                   <th style="width: 12%;">Díj összesen</th>
  //                 </tr>
  //               </thead>
  //               <tbody>
  //                 ${items
  //                   .map(
  //                     (item, index) => `
  //                   <tr>
  //                     <td class="text-center">${index + 1}.</td>
  //                     <td>${item.name}</td>
  //                     <td class="text-center">${item.quantity}</td>
  //                     <td class="text-center">${item.unit}</td>
  //                     <td class="text-right">${item.materialUnitPrice || "0 Ft"}</td>
  //                     <td class="text-right">${item.unitPrice || "0 Ft"}</td>
  //                     <td class="text-right">${item.materialTotal || "0 Ft"}</td>
  //                     <td class="text-right">${item.workTotal || "0 Ft"}</td>
  //                   </tr>
  //                 `
  //                   )
  //                   .join("")}
  //                 <tr>
  //                   <td colspan="4" class="text-right font-bold">Munkadíj összesen:</td>
  //                   <td colspan="4" class="text-right font-bold">${workTotal.toLocaleString("hu-HU")} Ft</td>
  //                 </tr>
  //                 <tr>
  //                   <td colspan="4" class="text-right font-bold">Anyagköltség összesen:</td>
  //                   <td colspan="4" class="text-right font-bold">${materialTotal.toLocaleString("hu-HU")} Ft</td>
  //                 </tr>
  //                 <tr>
  //                   <td colspan="4" class="text-right font-bold">Összesített nettó költség:</td>
  //                   <td colspan="4" class="text-right font-bold">${grandTotal.toLocaleString("hu-HU")} Ft</td>
  //                 </tr>
  //               </tbody>
  //             </table>
  //           </div>
  //         `
  //             : ""
  //         }

  //         ${
  //           notes.length > 0
  //             ? `
  //           <div class="print-section">
  //             <div class="print-section-title">Megjegyzések</div>
  //             <ul>
  //               ${notes.map((note) => `<li>• ${note}</li>`).join("")}
  //             </ul>
  //           </div>
  //         `
  //             : ""
  //         }
  //       </div>
  //     </body>
  //     </html>
  //   `;

  //   printWindow.document.open();
  //   printWindow.document.write(printContent);
  //   printWindow.document.close();

  //   // Wait for content to load before printing
  //   printWindow.onload = () => {
  //     setTimeout(() => {
  //       printWindow.print();
  //       printWindow.close();
  //     }, 500);
  //   };
  // };

  return (
    <>
      <style>{printStyles}</style>
      <div className="flex flex-col h-full" id="printable-area">
        {/* Edit Item Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-[425px] rounded-2xl flex flex-col max-h-[90vh] mx-auto my-auto w-[calc(100%-3rem)]">
            <DialogHeader>
              <DialogTitle>Tétel szerkesztése</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Megnevezés
                </Label>
                <Input
                  id="name"
                  value={(editingItem?.item.name || "").replace(/^\*+\s*/, "")}
                  onChange={(e) => handleModalChange("name", e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="quantity" className="text-right">
                  Mennyiség
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  value={editingItem?.item.quantity || ""}
                  onChange={(e) =>
                    handleModalChange("quantity", e.target.value)
                  }
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="unit" className="text-right">
                  Egység
                </Label>
                <select
                  id="unit"
                  value={editingItem?.item.unit || ""}
                  onChange={(e) => handleModalChange("unit", e.target.value)}
                  className="col-span-3 px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="">Válassz egységet</option>
                  <option value="m²">m²</option>
                  <option value="m³">m³</option>
                  <option value="fm">fm</option>
                  <option value="db">db</option>
                  <option value="pár">pár</option>
                  <option value="kg">kg</option>
                  <option value="l">l</option>
                  <option value="m">m</option>
                  <option value="cm">cm</option>
                  <option value="csomag">csomag</option>
                  <option value="doboz">doboz</option>
                  <option value="tonna">tonna</option>
                  <option value="óra">óra</option>
                </select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="materialUnitPrice" className="text-right">
                  Anyag egységár
                </Label>
                <div className="col-span-3 flex items-center">
                  <Input
                    id="materialUnitPrice"
                    value={formatNumberWithSpace(
                      editingItem?.item.materialUnitPrice
                    )}
                    onChange={(e) =>
                      handleModalChange(
                        "materialUnitPrice",
                        e.target.value.replace(/\s+/g, "")
                      )
                    }
                    className="text-right"
                  />
                  <span className="ml-2">Ft</span>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="workUnitPrice" className="text-right">
                  Díj egységár
                </Label>
                <div className="col-span-3 flex items-center">
                  <Input
                    id="workUnitPrice"
                    value={formatNumberWithSpace(editingItem?.item.unitPrice)}
                    onChange={(e) =>
                      handleModalChange(
                        "unitPrice",
                        e.target.value.replace(/\s+/g, "")
                      )
                    }
                    className="text-right"
                  />
                  <span className="ml-2">Ft</span>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4 pt-4 border-t">
                <Label className="text-right font-medium">Anyag összesen</Label>
                <div className="col-span-3 font-medium">
                  {formatNumberWithSpace(editingItem?.item.materialTotal)} Ft
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-medium">Díj összesen</Label>
                <div className="col-span-3 font-medium">
                  {formatNumberWithSpace(editingItem?.item.workTotal)} Ft
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4 pt-4 border-t">
                <div className="col-span-4 flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="saveTenantPrice"
                    checked={saveTenantPriceChecked}
                    onChange={(e) =>
                      setSaveTenantPriceChecked(e.target.checked)
                    }
                    className="w-4 h-4 rounded border-gray-300 cursor-pointer accent-green-600"
                  />
                  <Label
                    htmlFor="saveTenantPrice"
                    className="cursor-pointer text-sm"
                  >
                    Mentés vállalkozói tételként
                  </Label>
                </div>
              </div>
              {isSuperUser && (
                <div className="grid grid-cols-4 items-center gap-4 pt-2">
                  <div className="col-span-4 flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="saveGlobalPrice"
                      checked={saveGlobalPriceChecked}
                      onChange={(e) =>
                        setSaveGlobalPriceChecked(e.target.checked)
                      }
                      className="w-4 h-4 rounded border-gray-300 cursor-pointer accent-green-600"
                    />
                    <Label
                      htmlFor="saveGlobalPrice"
                      className="cursor-pointer text-sm"
                    >
                      Mentés globális tételként
                    </Label>
                  </div>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2 mt-6 border-t pt-4">
              <button
                onClick={saveItem}
                disabled={isSaving}
                className="w-full px-4 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-opacity hover:opacity-90"
                style={{
                  backgroundColor: "#FE9C00",
                }}
              >
                {isSaving ? "Mentés..." : "Mentés"}
              </button>
              <button
                onClick={cancelEditing}
                disabled={isSaving}
                className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 border border-gray-300 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Mégse
              </button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Title Edit Modal */}
        {isEditingTitle && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setIsEditingTitle(false)}
          >
            <div
              className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Cím szerkesztése
              </h3>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ajánlat címe:
                  </label>
                  <input
                    type="text"
                    value={titleValue}
                    onChange={(e) => setTitleValue(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FE9C00] focus:border-[#FE9C00]"
                    disabled={isUpdatingTitle}
                    placeholder="Pl. Budapest Sólyom utca 11"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleTitleSave}
                  disabled={isUpdatingTitle}
                  className="w-full px-4 py-2 bg-[#FE9C00] hover:bg-[#FE9C00]/90 text-white rounded-md transition-colors disabled:opacity-50"
                >
                  {isUpdatingTitle ? "Mentés..." : "Mentés"}
                </button>
                <button
                  onClick={handleTitleCancel}
                  disabled={isUpdatingTitle}
                  className="w-full px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50"
                >
                  Mégse
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-6 flex-grow">
          {/* Header with back button */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={onBack}
              className="text-[#FE9C00] hover:text-[#FE9C00]/80 transition-colors"
              aria-label="Vissza"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <Button
              onClick={() => setIsStatusDialogOpen(true)}
              variant="outline"
              style={{
                backgroundColor: "#FEF3E6",
                color: "#FE9C00",
                borderColor: "#FE9C00",
              }}
              className="hover:bg-orange-100"
            >
              {offer.status === "draft"
                ? "Munkába állítás"
                : "Kivétel munkából"}
            </Button>
          </div>

          {/* Offer Header */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-2xl font-bold text-gray-900 flex-1">
                {offer.title || "Ajánlat részletei"}
              </h1>
              <div className="flex items-center gap-2">
                {offer.status === "draft" && (
                  <button
                    onClick={handleTitleEdit}
                    className="p-2 rounded-full hover:bg-orange-50 transition-colors text-[#FE9C00] hover:text-[#e68a00]"
                    title="Cím szerkesztése"
                  >
                    <Pencil className="h-5 w-5" />
                  </button>
                )}
                {offer.status === "draft" && (
                  <button
                    onClick={handleOfferDeleteClick}
                    className="p-2 rounded-full hover:bg-red-50 transition-colors text-red-500 hover:text-red-600"
                    title="Ajánlat törlése"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-2 rounded-full hover:bg-orange-50 transition-colors">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 text-[#FE9C00]"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" />
                        <polyline points="16 6 12 2 8 6" />
                        <line x1="12" y1="2" x2="12" y2="15" />
                      </svg>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-55" align="end">
                    {/* <DropdownMenuItem
                    className="flex items-center cursor-pointer"
                    onSelect={(e: Event) => {
                      e.preventDefault();
                      handlePrint();
                    }}
                  >
                    <Printer className="mr-2 h-4 w-4" />
                    <span>Nyomtatás</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="flex items-center cursor-pointer"
                    onSelect={(e: Event) => {
                      e.preventDefault();
                      navigator.clipboard.writeText(window.location.href);
                      toast.success("Link a vágólapra másolva");
                    }}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    <span>Link másolása</span>
                  </DropdownMenuItem> */}
                    <DropdownMenuSeparator />
                    <div className="px-2 py-1.5">
                      <SocialShareButtonsExcel
                        offer={{
                          title: offer.title,
                          description: offer.description,
                          items: offer.items?.map((item) => ({
                            id: item.id,
                            name: item.name,
                            quantity: item.quantity,
                            unit: item.unit,
                            materialUnitPrice: item.materialUnitPrice,
                            materialTotal: item.materialTotal,
                            workTotal: item.workTotal,
                            // Backward compatibility
                            unitPrice: item.unitPrice,
                            totalPrice: item.workTotal,
                          })),
                          totalPrice: offer.totalPrice,
                          createdAt: offer.createdAt,
                          validUntil: offer.validUntil,
                          status: offer.status,
                          notes: offer.notes,
                        }}
                      />
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="flex flex-col gap-3 mt-4">
              <div
                className="flex items-center text-gray-600 cursor-pointer hover:bg-gray-100 py-1 rounded transition-colors w-fit"
                onClick={() => handleStatusUpdate()}
              >
                <Tag className="h-4 w-4 mr-2 text-gray-400" />
                <span>Státusz: </span>
                <span
                  className={`ml-1 font-medium ${
                    offer.status === "work"
                      ? "text-green-600"
                      : offer.status === "draft"
                        ? "text-blue-600"
                        : "text-gray-700"
                  }`}
                >
                  {getStatusDisplay(offer.status || "draft")}
                </span>
              </div>

              <div className="flex items-center text-gray-600">
                <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                <span>Létrehozva: </span>
                <span className="ml-1 font-medium">
                  {formatDate(offer.createdAt)}
                </span>
              </div>

              <div className="flex items-center text-gray-600">
                <Clock className="h-4 w-4 mr-2 text-gray-400" />
                <span>Érvényes: </span>
                <div className="ml-1 flex items-center gap-2 relative">
                  <span className="font-medium">
                    {offer.validUntil
                      ? formatDate(offer.validUntil)
                      : "Nincs megadva"}
                  </span>
                  <input
                    id="validUntil-date-input"
                    type="date"
                    value={
                      offer.validUntil
                        ? format(new Date(offer.validUntil), "yyyy-MM-dd")
                        : ""
                    }
                    onChange={handleValidUntilChange}
                    disabled={isUpdatingValidUntil}
                    className="absolute left-0 opacity-0 w-px h-px"
                    style={{ zIndex: -1 }}
                  />
                  <button
                    onClick={handleValidUntilEdit}
                    className="text-[#FFB545] hover:text-[#e68a00] transition-colors"
                    title="Érvényességi dátum szerkesztése"
                    disabled={isUpdatingValidUntil}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-orange-50 rounded-lg border border-orange-100">
              <div className="flex items-start">
                <div className="ml-3">
                  <p className="text-sm text-orange-700">
                    <span className="font-medium">Összesen: </span>
                    <span className="font-medium">
                      {formatPrice(calculateTotals().total)}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Description Section */}
          {offer.offerSummary && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900 flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-gray-500" />
                  Összefoglalás
                </h2>
              </div>
              <div className="p-6">
                <p className="text-gray-700 whitespace-pre-line">
                  {offer.offerSummary}
                </p>
              </div>
            </div>
          )}

          {/* Requirements Section */}
          {offer.requirement && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <button
                onClick={() => setShowRequirementDetail(true)}
                className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50 transition-colors"
              >
                <h2 className="text-lg font-medium text-gray-900 flex items-center">
                  <List className="h-5 w-5 mr-2 text-gray-500" />
                  Követelmény
                  <span className="ml-2 bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">
                    {offer?.requirement?.updateCount || "1"}
                  </span>
                </h2>
                <ChevronRight className="h-5 w-5 text-[#FE9C00]" />
              </button>
            </div>
          )}

          {offer.description && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900 flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-gray-500" />
                  További információk
                </h2>
              </div>
              <div className="p-6">
                <p className="text-gray-700 whitespace-pre-line">
                  {offer.description
                    .split("\n")
                    .filter((line) => {
                      const trimmed = line.trim();
                      // Üres sorokat kihagyunk
                      if (!trimmed) return false;
                      // Ha nem csillaggal kezdődik, megtartjuk
                      if (!trimmed.startsWith("*")) return true;
                      // Ha csillaggal kezdődik, csak akkor tartjuk meg, ha kérdőjelet tartalmaz
                      return trimmed.includes("?");
                    })
                    .join("\n")
                    .trim()}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Add bottom padding when questions button is visible */}
        {(() => {
          const questions = extractQuestions(offer.description || "");
          if (!isDialogOpen && questions.length > 0) {
            return <div className="h-4"></div>;
          }
          return null;
        })()}

        <div>
          {/* --- ÚJ LOGIKA: Ha nincs kérdés, plusz gomb és szabad szövegdoboz --- */}
          {(() => {
            const questions = extractQuestions(offer.description || "");
            if (!isDialogOpen && questions.length > 0) {
              return (
                <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 px-4 py-4 z-[9999] shadow-lg">
                  <div className="max-w-7xl mx-auto">
                    <Button
                      onClick={() => {
                        setDemandText(
                          offer.requirement?.description ||
                            offer.description ||
                            ""
                        );
                        setIsDialogOpen(true);
                      }}
                      variant="outline"
                      className="w-full py-6 border-orange-500 text-orange-500 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-600 focus:ring-orange-500 focus:ring-offset-2 focus:ring-2"
                    >
                      <span className="text-lg font-medium">
                        + Kérdések megválaszolása
                      </span>
                    </Button>
                  </div>
                </div>
              );
            }
            return null;
          })()}

          <TextInputDialogQuestions
            open={isDialogOpen}
            setOpen={setIsDialogOpen}
            toolPath="/ai-tools/ai-offer-letter-mobile-redirect"
            questions={extractQuestions(offer.description || "")}
            currentItems={editableItems.map((item) => ({
              name: item.name || "",
              quantity: item.quantity || "1",
              unit: item.unit || "db",
              materialUnitPrice: item.materialUnitPrice || "0 Ft",
              workUnitPrice: item.unitPrice || "0 Ft",
              materialTotal: item.materialTotal || "0 Ft",
              workTotal: item.workTotal || "0 Ft",
            }))}
          />
        </div>

        {/* Custom Confirmation Dialog */}
        <ConfirmationDialog
          isOpen={showDeleteConfirm}
          onClose={() => {
            setShowDeleteConfirm(false);
            setItemToDelete(null);
          }}
          onConfirm={handleRemoveItem}
          title="Tétel törlése"
          description={
            offer.status === "work"
              ? "⚠️ Munkába állítva - Ez az ajánlat már munkába van állítva, ezért nem lehet tételt törölni belőle."
              : "Biztosan törölni szeretnéd ezt a tételt? Ez a művelet nem vonható vissza."
          }
          hideConfirmButton={offer.status === "work"}
        />

        {/* Notes Section */}
        {/* {!offer.description && notes.length > 0 &&  (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900 flex items-center">
                <MessageSquare className="h-5 w-5 mr-2 text-gray-500" />
                Megjegyzések
              </h2>
            </div>
            <div className="p-6">
              <ul className="space-y-4">
                {notes.map((note, index) => (
                  <li key={index} className="flex items-start">
                    <div className="flex-shrink-0 h-5 w-5 text-gray-400">•</div>
                    <p className="ml-2 text-sm text-gray-700">{note}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )} */}

        {/* Items Section - Mobile View */}
        {items.length > 0 && (
          <div className="mt-auto">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mt-6">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  <h2 className="text-lg font-medium text-gray-900 flex items-center">
                    <List className="h-5 w-5 mr-2 text-gray-500" />
                    Tételek
                  </h2>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={handleAddItem}
                    className="inline-flex items-center px-3 py-1 border border-[#FF9900] text-sm leading-4 font-medium rounded-md text-[#FF9900] hover:bg-[#FF9900]/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FF9900]"
                  >
                    <Plus className="h-4 w-4 mr-1" /> Új tétel
                  </button>
                </div>
              </div>

              <div className="divide-y divide-gray-200">
                {items.map((item, index) => (
                  <div
                    key={index}
                    id={`item-${item.id || index}`}
                    className="p-4 hover:bg-gray-50"
                  >
                    {/* Item Header */}
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          <div
                            onClick={() => startEditing(index)}
                            className="cursor-pointer hover:bg-gray-100 p-1 rounded flex items-center gap-2"
                          >
                            <span>
                              {index + 1}. {item.name.replace(/^\*+\s*/, "")}
                              {item.new && (
                                <span
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedCustomItem(item);
                                    setShowCustomItemModal(true);
                                  }}
                                  className="inline-flex items-center justify-center ml-1 flex-shrink-0 font-bold text-white text-xs cursor-pointer hover:opacity-80 transition-opacity"
                                  title="Kattints a globális árlistához való mentéshez"
                                  style={{
                                    width: '12px',
                                    height: '12px',
                                    backgroundColor: '#ef4444',
                                    clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                >
                                  !
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-4">
                        <button
                          onClick={() => startEditing(index)}
                          className="text-[#FF9900] hover:text-[#e68a00] transition-colors"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            showDeleteConfirmation(index);
                          }}
                          className="text-[#FF9900] hover:text-[#e68a00] transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Price Grid */}
                    <div className="mt-3 text-sm">
                      <div className="overflow-x-auto">
                        <table className="min-w-full">
                          <thead>
                            <tr>
                              <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                              <th className="px-2 py-1 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Anyag
                              </th>
                              <th className="px-2 py-1 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Díj
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            <tr>
                              <td className="px-2 py-1 whitespace-nowrap text-sm font-normal text-gray-900">
                                Egységár ({item.unit})
                              </td>
                              <td className="px-2 py-1 whitespace-nowrap text-right">
                                <div
                                  className="cursor-pointer hover:bg-gray-100 p-1 rounded text-right"
                                  onClick={() => startEditing(index)}
                                >
                                  {item.materialUnitPrice
                                    ? formatNumberWithSpace(
                                        item.materialUnitPrice
                                      ) + " Ft"
                                    : "0 Ft"}
                                </div>
                              </td>
                              <td className="px-2 py-1 whitespace-nowrap text-right">
                                <div
                                  className="cursor-pointer hover:bg-gray-100 p-1 rounded text-right"
                                  onClick={() => startEditing(index)}
                                >
                                  {item.unitPrice
                                    ? formatNumberWithSpace(item.unitPrice) +
                                      " Ft"
                                    : "0 Ft"}
                                </div>
                              </td>
                            </tr>
                            <tr>
                              <td className="px-2 py-1 whitespace-nowrap text-sm font-medium text-gray-900">
                                <div className="text-sm text-gray-500 mt-1">
                                  <div
                                    onClick={() => startEditing(index)}
                                    className="cursor-pointer text-gray-900 font-bold hover:bg-gray-100 p-1 rounded"
                                  >
                                    {item.quantity} {item.unit}
                                  </div>
                                </div>
                              </td>
                              <td className="px-2 py-1 whitespace-nowrap font-bold text-right">
                                {item.materialTotal
                                  ? formatNumberWithSpace(item.materialTotal) +
                                    " Ft"
                                  : "0 Ft"}
                              </td>
                              <td className="px-2 py-1 whitespace-nowrap font-bold text-right">
                                {item.workTotal
                                  ? formatNumberWithSpace(item.workTotal) +
                                    " Ft"
                                  : "0 Ft"}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Summary Section */}
                <div className="border-t-2 border-gray-200 bg-gray-50 p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-700">
                        Anyagköltség összesen:
                      </div>
                      <div className="text-sm font-bold text-gray-900">
                        {materialTotal.toLocaleString("hu-HU")} Ft
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-700">
                        Munkadíj összesen:
                      </div>
                      <div className="text-sm font-bold text-gray-900">
                        {workTotal.toLocaleString("hu-HU")} Ft
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex justify-between items-center">
                      <div className="text-sm font-bold text-gray-900">
                        Összesített nettó költség:
                      </div>
                      <div className="text-lg font-bold text-gray-900">
                        {grandTotal.toLocaleString("hu-HU")} Ft
                      </div>
                    </div>
                    {/* Email Sender Section */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mt-4 hidden">
                      <button
                        onClick={() => setIsEmailExpanded(!isEmailExpanded)}
                        className="w-full px-6 py-4 flex justify-between items-center hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center">
                          <Mail className="h-5 w-5 mr-2 text-gray-500" />
                          <span className="font-medium">
                            Ajánlat küldése emailben
                          </span>
                        </div>
                        {isEmailExpanded ? (
                          <ChevronUp className="h-5 w-5 text-gray-500" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-500" />
                        )}
                      </button>

                      {isEmailExpanded && (
                        <div className="px-6 pb-4">
                          <OfferLetterEmailSender
                            items={items.map((item) => ({
                              name: item.name,
                              quantity: item.quantity,
                              unit: item.unit,
                              materialUnitPrice:
                                item.materialUnitPrice || "0 Ft",
                              materialTotal: item.materialTotal || "0 Ft",
                              workUnitPrice: item.unitPrice || "0 Ft",
                              workTotal: item.workTotal || "0 Ft",
                            }))}
                            total={grandTotal.toLocaleString("hu-HU") + " Ft"}
                            title={offer.title || "Ajánlat"}
                            name={extractName(offer.requirement?.title)}
                            email={extractEmail(offer.requirement?.description)}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Share Menu - Same as top */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mt-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">
              Megosztás és export
            </h3>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-[#FE9C00]"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" />
                    <polyline points="16 6 12 2 8 6" />
                    <line x1="12" y1="2" x2="12" y2="15" />
                  </svg>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-55" align="end">
                {/* <DropdownMenuItem
                className="flex items-center cursor-pointer"
                onSelect={(e: Event) => {
                  e.preventDefault();
                  handlePrint();
                }}
              >
                <Printer className="mr-2 h-4 w-4" />
                <span>Nyomtatás</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="flex items-center cursor-pointer"
                onSelect={(e: Event) => {
                  e.preventDefault();
                  navigator.clipboard.writeText(window.location.href);
                  toast.success("Link a vágólapra másolva");
                }}
              >
                <Copy className="mr-2 h-4 w-4" />
                <span>Link másolása</span>
              </DropdownMenuItem> */}
                <DropdownMenuSeparator />
                <div className="px-2 py-1.5">
                  <SocialShareButtonsExcel
                    offer={{
                      title: offer.title,
                      description: offer.description,
                      items: offer.items?.map((item) => ({
                        id: item.id,
                        name: item.name,
                        quantity: item.quantity,
                        unit: item.unit,
                        materialUnitPrice: item.materialUnitPrice,
                        materialTotal: item.materialTotal,
                        workTotal: item.workTotal,
                        // Backward compatibility
                        unitPrice: item.unitPrice,
                        totalPrice: item.workTotal,
                      })),
                      totalPrice: offer.totalPrice,
                      createdAt: offer.createdAt,
                      validUntil: offer.validUntil,
                      status: offer.status,
                      notes: offer.notes,
                    }}
                  />
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Bottom padding to prevent fixed button from covering content */}
        <div className="h-24"></div>
      </div>

      {/* Status Update Dialog */}
      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent className="max-w-sm rounded-lg mx-auto w-[calc(100%-3rem)]">
          <DialogHeader>
            <DialogTitle>
              {offer.status === "draft"
                ? "Munkába állítás"
                : "Kivétel a munkából"}
            </DialogTitle>
            <DialogDescription className="pt-4">
              {offer.status === "draft"
                ? 'Biztosan át szeretnéd állítani az ajánlatot "Munkában" állapotba?'
                : 'Biztosan vissza szeretnéd állítani az ajánlatot "Piszkozat" állapotba?'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col gap-3 pt-6">
            <Button
              onClick={handleStatusUpdate}
              disabled={isUpdatingStatus}
              className={
                offer.status === "draft"
                  ? "bg-[#FE9C00] hover:bg-[#E58A00] w-full"
                  : "bg-blue-600 hover:bg-blue-700 w-full"
              }
            >
              {isUpdatingStatus
                ? "Feldolgozás..."
                : offer.status === "draft"
                  ? "Igen, munkába állítom"
                  : "Igen, piszkozatba teszem"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsStatusDialogOpen(false)}
              disabled={isUpdatingStatus}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 border-0 w-full"
            >
              Mégse
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Item Modal */}
      <AddOfferItemModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleSaveNewItem}
      />

      {/* Custom Item to Global Price List Modal */}
      <Dialog open={showCustomItemModal} onOpenChange={setShowCustomItemModal}>
        <DialogContent className="max-w-sm rounded-lg mx-auto w-[calc(100%-3rem)]">
          <DialogHeader>
            <DialogTitle>Egyedi tétel mentése globális árlistához</DialogTitle>
            <DialogDescription>
              Az alábbi egyedi tétel mentésre kerül a globális árlistához, így később más ajánlatokban is használható lesz.
            </DialogDescription>
          </DialogHeader>

          {selectedCustomItem && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Tétel neve</Label>
                <p className="text-sm text-gray-700 mt-1">{selectedCustomItem.name}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Anyag egységár</Label>
                  <p className="text-sm text-gray-700 mt-1">
                    {formatNumberWithSpace(selectedCustomItem.materialUnitPrice)} Ft
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Munkadíj egységár</Label>
                  <p className="text-sm text-gray-700 mt-1">
                    {formatNumberWithSpace(selectedCustomItem.unitPrice)} Ft
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Egység</Label>
                <p className="text-sm text-gray-700 mt-1">{selectedCustomItem.unit}</p>
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-col gap-3 pt-6">
            <Button
              onClick={handleSaveCustomItemToGlobal}
              disabled={isSavingGlobalPrice}
              className="bg-[#FE9C00] hover:bg-[#E58A00] w-full"
            >
              {isSavingGlobalPrice ? "Mentés..." : "Mentés"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowCustomItemModal(false)}
              disabled={isSavingGlobalPrice}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 border-0 w-full"
            >
              Mégse
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Offer Modal */}
      <DeleteConfirmModal
        isOpen={showOfferDeleteModal}
        onClose={handleOfferDeleteCancel}
        onConfirm={handleOfferDeleteConfirm}
        title="Ajánlat törlése"
        message={`Biztosan törölni szeretnéd a(z) "${offer.title || "Névtelen ajánlat"}" ajánlatot? Ez a művelet nem vonható vissza.`}
        confirmText="Törlés"
        cancelText="Mégse"
        isLoading={isOfferDeleting}
      />
    </>
  );
}
