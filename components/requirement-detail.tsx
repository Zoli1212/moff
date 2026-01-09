"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useDemandStore } from "@/store/offerLetterStore";

type RequirementBlock = {
  id: number;
  requirementId: number;
  blockText: string;
  createdAt: string | Date;
};
import { useRequirementBlockStore } from "@/store/requirementBlockStore";
import { useRequirementIdStore } from "@/store/requirement-id-store";
import { useOfferTitleStore } from "@/store/offer-title-store";
import { useOfferItemCheckStore } from "@/store/offerItemCheckStore";
import { getOfferById } from "@/actions/offer-actions";
import { getRequirementBlocks } from "@/actions/requirement-block-actions";
import { X, Trash2 } from "lucide-react";
import BackButton from "@/app/(works)/others/_components/BackButton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  parseRequirementLines,
  isLineDeletable,
  RequirementLine,
} from "@/lib/requirement-utils";
import {
  SwipeableList,
  SwipeableListItem,
  SwipeAction,
  TrailingActions,
} from "react-swipeable-list";
import "react-swipeable-list/dist/styles.css";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Requirement {
  id: number;
  title: string;
  description: string | null;
  status: string;
}

interface RequirementDetailProps {
  requirement: Requirement;
  onBack: () => void;
  onRequirementUpdated?: (updatedRequirement: {
    id: number;
    description: string;
  }) => void;
  onBlocksLoaded?: (blockIds: number[]) => void;
  onBlockIdsChange?: (blockIds: number[]) => void;
}

export function RequirementDetail({
  requirement,
  onBack,
  onRequirementUpdated,
  onBlockIdsChange,
}: RequirementDetailProps) {
  const searchParams = useSearchParams();
  const { setStoredItems, setDemandText, isGlobalLoading } = useDemandStore();

  const [isProcessing, setIsProcessing] = useState(false);
  const [newText, setNewText] = useState("");
  const [lines, setLines] = useState<RequirementLine[]>([]);
  const [currentDescription, setCurrentDescription] = useState(
    requirement?.description || ""
  );
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [lineToDelete, setLineToDelete] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<RequirementBlock[]>([]);

  console.log(JSON.stringify(requirement), "REQ");

  const { setBlockIds } = useRequirementBlockStore();

  const { setOfferTitle, clearOfferTitle } = useOfferTitleStore();

  // Fetch blocks for this requirement
  useEffect(() => {
    let isMounted = true;

    async function fetchBlocks() {
      try {
        console.log(
          `[RequirementDetail] Fetching blocks for requirement ${requirement.id}...`
        );
        const fetchedBlocks = await getRequirementBlocks(requirement.id);
        console.log(
          `[RequirementDetail] Fetched ${fetchedBlocks?.length || 0} blocks for requirement`,
          requirement.id,
          ":",
          fetchedBlocks
        );

        if (!isMounted) {
          console.log(
            "[RequirementDetail] Component unmounted, skipping state updates"
          );
          return;
        }

        setBlocks(fetchedBlocks);

        // Always update block IDs, even if empty
        const blockIds = fetchedBlocks?.map((block) => block.id) || [];
        console.log(
          `[RequirementDetail] Updating block IDs in store for requirement ${requirement.id}:`,
          blockIds
        );

        // Update the store
        setBlockIds(blockIds);

        // Notify parent component about the loaded blocks if needed
        if (onBlockIdsChange) {
          console.log(
            `[RequirementDetail] Notifying parent of block IDs:`,
            blockIds
          );
          onBlockIdsChange(blockIds);
        }

        // Also log the current store state
        const storeState = useRequirementBlockStore.getState();
        console.log("[RequirementDetail] Current store state:", storeState);
      } catch (e) {
        console.error("[RequirementDetail] Error fetching blocks:", e);
        if (isMounted) {
          setBlockIds([]);
        }
      }
    }

    fetchBlocks();

    // Clean up function
    return () => {
      console.log("[RequirementDetail] Cleaning up block IDs...");
      isMounted = false;
      // We're not clearing block IDs here to ensure they're available during save
    };
  }, [requirement.id, requirement.description, setBlockIds, onBlockIdsChange]); // Added requirement.description to dependencies

  // Fetch offer and its items when component mounts
  useEffect(() => {
    const fetchOffer = async () => {
      const offerId = searchParams.get("offerId");
      if (offerId) {
        try {
          const offer = await getOfferById(parseInt(offerId));
          if (offer) {
            if (offer.title) {
              setOfferTitle(offer.title);
            } else {
              clearOfferTitle();
            }
          }
          if (offer && offer.items) {
            // Transform items to match the TableItem format expected by the store
            const tableItems = offer.items.map(
              (item: {
                name: string;
                quantity: number;
                unit: string;
                unitPrice: number;
                materialUnitPrice: number;
              }) => ({
                name: item.name,
                quantity: item.quantity.toString(),
                unit: item.unit,
                materialUnitPrice: item.materialUnitPrice || "0",
                workUnitPrice: item.unitPrice.toString(), // Default value since it's not in the item
                materialTotal: (
                  item.materialUnitPrice * item.quantity
                ).toString(),
                workTotal: (item.unitPrice * item.quantity).toString(), // Default value since it's not in the item
              })
            );

            console.log("Initial table items set:", tableItems);
            setStoredItems(tableItems);
            // Store offer.items in OfferItemCheckStore
            if (offer.items) {
              useOfferItemCheckStore.getState().setOfferItems(offer.items);
              console.log(
                "[OfferItemCheckStore] offerItems elmentve:",
                useOfferItemCheckStore.getState().offerItems
              );
            }
          }
        } catch (error) {
          clearOfferTitle();
          console.error("Error fetching offer items:", error);
        }
      }
    };

    fetchOffer();
  }, [searchParams, setStoredItems, clearOfferTitle, setOfferTitle]);

  // Parse the description into lines when it changes and check for matching blocks
  useEffect(() => {
    const description = requirement?.description || "";

    console.log("=== DEBUGGING BLOCK MATCHING ===");
    console.log("Blocks from DB:", JSON.stringify(blocks, null, 2));

    // Helper function to normalize text for comparison
    const normalizeText = (text: string) => {
      const normalized = text
        .toLowerCase()
        .replace(/[\s\n]+/g, " ") // Replace all whitespace and newlines with single space
        .replace(/[^\w\sáéíóöőúüű]/g, "") // Remove special characters
        .trim();
      console.log(`Normalized "${text}" to "${normalized}"`);
      return normalized;
    };

    // Normalize all blocks
    const normalizedBlocks = blocks.map((block) => {
      const normalized = {
        ...block,
        normalizedText: normalizeText(block.blockText),
      };
      console.log("Normalized block:", JSON.stringify(normalized, null, 2));
      return normalized;
    });

    // Get all individual lines from all blocks
    const allBlockLines = blocks.flatMap((block) =>
      block.blockText
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((line) => {
          const normalized = normalizeText(line);
          console.log("Block line:", { original: line, normalized });
          return normalized;
        })
    );

    // Create a set of all unique normalized block lines
    const blockLineSet = new Set(allBlockLines);
    console.log("All block lines:", Array.from(blockLineSet));

    // Parse the description into lines
    const parsedLines = parseRequirementLines(description)
      .filter((line) => line.text.trim() !== "")
      .map((line) => {
        const normalizedLine = normalizeText(line.text);

        // Check if this line exactly matches any line from any block
        const exactMatch = blockLineSet.has(normalizedLine);
        const blockMatch = normalizedBlocks.some(
          (block) =>
            block.normalizedText.includes(normalizedLine) ||
            normalizedLine.includes(block.normalizedText)
        );

        const isBlock = exactMatch || blockMatch;

        console.log("Line check:", {
          original: line.text,
          normalized: normalizedLine,
          exactMatch,
          blockMatch,
          isBlock,
        });

        return {
          ...line,
          isBlock,
        };
      });

    console.log("Final parsed lines:", JSON.stringify(parsedLines, null, 2));
    setLines(parsedLines);
  }, [requirement?.description, blocks]);

  // Swipeable list item trailing actions
  const getTrailingActions = useCallback(
    (lineId: string) => (
      <TrailingActions>
        <SwipeAction destructive={true} onClick={() => confirmDelete(lineId)}>
          <div className="flex items-center justify-end h-full px-4 bg-red-500 text-white">
            <Trash2 className="h-5 w-5 mr-2" />
            <span>Törlés</span>
          </div>
        </SwipeAction>
      </TrailingActions>
    ),
    []
  );

  // Handle delete confirmation
  const confirmDelete = (lineId: string) => {
    setLineToDelete(lineId);
    setIsDeleteDialogOpen(true);
  };

  // Handle removing a line
  const handleRemoveLine = async () => {
    if (!lineToDelete) return;

    try {
      setIsProcessing(true);

      // Find the line to remove
      const lineToRemove = lines.find((line) => line.id === lineToDelete);
      if (!lineToRemove) {
        setLineToDelete(null);
        setIsDeleteDialogOpen(false);
        return;
      }

      // Típus a frissítéshez
      type UpdateBody = {
        requirementId: string | number;
        data: {
          description: string;
          updateCount?: { increment: number };
        };
      };

      // Create the updated description by excluding the line to be removed
      const currentDescription = requirement.description || "";
      const allLines = currentDescription.split("\n");
      const updatedLines = allLines.filter(
        (line) => line.trim() !== lineToRemove.text.trim()
      );
      const updatedDescription = updatedLines.join("\n").trim();

      // Update the requirement in the database
      const updateBody: UpdateBody = {
        requirementId: requirement.id,
        data: {
          description: updatedDescription,
        },
      };
      // Csak akkor növeljük az updateCount-ot, ha minden törölhető sor törölve lett
      const updatedLinesParsed = parseRequirementLines(updatedDescription);
      const hasDeletable = updatedLinesParsed.some((line) =>
        isLineDeletable(line)
      );
      if (!hasDeletable) {
        updateBody.data.updateCount = { increment: 1 };
      }
      const response = await fetch("/api/update-requirement", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to update requirement");
      }

      // Update the local state
      const data = await response.json();
      if (data.success) {
        setCurrentDescription(updatedDescription);
        setLines((prevLines) =>
          prevLines.filter((line) => line.id !== lineToDelete)
        );
        setLineToDelete(null);
        setIsDeleteDialogOpen(false);
        setIsLineRemoved(true);
        toast.success("A követelmény sor eltávolítva");
      } else {
        throw new Error(data.error || "Ismeretlen hiba történt");
      }
    } catch (error) {
      console.error("Error removing line:", error);
      toast.error("Hiba történt a sor eltávolítása közben");
    } finally {
      setIsProcessing(false);
      setLineToDelete(null);
      setIsDeleteDialogOpen(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 p-4">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-6">
        <BackButton onClick={onBack} size="lg" />
        <h1 className="text-2xl font-bold text-gray-900">
          {requirement.title}
        </h1>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden flex-1 flex flex-col">
        {/* Description Section */}
        <div className="p-4">
          <div className="bg-white rounded border border-gray-200 overflow-hidden">
            {lines.length > 0 ? (
              <SwipeableList threshold={0.3}>
                {lines.map((line) => (
                  <SwipeableListItem
                    key={line.id}
                    trailingActions={getTrailingActions(line.id)}
                  >
                    <div
                      className={`flex items-center gap-2 px-3 py-0.5 hover:bg-gray-50 transition-colors ${
                        isLineDeletable(line) ? "bg-gray-100 rounded-md" : ""
                      } ${
                        line.isBlock
                          ? "bg-yellow-50 border-l-4 border-yellow-400 pl-2"
                          : ""
                      }`}
                    >
                      <div className="flex-1 min-w-0 py-2">
                        <div className="flex items-center justify-between w-full">
                          <div
                            className={`whitespace-pre-wrap break-words text-sm leading-tight ${
                              line.isSectionHeader ? "font-semibold" : ""
                            } ${line.isBlock ? "text-yellow-800" : "text-gray-800"}`}
                          >
                            {line.text}
                          </div>
                          {isLineDeletable(line) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                confirmDelete(line.id);
                              }}
                              disabled={isProcessing}
                              className="flex-shrink-0 text-gray-400 hover:text-red-500 disabled:opacity-50 transition-colors p-1 -mr-1"
                              title="Sor törlése"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </SwipeableListItem>
                ))}
              </SwipeableList>
            ) : (
              <div className="p-3 text-center">
                <p className="text-gray-400 text-sm italic">
                  Nincs megjeleníthető tartalom
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Blocks Section */}
        {blocks.length > 0 && (
          <div className="p-4 border-t border-gray-200">
            <h3 className="text-md font-medium text-gray-900 mb-3">
              Kiegészítések
            </h3>
            <div className="space-y-2">
              {blocks
                // Only show blocks that exactly match a line in the requirement description
                .filter((block) => {
                  if (!requirement.description) return false;

                  // Get all non-empty lines from the description
                  const descriptionLines = requirement.description
                    .split("\n")
                    .map((line) => line.trim())
                    .filter((line) => line.length > 0);

                  // Check if any line in the description exactly matches the block text
                  return descriptionLines.some((line) => {
                    // Compare after normalizing whitespace and trimming
                    const normalizedLine = line.trim().replace(/\s+/g, " ");
                    const normalizedBlock = block.blockText
                      .trim()
                      .replace(/\s+/g, " ");
                    return normalizedLine === normalizedBlock;
                  });
                })
                .map((block) => (
                  <div
                    key={block.id}
                    className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded-r"
                  >
                    <p className="text-sm text-yellow-800">{block.blockText}</p>
                    <p className="text-xs text-yellow-600 mt-1">
                      Létrehozva:{" "}
                      {new Date(block.createdAt).toLocaleString("hu-HU")}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="p-4 bg-gray-50 border-t border-gray-100">
          <div className="flex flex-col gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onBack();
              }}
              disabled={isSubmitting || isGlobalLoading}
              className="w-full h-12 bg-gray-100 hover:bg-gray-200"
            >
              Mégse
            </Button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Megerősítés szükséges</DialogTitle>
            <DialogDescription>
              Biztosan eltávolítod ezt a sort? A művelet nem vonható vissza.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isProcessing}
            >
              Mégse
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveLine}
              disabled={isProcessing}
            >
              {isProcessing ? "Feldolgozás..." : "Eltávolítás"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* OFFER ITEMS DEBUG KIÍRÁS */}
      {/* <div style={{ background: '#f5f5f5', padding: '8px', marginTop: 16, border: '1px solid #ccc', borderRadius: 4 }}>
        <strong>OfferItemCheckStore offerItems:</strong>
        <pre style={{ fontSize: 12, margin: 0 }}>{JSON.stringify(offerItems, null, 2)}</pre>
      </div> */}
      {/* /OFFER ITEMS DEBUG KIÍRÁS */}
    </div>
  );
}
