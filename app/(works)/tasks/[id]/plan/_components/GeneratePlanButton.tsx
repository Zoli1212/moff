"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import DeleteConfirmModal from "@/components/ui/delete-confirm-modal";
import { generateWorkPlan } from "@/actions/work-plan-actions";

interface Props {
  workId: number;
  /** Generated tasks, i.e. exactly what a regeneration would replace. */
  existingAiTaskCount: number;
  onGenerated: (message: string) => void;
}

export default function GeneratePlanButton({
  workId,
  existingAiTaskCount,
  onGenerated,
}: Props) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  const run = () => {
    setConfirming(false);
    startTransition(async () => {
      const result = await generateWorkPlan(workId);

      if (!result.success) {
        toast.error(result.error ?? "Az ütemterv generálása nem sikerült.");
        return;
      }

      if (result.usedFallbackDate) {
        // Worth saying out loud: without a work start date the schedule is anchored to
        // today, which is a guess the user may want to correct.
        toast.warning(
          "A munkának nincs kezdő dátuma, ezért az ütemterv mai naptól indul."
        );
      }

      onGenerated(`Ütemterv elkészült: ${result.createdTasks} feladat.`);
    });
  };

  return (
    <>
      <button
        type="button"
        disabled={isPending}
        onClick={() => (existingAiTaskCount > 0 ? setConfirming(true) : run())}
        className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-[#FE9C00] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#FE9C00]/90 disabled:opacity-60"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        {isPending ? "Generálás…" : "AI ütemterv"}
      </button>

      <DeleteConfirmModal
        isOpen={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={run}
        isLoading={isPending}
        confirmText="Újragenerálás"
        title="Ütemterv újragenerálása"
        message={`${existingAiTaskCount} AI által generált feladat cserélődik le — azok is, amiket közben szerkesztettél. Csak a kézzel felvett saját feladataid maradnak meg.`}
      />
    </>
  );
}
